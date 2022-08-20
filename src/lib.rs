#![feature(core_panic)]

use wasm_bindgen::prelude::*;
use web_sys::console;
use std::panic;

/*
    This section is just importing libraries and setting up memory allocation
 */
// #[cfg(feature = "wee_alloc")]
// #[global_allocator]
// static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

use serde::{Serialize, Deserialize};

use wasm_bindgen::prelude::*;
use crate::ship::{Ship, AdoptionStatus, TrialPeriodLength};
use wasm_bindgen::__rt::core::mem::{MaybeUninit, swap};
use wasm_bindgen::convert::IntoWasmAbi;
use wasm_bindgen::__rt::core::cell::RefCell;
use wasm_bindgen::__rt::core::panicking::panic;
use wasm_bindgen::__rt::std::cmp::min;
use wasm_bindgen::__rt::std::collections::HashMap;
use wasm_bindgen::__rt::core::ops::Add;
use std::ops::Deref;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/*
    Short introduction to WebAssembly (abbreviated as WASM)
    WebAssembly is a web standard for a format of code which can be compiled into a stream
    of instructions that map closely to the machine code that processors execute, but it is not
    specific to any type of processor, allowing the web browser to convert the WebAssembly into a
    native machine code format, allowing for major speedups for web applications that require
    high-performance computations.

    This code is written in Rust, which is then compiled to WebAssembly and then called on by
    JavaScript in the web browser. This is specifically for heavy-lifting code, otherwise general
    logic is just done in JavaScript as DOM interaction isn't amazingly elegant from within
    WebAssembly (yet) and still requires a lot of JavaScript boilerplate, so the goal of this code
    is to be relatively self-containing
 */


/*
    Static variable containing the state
 */
static mut GAME_STATE: MaybeUninit<GameState> = MaybeUninit::uninit();

static mut ROUTE_CACHE: MaybeUninit<HashMap<(Position, Position), (Vec<Position>, RefCell<RouteStatistics>)>> = MaybeUninit::uninit();

#[derive(Serialize, Clone)]
struct RouteHit {
    year: u16,
    experience: f32,
    certainty: f32
}

#[derive(Serialize, Clone)]
struct RouteStatistics {
    hits: Vec<RouteHit>
}

//A usize is just a special (positive) number which can be 32-bit or 64-bit, depending on the compilation target.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Position (usize, usize);

impl Position {

    //Returns all the valid neighboring tiles
    fn get_neighbours(&self, grid: &Grid) -> Vec<Position> {
        let mut successors = Vec::with_capacity(4);

        match grid.get_cell(Position(self.0+1, self.1)) {
            None => {}
            Some(cell) => match cell {
                Cell::Sea(_) => successors.push(Position(self.0+1, self.1)),
                _ => {}
            }
        }

        if self.0 > 0 {
            match grid.get_cell(Position(self.0 - 1, self.1)) {
                None => {}
                Some(cell) => match cell {
                    Cell::Sea(_) => successors.push(Position(self.0 - 1, self.1)),
                    _ => {}
                }
            }
        }

        if self.1 > 0 {
            match grid.get_cell(Position(self.0, self.1 - 1)) {
                None => {}
                Some(cell) => match cell {
                    Cell::Sea(_) => successors.push(Position(self.0, self.1 - 1)),
                    _ => {}
                }
            }
        }

        if self.1 < grid.height - 1 {
            match grid.get_cell(Position(self.0, self.1 + 1)) {
                None => {}
                Some(cell) => match cell {
                    Cell::Sea(_) => successors.push(Position(self.0, self.1 + 1)),
                    _ => {}
                }
            }
        }

        successors
    }

}

pub mod ship { //A grouping of data structures pertaining to how ships work

    type ShipId = usize;

