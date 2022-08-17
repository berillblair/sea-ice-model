/* tslint:disable */
/* eslint-disable */
/**
* @param {number} width
* @param {number} height
*/
export function make_game(width: number, height: number): void;
/**
*/
export function tick_game(): void;
/**
* @returns {any}
*/
export function get_ship_states(): any;
/**
* @returns {any}
*/
export function get_routes(): any;
/**
* @param {number} x
* @param {number} y
* @param {number} quality_threshold
* @param {boolean} early_adopter
* @param {string} adoption_status
* @param {number} utility_threshold
* @param {number} experience_level
* @param {number} certainty
* @param {number} reliance_on_product
* @param {number} weight_of_social_influence
* @param {number} provider_trust
* @param {number} offset_x
* @param {number} offset_y
* @param {number} months_until_adopt
* @returns {number}
*/
export function add_ship(x: number, y: number, quality_threshold: number, early_adopter: boolean, adoption_status: string, utility_threshold: number, experience_level: number, certainty: number, reliance_on_product: number, weight_of_social_influence: number, provider_trust: number, offset_x: number, offset_y: number, months_until_adopt: number): number;
/**
*/
export function clear_ships(): void;
/**
* @param {number} ship
* @param {any} task_js
*/
export function add_ship_task(ship: number, task_js: any): void;
/**
* @param {number} ship
* @param {boolean} adopter
*/
export function set_early_adopter(ship: number, adopter: boolean): void;
/**
* @param {number} year
*/
export function update_year(year: number): void;
/**
* @param {number} ship
* @param {string} status
*/
export function update_ship_adoption_status(ship: number, status: string): void;
/**
* @param {number} ship
* @param {number} boost
*/
export function update_ship_reliance_boost(ship: number, boost: number): void;
/**
* @param {number} ship
* @param {number} months_left
*/
export function update_ship_trial_countdown(ship: number, months_left: number): void;
/**
* @param {number} ship
* @param {number} certainty
*/
export function update_ship_certainty(ship: number, certainty: number): void;
/**
* @param {number} ship
* @param {number} reliance_on_informational_environment
*/
export function update_reliance_on_informational_environment(ship: number, reliance_on_informational_environment: number): void;
/**
* @param {number} ship
* @param {number} utility_threshold
*/
export function update_ship_utility_threshold(ship: number, utility_threshold: number): void;
/**
* @param {number} ship
* @param {number} experience_level
*/
export function update_ship_experience_level(ship: number, experience_level: number): void;
/**
* @param {Uint8Array} grid
*/
export function upload_grid(grid: Uint8Array): void;