    use crate::{Position, Grid, Cell, GameState, log, ROUTE_CACHE, RouteStatistics, RouteHit};
    use wasm_bindgen::__rt::std::rc::Rc;
    use wasm_bindgen::__rt::std::sync::RwLock;
    use wasm_bindgen::prelude::*;
    use pathfinding::directed::astar::astar;
    use pathfinding::utils::absdiff;
    use serde::{Serialize, Deserialize};
    use wasm_bindgen::__rt::core::ops::{Add, AddAssign};
    use wasm_bindgen::__rt::core::cell::RefCell;

    #[derive(Debug, Serialize, Deserialize)]
    #[serde(tag = "task", content = "data")]
    //A choice of tasks for the ship
    pub enum Task {
        GoToIce(Position), //Have the ship generate a path to ice
        AvoidShips(Vec<ShipId>),
        ReturnToBase(Position), //Find the shortest path to our base
        GoTo(Position), //Find a path to somewhere else, preferring to go over tiles near ice
        FollowPath, //Follow the generated path, whatever that may be.
        SetPosition(Position)
    }

    #[derive(Debug, Serialize, Deserialize)]
    #[serde(tag = "status")]
    pub enum AdoptionStatus {
        NonUser,
        InTrial,
        Adopted
    }

    impl AdoptionStatus {
        pub fn from_str(str: &str) -> Self {
            match str {
                "NonUser" => Self::NonUser,
                "InTrial" => Self::InTrial,
                "Adopted" => Self::Adopted,
                _ => panic!("Invalid adoption status")
            }
        }
    }

    #[derive(Debug, Serialize, Deserialize)]
    #[serde(tag = "trial")]
    pub enum TrialPeriodLength {
        HalfSeason,
        FullSeason
    }

    #[derive(Debug, Serialize)]
    pub struct Ship {
        pub id: ShipId, //Just a number so that the ship knows which one it is
        pub tasks: Vec<Task>, //List of it's tasks
        pub pos: Position, //Where it is
        pub last_pos: Position, //Where it was, for animation purposes
        pub path: Vec<Position>, //The positions of where we need to go (generated with pathfinding)
        pub path_progress: usize, //How far along we are in our path
        pub astar_metric: usize,

        pub quality_threshold: f32,
        pub early_adopter: bool,
        pub adoption_status: AdoptionStatus,
        pub experience_level: f32,
        pub certainty: f32,
        pub reliance_on_informational_environment: f32,
        pub reliance_boost: f32,

        pub weight_of_social_influence: f32,
        pub utility_threshold: f32,
        pub trial_period_length: TrialPeriodLength,
        pub months_until_adopt: usize,
        pub offset_x: usize,
        pub offset_y: usize
    }

    impl Ship {

        //Execute one step of ship behaviour. `&mut self` means a mutable (modifiable) reference to some Ship's data,
        //and &GameState is an immutable reference to the GameState
        pub fn tick(&mut self, game_state: &GameState) {

            // log("bruh");

            if self.tasks.len() == 0 {
                return;
            }

            let task = self.tasks.pop().unwrap(); //Get the most recently added task

            match &task { //Which task does the ship AI need to perform
                Task::GoTo(destination) => {

                    // Astar is the pathfinding algorithm. We provide it with some functions that provide metrics in order to figure out a path

                    let route_cache = unsafe { ROUTE_CACHE.assume_init_mut() };

                    let key = (
                        self.pos.clone(),
                        *destination
                    );

                    if route_cache.contains_key(&key) {

                        let (path, number) = route_cache.get(&key).unwrap();
                        self.path = path.clone();
                        let mut statistics = number.borrow_mut();
                        statistics.hits.push(RouteHit {
                            year: game_state.year,
                            experience: self.experience_level,
                            certainty: self.certainty
                        });
                    } else {
                        let path = astar(&self.pos,|position| {

                            //This chunk of code gets the neighbouring sea tiles, iterates over them,
                            //and bundles that tiles position with the cost of moving over that tile,
                            //which is lower for sea tiles near ice
                            position.get_neighbours(&game_state.grid).into_iter().map(|neighbour| {
                                let cell = game_state.grid.get_cell(neighbour).unwrap();
                                (neighbour, match cell {
                                    Cell::Sea(iciness) => 10 - iciness as usize,
                                    _ => 1000
                                })
                            }).collect::<Vec<_>>()

                        }, |heur_cell| {

                            //Approximate the distance to go to our destination from a cell
                            absdiff(heur_cell.0, destination.0).pow(2) + absdiff(heur_cell.1, destination.1).pow(2)

                        }, |success_cell| {
                            //How the pathfinding algorithm knows we've reached our destination
                            success_cell == destination
                        }).unwrap();

                        route_cache.insert(key, (path.0, RefCell::new(RouteStatistics {
                            hits: Vec::new()
                        })));

                        self.path = route_cache.get(&key).unwrap().0.clone();
                    }

                    self.tasks.push(Task::FollowPath);

                    // let path = unsafe { game_state.path_cache.assume_init_ref() }.find_path(
                    //     (self.pos.0, self.pos.1),
                    //     (destination.0, destination.1),
                    //     |(x, y)| {
                    //         let cell = game_state.grid.get_cell(Position(x, y)).unwrap();
                    //         match cell {
                    //             Cell::Sea(iciness) => 10 - iciness as isize,
                    //             Cell::Land => -1,
                    //             Cell::Ice => -1
                    //         }
                    //     }
                    // );
                    //
                    // match path {
                    //     None => {}
                    //     Some(path) => self.path = path.map(|(x, y)| Position(x, y)).collect()
                    //     // Some(path) => self.path = path.safe_next()
                    // }
                }
                Task::AvoidShips(_) => {}
                Task::ReturnToBase(_) => {}
                Task::GoToIce(_) => {}
                Task::FollowPath => {
                    if self.path_progress < self.path.len() { //If our progress along the progress line
                        //is still within the length of the array of positions

                        self.pos = self.path.get(self.path.len()-1).unwrap().clone(); //Move our position to the next part of the path
                        // self.path_progress = ; //Increase our progress
                        // self.tasks.push(task);
                    } else {
                        self.path_progress = 0;
                    }
                }
                Task::SetPosition(pos) => {
                    self.pos = *pos;
                    self.path = vec![Position(0, 0)];
                }
            }


        }

    }

}

#[derive(Debug, Clone, Serialize)]
#[repr(u8)]
//1 grid "tile" in the map.
pub enum Cell {
    Sea(u8), //The u8 means a 1-byte integer, I'm using it to represent how close it is to ice
    Land,
    Ice //Not used anymore
}

//Grid that contains an array of Cells
pub struct Grid {
    pub width: usize,
    pub height: usize,
    pub cells: Vec<Cell>
}

impl Grid {
    pub fn get_cell(&self, pos: Position) -> Option<Cell> {
        // if pos.0 >= self.width { return Option::None; }
        // if pos.0 < 0 { return Option::None; }
        // if pos.1 >= self.height { return Option::None; }
        // if pos.1 < 0 { return Option::None; }

        self.cells.get(pos.0 + (pos.1 * self.width)).cloned()
    }
}

//Data type that contains info about the game
pub struct GameState {
    pub year: u16,
    pub ice_percentage: f32, //0.0 - 1.0, 0% being the minimum ice and 100% being as much as possible
    //Array of ships
    pub ships: Vec<RefCell<Ship>>,
    //Grid of Cells
    pub grid: Grid,
}

impl GameState {

    //Initialize new GameState
    fn new(width: usize, height: usize) -> Self {

        Self {
            year: 2024,
            ice_percentage: 0.0, //How far the ice has spread
            ships: vec![], //Empty array of our ships
            grid: Grid {
                width,
                height,
                cells: Vec::with_capacity(width * height) //Create an array with the exact size necessary, to save allocation time
            }
        }
    }

    //Make the ships do their tasks
    fn tick(&self) {
        &self.ships.iter().for_each(|ship| {
            let mut ship = ship.borrow_mut();
            ship.tick(&self);
        });
    }

}

/*

Anything with #[wasm_bindgen] is telling the compiler to expose this method to JavaScript while
packaging

 */

#[wasm_bindgen]
pub fn make_game(width: usize, height: usize) {
    panic::set_hook(Box::new(console_error_panic_hook::hook));
    let game = GameState::new(width, height);
    unsafe {
        ROUTE_CACHE = MaybeUninit::new(HashMap::new());
        GAME_STATE = MaybeUninit::new(game);
    }
}

#[wasm_bindgen]
pub fn tick_game() {
    unsafe {
        GAME_STATE.assume_init_mut().tick();
    }
}

#[wasm_bindgen]
pub fn get_ship_states() -> JsValue {
    let ships = unsafe {
        &(GAME_STATE.assume_init_ref()).ships
    };
    JsValue::from_serde(ships).unwrap()
}

#[wasm_bindgen]
pub fn get_routes() -> JsValue {
    let routes_unsafe = unsafe {
        ROUTE_CACHE.assume_init_ref()
    };

    let routes: Vec<(&Vec<(Position)>, RouteStatistics)> = routes_unsafe.iter().map(|(k,v)| {
        // (k.0, k.1, v.1.borrow().add(0))
        (&v.0, v.1.borrow().clone())
    }).collect();

    JsValue::from_serde(&routes).unwrap()
}

#[wasm_bindgen]
pub fn add_ship(x: usize, y: usize, quality_threshold: f32, early_adopter: bool, adoption_status: &str, utility_threshold: f32, experience_level: f32, certainty: f32, reliance_on_product: f32, weight_of_social_influence: f32, provider_trust: f32, offset_x: usize, offset_y: usize, months_until_adopt: usize) -> usize {
    let mut ships = unsafe {
        &mut (GAME_STATE.assume_init_mut()).ships
    };
    ships.push(RefCell::new(Ship {
        id: 0,
        tasks: vec![],
        pos: Position(x, y),
        last_pos: Position(x, y),
        path: vec![Position(0, 0)],
        path_progress: 0,
        astar_metric: 0,

        quality_threshold,
        early_adopter,
        adoption_status: AdoptionStatus::from_str(adoption_status),
        utility_threshold,
        experience_level,
        certainty,
        reliance_on_informational_environment: reliance_on_product,
        reliance_boost: 0.0,
        weight_of_social_influence,
        trial_period_length: if provider_trust >= 0.75 { TrialPeriodLength::HalfSeason } else { TrialPeriodLength::FullSeason },
        offset_x,
        offset_y,
        months_until_adopt
    }));
    let id = ships.len()-1;

    ships.get(id).unwrap().borrow_mut().id = id;

    id
}

#[wasm_bindgen]
pub fn clear_ships() {
    let mut ships = unsafe {
        &mut (GAME_STATE.assume_init_mut()).ships
    };

    ships.clear();
}

#[wasm_bindgen]
pub fn add_ship_task(ship: usize, task_js: JsValue) {
    let task: ship::Task = task_js.into_serde().unwrap();
    let mut ships = unsafe {
        &mut (GAME_STATE.assume_init_mut()).ships
    };
    ships.get(ship).unwrap().borrow_mut().tasks.push(task);
}

#[wasm_bindgen]
pub fn set_early_adopter(ship: usize, adopter: bool) {
    let mut ships = unsafe {
        &mut (GAME_STATE.assume_init_mut()).ships
    };
    ships.get(ship).unwrap().borrow_mut().early_adopter = adopter;
}

#[wasm_bindgen]
pub fn update_year(year: u16) {
    let state = unsafe {
        GAME_STATE.assume_init_mut()
    };

    state.year = year;
}

#[wasm_bindgen]
pub fn update_ship_adoption_status(ship: usize, status: &str) {
    let status: AdoptionStatus = AdoptionStatus::from_str(status);
    let mut ships = unsafe {
        &mut (GAME_STATE.assume_init_mut()).ships
    };
    let mut ship = ships.get(ship).unwrap().borrow_mut();

    match &status {
        AdoptionStatus::Adopted => {
            ship.certainty += 0.15;
            if ship.certainty > 1.0 {
                ship.certainty = 1.0;
            }
        },
        _ => {}
    }

    ship.adoption_status = status;
}

#[wasm_bindgen]
pub fn update_ship_reliance_boost(ship: usize, boost: f32) {
    let mut ships = unsafe {
        &mut (GAME_STATE.assume_init_mut()).ships
    };
    let mut ship = ships.get(ship).unwrap().borrow_mut();

    ship.reliance_boost = boost;
}

#[wasm_bindgen]
pub fn update_ship_trial_countdown(ship: usize, months_left: usize) {
    let mut ships = unsafe {
        &mut (GAME_STATE.assume_init_mut()).ships
    };
    let mut ship = ships.get(ship).unwrap().borrow_mut();
    ship.months_until_adopt = months_left;
}

#[wasm_bindgen]
pub fn update_ship_certainty(ship: usize, certainty: f32) {
    let mut ships = unsafe {
        &mut (GAME_STATE.assume_init_mut()).ships
    };

    let mut ship = ships.get(ship).unwrap().borrow_mut();
    ship.certainty = certainty;
}

#[wasm_bindgen]
pub fn update_reliance_on_informational_environment(ship: usize, reliance_on_informational_environment: f32) {
    let mut ships = unsafe {
        &mut (GAME_STATE.assume_init_mut()).ships
    };

    let mut ship = ships.get(ship).unwrap().borrow_mut();
    ship.reliance_on_informational_environment = reliance_on_informational_environment;
}

#[wasm_bindgen]
pub fn update_ship_utility_threshold(ship: usize, utility_threshold: f32) {
    let mut ships = unsafe {
        &mut (GAME_STATE.assume_init_mut()).ships
    };

    let mut ship = ships.get(ship).unwrap().borrow_mut();
    ship.utility_threshold = utility_threshold;
}

#[wasm_bindgen]
pub fn update_ship_experience_level(ship: usize, experience_level: f32) {
    let mut ships = unsafe {
        &mut (GAME_STATE.assume_init_mut()).ships
    };
    let mut ship = ships.get(ship).unwrap().borrow_mut();
    ship.experience_level = experience_level as f32;
}

#[wasm_bindgen]
//Get the cell grid data from JavaScript and convert it into the Cell data structure
pub fn upload_grid(grid: &[u8]) {
    let cells: Vec<Cell> = grid.iter().map(|n| {
        match n {
            0 => Cell::Land,
            1 => Cell::Ice,
            _ => Cell::Sea(n - 2)
        }
    }).collect();

    let mut game_state = unsafe { GAME_STATE.assume_init_mut() };

    assert_eq!(grid.len(), game_state.grid.width * game_state.grid.height);

    game_state.grid.cells = cells;

    let width = game_state.grid.width;
    let height = game_state.grid.height;

    // game_state.path_cache = MaybeUninit::new(PathCache::new((width, height), move |pos| unsafe {
    //     // log(&format!("{} {}", pos.0, pos.1));
    //     // 1
    //     // let cell = GAME_STATE.assume_init_ref().grid.get_cell(Position(width, height));
    //     // match cell {
    //     //     None => {  2 },
    //     //     Some(cell) => match cell {
    //     //         Cell::Sea(iciness) => 1,
    //     //         Cell::Land => -1,
    //     //         Cell::Ice => -1
    //     //     }
    //     // }
    //     1
    // }, ManhattanNeighborhood::new(width, height), PathCacheConfig {
    //     chunk_size: 100,
    //     cache_paths: true,
    //     a_star_fallback: true,
    //     perfect_paths: false
    // }));
}