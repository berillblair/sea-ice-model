let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let pathCanvas = document.createElement("canvas");

pathCanvas.width = canvas.width;
pathCanvas.height = canvas.height;

canvas.width = 1326/2;
canvas.height = 1034/2;

let tempCanvas = document.createElement("canvas");
let tempCtx = tempCanvas.getContext("2d");

let minGraphYear = 2034;
let maxGraphYear = 2035;

let pathCtx = pathCanvas.getContext("2d");

const poi = [
    [234,491],
    [184,304],
    [127,263],
    [232,303],
    [217,262],
    [262,287],
    [305,262],
    [255,222],
    [153,230],
    [310,189],
    [388,501],
    [360,255],
    [503,287],
    [431,392],
    [646,262],
    [350,137],
    [291,313],
    [388,47],
    [342,65],
    [274,80],
    [212,88],
    [132,146]
].map(a=>[Math.floor(a[0]/2),Math.floor(a[1]/2)]); //points of interest relative to the map. Scaled for pathfinding performance reasons

function getSvalbardBackground(name) {

    let img = new Image;
    img.src = name;

    return new Promise((res,rej)=>{
        img.onload = function() {
            tempCanvas.width = this.width;
            tempCanvas.height = this.height;

            tempCtx.drawImage(this, 0, 0);
            res({img, rgb: tempCtx.getImageData(0, 0, this.width, this.height).data});
        };
    });
}

function render(background, ships, routes) {
    ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);

    ctx.drawImage(background, 0, 0);
    // ctx.putImageData(bg, 0, 0);

    pathCtx.clearRect(0, 0, pathCtx.canvas.width, pathCtx.canvas.height);

    routes.forEach(route=>{
        pathCtx.beginPath();

        // let beginPos = [route[0][0] * 4, route[0][1] * 4];
        // let endPos = [route[1][0] * 4, route[1][1] * 4];

        let hits = route[1].hits.filter(hit=>hit.year >= minGraphYear && hit.year <= maxGraphYear).length;

        if(hits == 0) return;

        pathCtx.moveTo(route[0][0][0]*4, route[0][0][1]*4);

        for(let i=1;i<route[0].length;i++) {
            pathCtx.lineTo(route[0][i][0]*4, route[0][i][1]*4);
        }

        pathCtx.lineWidth = (Math.log(route[1] + 1) * 0.4);
        pathCtx.strokeStyle = `rgba(${Math.log(hits)*30}, ${Math.log(hits)*2}, 0.2, ${50/Math.log(hits)})`;
        pathCtx.stroke();
        pathCtx.beginPath();

        // ctx.fillStyle = ship.adoption_status.status === "Adopted" ? "#0f0" : ship.early_adopter ? "#d5550c" : "#000";
        // ctx.fillRect(ship.pos[0]*4 - 5 + ship.offset_x, ship.pos[1]*4 - 5 + ship.offset_y, 10, 10);
    });

    ctx.drawImage(pathCanvas, 0, 0);

}

function gaussian(mean, stdev) {
    let y2;
    let use_last = false;
    return function() {
        let y1;
        if (use_last) {
            y1 = y2;
            use_last = false;
        } else {
            let x1, x2, w;
            do {
                x1 = 2.0 * Math.random() - 1.0;
                x2 = 2.0 * Math.random() - 1.0;
                w = x1 * x1 + x2 * x2;
            } while (w >= 1.0);
            w = Math.sqrt((-2.0 * Math.log(w)) / w);
            y1 = x1 * w;
            y2 = x2 * w;
            use_last = true;
        }

        let retval = mean + stdev * y1;
        if (retval > 0)
            return retval;
        return -retval;
    }
}

let gauss51mean = gaussian(0.51, 0.2);
let gauss6mean = gaussian(0.6, 0.2);

let backgrounds = ["2228AprilMay", "2228AugOct", "2228JuneJuly", "2835AprilMay", "2835AugOct", "2835JuneJuly"];

let months = ["April", "May", "June", "July", "August", "September", "October"];

(async ()=>{

    let module = await import("../pkg/");

    let maps = {};

    let GRID_WIDTH;
    let GRID_HEIGHT;

    let product_release_year = parseInt(document.getElementById("release-year").value);

    let product_quality = parseFloat(document.getElementById("product-quality").value);

    let forecast_reliability = parseInt(document.getElementById("forecast-reliability").value)/10;
    let provider_trust = parseInt(document.getElementById("provider-trust").value)/10;

    let proportion_highly_experienced = parseFloat(document.getElementById("prop-he").value);
    let proportion_early_adopters = parseFloat(document.getElementById("prop-ea").value);

    let should_inc_product_utility = false;

    let month = 11;
    let year = 2021;

    // setInterval(()=>console.log(module.get_routes()), 1000);

    let monitor_charts = {
        average_certainty: new Chart(
            document.getElementById("certainty-graph"),
            {
                type: "line",
                data: {
                    labels: [],

                    datasets: [{
                        label: "Average Certainty",
                        data: [],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                    }]
                },
                options: {
                    responsive: false,
                    scales: {
                        y: {
                            min: 0,
                            max: 1.0
                        }
                    }
                }
            }
        ),
        ship_count: new Chart(
            document.getElementById("ship-count"),
            {
                type: "line",
                data: {
                    labels: [],

                    datasets: [{
                        label: "# of Ships",
                        data: [],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                    }]
                },
                options: {
                    responsive: false
                }
            }
        ),
        adopters: new Chart(
            document.getElementById("adopters"),
            {
                type: "line",
                data: {
                    labels: [],

                    datasets: [{
                        label: "% Adopters",
                        data: [],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                    }, {
                        label: "% Trialers",
                        data: [],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                    }, {
                        label: "% Non-Users",
                        data: [],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                    }]
                },
                options: {
                    responsive: false
                }
            }
        ),
        utility_threshold: new Chart(
            //its actually only the utility but im too lazy to refactor it atm
            document.getElementById("utility-threshold"),
            {
                type: "line",
                data: {
                    labels: [],

                    datasets: [{
                        label: "Average Utility",
                        data: [],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                    }]
                },
                options: {
                    responsive: false,
                    scales: {
                        y: {
                            min: 0,
                            max: 1.0
                        }
                    }
                }
            }
        ),
        reliance_on_forecast: new Chart(
            document.getElementById("forecast-reliance"),
            {
                type: "line",
                data: {
                    labels: [],

                    datasets: [{
                        label: "Average reliance on forecast",
                        data: [],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)',
                            'rgba(54, 162, 235, 0.2)',
                            'rgba(255, 206, 86, 0.2)',
                            'rgba(75, 192, 192, 0.2)',
                            'rgba(153, 102, 255, 0.2)',
                            'rgba(255, 159, 64, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(54, 162, 235, 1)',
                            'rgba(255, 206, 86, 1)',
                            'rgba(75, 192, 192, 1)',
                            'rgba(153, 102, 255, 1)',
                            'rgba(255, 159, 64, 1)'
                        ],
                    }]
                },
                options: {
                    responsive: false,
                    scales: {
                        y: {
                            min: 0,
                            max: 1.0
                        }
                    }
                }
            }
        )
    };

    function addGotoTask(ship_id, poi_indices) {
        if(poi_indices[poi_indices.length-1] !== 1) {
            module.add_ship_task(ship_id, {
                task: "SetPosition",
                data: poi[0]
            })
        }

        poi_indices.reverse().forEach(index=>{
            module.add_ship_task(ship_id, {
                task: "GoTo",
                data: poi[index-1]
            })
        });
    }

    function getIteratorTaskGenerator() {
        switch(year) {
            case 2022:
            case 2023:
            case 2024:
            case 2025:
            case 2026:
            case 2027:
            case 2028:
                switch(month) {
                    case 4: return (ship, ship_id, num_ships, certainty_pos)=>{
                        if(certainty_pos >= num_ships/2 && ship.experience_level >= 0.6) { //
                            addGotoTask(ship_id, [1, 2, 5, 2, 1]);
                        } else {
                            addGotoTask(ship_id, [1, 2, 4, 2, 1]);
                        }
                    };
                    case 5: return (ship, ship_id, num_ships, certainty_pos)=>{
                        if(certainty_pos >= num_ships/2 && ship.experience_level >= 0.6) { //
                            addGotoTask(ship_id, [1, 2, 4, 6, 8, 6, 2, 1])
                        } else {
                            addGotoTask(ship_id, [1, 2, 4, 6, 8, 2, 1]);
                        }
                    };
                    case 6: return (ship, ship_id, num_ships, certainty_pos)=>{
                        if(certainty_pos >= num_ships/2 && ship.experience_level >= 0.6) {
                            if(ship_id%2 === 0) { //If the ship ID is even, so that we can split up the ships
                                addGotoTask(ship_id, [1, 2, 4, 6, 7, 10, 9, 3, 1]);
                            } else {
                                module.add_ship_task(ship_id, {
                                    task: "GoTo",
                                    data: poi[0]
                                });
                                module.add_ship_task(ship_id, {
                                    task: "GoTo",
                                    data: poi[1]
                                });
                                module.add_ship_task(ship_id, {
                                    task: "GoTo",
                                    data: poi[3]
                                });
                                module.add_ship_task(ship_id, {
                                    task: "GoTo",
                                    data: poi[5]
                                });
                                module.add_ship_task(ship_id, {
                                    task: "GoTo",
                                    data: poi[7]
                                });
                                module.add_ship_task(ship_id, {
                                    task: "GoTo",
                                    data: poi[5]
                                });
                                module.add_ship_task(ship_id, {
                                    task: "GoTo",
                                    data: poi[3]
                                });
                                module.add_ship_task(ship_id, {
                                    task: "GoTo",
                                    data: poi[1]
                                });
                                module.add_ship_task(ship_id, {
                                    task: "GoTo",
                                    data: poi[0]
                                });
                            }
                        } else {
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[0]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[1]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[5]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[6]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[5]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[3]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[1]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[0]
                            });
                        }
                    };
                    case 7: return (ship, ship_id, num_ships, certainty_pos)=>{
                        if(ship.experience_level >= 0.6 && certainty_pos >= num_ships/2) {
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[10]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[12]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[11]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[6]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[5]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[3]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[1]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[0]
                            });
                        } else if(certainty_pos <= num_ships/5) {
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[0]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[1]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[3]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[5]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[7]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[5]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[3]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[0]
                            });
                        } else if(ship_id%2 === 0) {
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[0]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[2]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[8]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[7]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[5]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[3]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[0]
                            });
                        } else {
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[10]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[13]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[7]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[5]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[3]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[1]
                            });
                            module.add_ship_task(ship_id, {
                                task: "GoTo",
                                data: poi[0]
                            });
                        }
                    };
                    case 8: return (ship, ship_id, num_ships, certainty_pos)=> {
                        if(certainty_pos >= num_ships/2) {
                            if(ship_id%2 === 0) {
                                addGotoTask(ship_id, [1, 2, 4, 6, 8, 16, 10, 6, 4, 2, 1]);
                            } else {
                                addGotoTask(ship_id, [1, 2, 4, 6, 7, 12, 15, 13, 14, 11]);
                            }
                        } else {
                            if(ship_id%2 === 0) {
                                addGotoTask(ship_id, [1, 2, 4, 6, 8, 10, 7, 6, 4, 2, 1]);
                            } else {
                                addGotoTask(ship_id, [1, 2, 4, 6, 7, 14, 13, 11]);
                            }
                        }
                    }
                    case 9:
                        return (ship, ship_id, num_ships, certainty_pos)=> {
                            if(certainty_pos >= num_ships/2) {
                                if(ship_id%2 === 0) {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 8, 12, 7, 6, 5, 2, 1]);
                                } else {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 10, 7, 17, 6, 4, 2, 1]);
                                }
                            } else {
                                addGotoTask(ship_id, [1, 2, 4, 1]);
                            }
                        }
                    case 10:
                        return (ship, ship_id, num_ships, certainty_pos)=> {
                            if(certainty_pos >= num_ships/2 && ship.experience_level >= 0.6) {
                                addGotoTask(ship_id, [1, 2, 4, 6, 7, 6, 4, 2, 1]);
                            } else {
                                addGotoTask(ship_id, [1, 2, 4, 1]);
                            }
                        }
                }
            case 2029:
            case 2030:
            case 2031:
            case 2032:
            case 2033:
            case 2034:
            case 2035:
                switch(month) {
                    case 4:
                        return (ship, ship_id, num_ships, certainty_pos)=>{
                            if(ship.experience_level >= 0.6 && certainty_pos >= num_ships/2) {
                                addGotoTask(ship_id, [1, 2, 4, 6, 20, 6, 2, 1]);
                            } else {
                                addGotoTask(ship_id, [1, 2, 4, 6, 4, 2, 1]);
                            }
                        }
                    case 5:
                        return (ship, ship_id, num_ships, certainty_pos)=>{
                            if(ship.experience_level >= 0.6 && certainty_pos >= num_ships/2) {
                                if(ship_id%2 === 0) {
                                    if(ship_id%4 === 0) {
                                        addGotoTask(ship_id, [1, 2, 4, 6, 7, 19, 22, 1]);
                                    } else {
                                        addGotoTask(ship_id, [1, 2, 4, 6, 20, 6, 4, 2, 1]);
                                    }
                                } else {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 7, 6, 2, 1]);
                                }
                            } else {
                                addGotoTask(ship_id, [1, 2, 4, 6, 7, 6, 2, 1]);
                            }
                        }
                    case 6:
                        return (ship, ship_id, num_ships, certainty_pos)=>{
                            if(ship.experience_level >= 0.6 && certainty_pos >= num_ships/2) {
                                addGotoTask(ship_id, [1, 2, 4, 6, 7, 12, 13, 11]);
                            } else {
                                if(certainty_pos <= num_ships/5) {
                                    addGotoTask(ship_id, [1, 4, 6, 20, 6, 4, 2, 1]);
                                } else {
                                    if(ship_id%2 === 0) {
                                        addGotoTask(ship_id, [1,  4, 6, 21, 9, 3, 1]);
                                    } else {
                                        addGotoTask(ship_id, [1, 2, 4, 6, 20, 14, 11]);
                                    }
                                }
                            }
                        }
                    case 7:
                        return (ship, ship_id, num_ships, certainty_pos)=> {
                            if(certainty_pos >= num_ships/2) {
                                if(ship_id%2 === 0) {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 20, 18, 19, 6, 4, 2, 1]);
                                } else {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 7, 12, 15, 13, 14, 11]);
                                }
                            } else {
                                if(ship_id%2 === 0) {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 20, 19, 7, 6, 4, 2, 1]);
                                } else {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 7, 14, 13, 11]);
                                }
                            }
                        }
                    case 8:
                        return (ship, ship_id, num_ships, certainty_pos)=> {
                            if(certainty_pos >= num_ships/2) {
                                if(ship_id%2 === 0) {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 20, 18, 19, 6, 4, 2, 1]);
                                } else {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 7, 12, 15, 13, 14, 11]);
                                }
                            } else {
                                if(ship_id%2 === 0) {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 20, 19, 7, 6, 4, 2, 1]);
                                } else {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 7, 14, 13, 11]);
                                }
                            }
                        }
                    case 9:
                        return (ship, ship_id, num_ships, certainty_pos)=> {
                            if(certainty_pos >= num_ships/2) {
                                if(ship_id%2 === 0) {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 20, 18, 19, 6, 4, 2, 1]);
                                } else {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 7, 12, 15, 13, 14, 11]);
                                }
                            } else {
                                if(ship_id%2 === 0) {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 20, 19, 7, 6, 4, 2, 1]);
                                } else {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 7, 14, 13, 11]);
                                }
                            }
                        }
                    case 10:
                        return (ship, ship_id, num_ships, certainty_pos)=> {
                            if(certainty_pos >= num_ships/2) {
                                if(ship_id%2 === 0) {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 7, 12, 7, 6, 5, 2, 1]);
                                } else {
                                    addGotoTask(ship_id, [1, 2, 4, 6, 19, 7, 17, 6, 4, 2, 1]);
                                }
                            } else {
                                addGotoTask(ship_id, [1, 2, 4, 1]);
                            }
                        }
                }
        }
    }

    function getShipPercentage() {
        switch(year) {
            case 2022:
            case 2023:
            case 2024:
            case 2025:
            case 2026:
            case 2027:
            case 2028:
                switch(month) {
                    case 4: return 0.2;
                    case 5: return 0.75;
                    case 6: return 1.0;
                    case 7: return 1.0;
                    case 8: return 1.0;
                    case 9: return 0.5;
                    case 10: return 0.25;
                }
            case 2029:
            case 2030:
            case 2031:
            case 3032:
            case 2033:
            case 2034:
            case 2035:
                switch(month) {
                    case 4: return 0.3;
                    case 5: return 1.0;
                    case 6: return 1.0;
                    case 7: return 1.0;
                    case 8: return 1.0;
                    case 9: return 0.75;
                    case 10: return 0.35;
                }
        }
    }

    function getRealShipCount(realism) {
        switch(realism) {
            case "realistic":
                switch(year) {
                    case 2022: return 42;
                    case 2023: return 45;
                    case 2024: return 48;
                    case 2025: return 49;
                    case 2026: return 52;
                    case 2027: return 53;
                    case 2028: return 55;
                    case 2029: return 57;
                    case 2030: return 60;
                    case 2031: return 65;
                    case 2032: return 69;
                    case 2032: return 72;
                    case 2033: return 72;
                    case 2034: return 73;
                    case 2035: return 75;
                }
                break;
            case "conservative":
                switch(year) {
                    case 2022: return 47;
                    case 2023: return 49;
                    case 2024: return 49;
                    case 2025: return 49;
                    case 2026: return 49;
                    case 2027: return 49;
                    case 2028: return 50;
                    case 2029: return 51;
                    case 2030: return 52;
                    case 2031: return 53;
                    case 2032: return 53;
                    case 2032: return 54;
                    case 2033: return 54;
                    case 2034: return 55;
                    case 2035: return 55;
                }
                break;
            case "optimistic":
                switch(year) {
                    case 2022: return 42;
                    case 2023: return 45;
                    case 2024: return 50;
                    case 2025: return 63;
                    case 2026: return 65;
                    case 2027: return 80;
                    case 2028: return 95;
                    case 2029: return 105;
                    case 2030: return 105;
                    case 2031: return 110;
                    case 2032: return 110;
                    case 2033: return 115;
                    case 2034: return 118;
                    case 2035: return 120;
                }
        }
    }

    for(let i=0;i<backgrounds.length;i++) {
        let result = await getSvalbardBackground("images/" + backgrounds[i] + ".png");

        let img = result.img;
        let rgb = result.rgb;

        GRID_WIDTH = Math.floor(result.img.width/4);
        GRID_HEIGHT = Math.floor(result.img.height/4);

        let cells = new Uint8Array(GRID_WIDTH * GRID_HEIGHT);

        for(let y=0;y<GRID_HEIGHT;y++) {
            for(let x=0;x<GRID_WIDTH;x++) {
                let realX = Math.floor(x * 4);
                let realY = Math.floor(y * 4);

                let pos = ((realY * img.width) + realX ) * 4;
                // let pos = ((y * GRID_WIDTH * 2) + x * 2) * 4;
                let r = rgb[pos];
                let g = rgb[pos + 1];
                let b = rgb[pos + 2];

                if(Math.abs(b-234) < 2) {
                    cells[(y * GRID_WIDTH) + x] = 2; //Sea
                } else if(g === 76) {
                    cells[(y * GRID_WIDTH) + x] = 0; //Land
                } else {
                    cells[(y * GRID_WIDTH) + x] = 2; //Ice
                }
            }
        }

        result.cells = cells;

        maps[backgrounds[i]] = result;
    }

    module.make_game(GRID_WIDTH, GRID_HEIGHT); //Initializes the game and provides the grid size

    let data = maps["2228AprilMay"];

    let img = data.img;

    module.upload_grid(maps["2228AprilMay"].cells);

    let shouldDraw = false;

    //Get the filename for the background image of the season and year
    let updateGraph = (ships, routes) => {
        let bg;
        if(year <= 2028) {
            switch(month) {
                case 4:
                case 5: bg = "2228AprilMay"; break;
                case 6:
                case 7: bg = "2228JuneJuly"; break;
                case 8:
                case 9:
                case 10: bg = "2228AugOct";
            }
        } else {
            switch(month) {
                case 4:
                case 5: bg = "2835AprilMay"; break;
                case 6:
                case 7: bg = "2835JuneJuly"; break;
                case 8:
                case 9:
                case 10: bg = "2835AugOct";
            }
        }

        img = maps[bg].img;

        render(img, ships, routes);
    }

    let draw = () => {
        let ships = module.get_ship_states();
        let hasTasks = false;
        for(let i=0;i<ships.length;i++) {
            if(ships[i].tasks.length > 0) {
                hasTasks = true;
                break;
            }
        }

        let endOfMonth = false;

        if(!hasTasks) { //Trips have completed, do the next one
            endOfMonth = true;
            if(month === 7) {
                ships.forEach(ship=>{
                    if(ship.adoption_status.status === "InTrial" && ship.trial_period_length.trial === "HalfSeason") {
                        let new_certainty;
                        if(product_quality >= 0.5) {
                            new_certainty = (1 - ship.experience_level) * 0.15;
                        } else {
                            new_certainty = (1 - ship.experience_level) * 0.075;
                        }
                        new_certainty = Math.min(new_certainty, 1.0);
                        module.update_ship_certainty(ship.id, new_certainty);
                        module.update_ship_adoption_status(ship.id, "Adopted");
                    }
                });
            }

            month++;
            if(month > 10) { //End of the season
                let total_he = 0;

                ships.forEach(ship=>{
                    if(ship.experience_level >= 0.6) {
                        total_he++;
                    }
                });

                console.log("Highly experienced ships %: " + total_he / ships.length);

                month = 4;
                year++;

                module.update_year(year);

                let adopted_total = 0;

                ships.forEach(ship=>{
                    if(ship.adoption_status.status === "Adopted") adopted_total++;
                });

                let adopted_ratio = adopted_total / ships.length;

                let totalCertainty = 0;
                let totalUtility = 0;

                ships.forEach(ship=>{
                    let y = product_quality >= ship.quality_threshold ? 1 : 0;
                    totalCertainty += ship.certainty;
                    totalUtility += (ship.normative_influence * adopted_ratio) + ( (1 - ship.normative_influence) * y);
                });

                if(year !== 2021) { //Graph everything
                    let averageCertainty = totalCertainty / ships.length;
                    let averageUtility = totalUtility / ships.length;

                    monitor_charts.average_certainty.data.labels.push(year - 1);
                    monitor_charts.average_certainty.data.datasets[0].data.push(averageCertainty);
                    monitor_charts.average_certainty.update();

                    monitor_charts.ship_count.data.labels.push(year - 1);
                    monitor_charts.ship_count.data.datasets[0].data.push(ships.length);
                    monitor_charts.ship_count.update();

                    monitor_charts.adopters.data.labels.push(year - 1);
                    monitor_charts.adopters.data.datasets[0].data.push(
                        (ships.filter(ship => ship.adoption_status.status === "Adopted").length / ships.length)
                        * 100
                    );
                    monitor_charts.adopters.data.datasets[1].data.push(
                        (ships.filter(ship => ship.adoption_status.status === "InTrial").length / ships.length)
                        * 100);
                    monitor_charts.adopters.data.datasets[2].data.push(
                        (ships.filter(ship => ship.adoption_status.status === "NonUser").length / ships.length)
                        * 100);
                    monitor_charts.adopters.update();

                    monitor_charts.utility_threshold.data.labels.push(year - 1);
                    monitor_charts.utility_threshold.data.datasets[0].data.push(averageUtility);
                    monitor_charts.utility_threshold.update();

                    ships = module.get_ship_states();

                    let totalExp = 0;

                    ships.forEach(ship=>totalExp+=ship.reliance_on_product);

                    let avgExp = totalExp / ships.length;

                    monitor_charts.reliance_on_forecast.data.labels.push(year - 1);
                    monitor_charts.reliance_on_forecast.data.datasets[0].data.push(avgExp);
                    monitor_charts.reliance_on_forecast.update();

                    ships.forEach(ship=> {
                        if (ship.adoption_status.status === "InTrial") {
                            module.update_ship_adoption_status(ship.id, "Adopted");
                        }
                    });

                    // console.log(`${non_exp.length} ${highly_exp}`);
                }

                //Update certainty
                ships.forEach(ship=>{
                    let new_certainty = ((1-ship.reliance_on_product)*ship.experience_level) + (ship.reliance_on_product*forecast_reliability);
                    module.update_ship_certainty(ship.id, new_certainty);
                });

                ships = module.get_ship_states();

                if(year >= product_release_year) {
                    //Calculate product utility and have some people adopt

                    let adopted_total = 0;

                    ships.forEach(ship=>{
                        if(ship.adoption_status.status === "Adopted") adopted_total++;
                    });

                    let adopted_ratio = adopted_total / ships.length;

                    ships.forEach(ship=>{
                        let y = product_quality >= ship.quality_threshold ? 1 : 0;
                        let product_utility = (ship.normative_influence * adopted_ratio) + ( (1 - ship.normative_influence) * y);
                        if(product_utility >= ship.utility_threshold && ship.adoption_status.status !== "Adopted") {
                            module.update_ship_adoption_status(ship.id, "InTrial");
                        }
                    });
                }

                ships = module.get_ship_states();

                if(year === 2029 && should_inc_product_utility) {
                    ships.forEach(ship=>{
                        let new_utility_threshold = ship.early_adopter ? Math.random() * 0.6 : //Scale the value from 0.0-0.8 to 0.0-0.6
                            Math.random()*0.8;
                        module.update_ship_utility_threshold(ship.id, new_utility_threshold);
                    });
                }

                ships.forEach(ship=>{
                    let new_experience = Math.min(ship.experience_level+0.05, 1.0);

                    module.update_ship_experience_level(ship.id, new_experience);


                    if(new_experience >= 0.6) {
                        // if(provider_trust >= 0.75) {
                        //     let reliance = 0.9;
                        //     module.update_reliance_on_forecast(ship.id, reliance);
                        // } else {
                            let year_diff = 13 - (2035 - year);
                            let percentage = (year_diff / 13) //13 years in the model
                            module.update_reliance_on_forecast(ship.id, 0.4 + (0.2 * percentage)); //lerp between 0.4 and 0.6
                        // }
                    } else {
                        let reliance = 0.6;
                        module.update_reliance_on_forecast(ship.id, reliance);
                    }
                });


                ships = module.get_ship_states();

                //Stop after the year 2035
                if(year > 2035) shouldDraw = false;
            }

            ships = module.get_ship_states();

            document.getElementById("season").innerHTML = `${months[month-4]} ${year}`;

            // debugger;
            let shipsInSeasonPercentage = getShipPercentage();
            let totalShips = getRealShipCount(document.getElementById("realism").value);
            let real_ship_count = Math.floor(totalShips * shipsInSeasonPercentage); //Round the number down
            // let real_ship_count = 100;

            let ships_to_add = real_ship_count-ships.length;

            if(real_ship_count > ships.length) {
                for(let i=0;i<real_ship_count-ships.length;i++) {

                    let is_early_adopter = i <= ships_to_add * proportion_early_adopters; //TODO: early adopter percentage slider
                    let utility_threshold = is_early_adopter ? Math.random() * 0.8 : Math.random();

                    if(year >= 2029) {
                        utility_threshold = is_early_adopter ? Math.random() * 0.6 : //Scale the value from 0.0-0.8 to 0.0-0.6
                            Math.random()*0.8;
                    }

                    let experience;

                    if(i <= ships_to_add * proportion_highly_experienced) {
                        //console.log("Added highly experienced ship");
                        experience = (Math.random() * 0.4) + 0.6;
                    } else {
                        //console.log("Added lowly experienced ship");
                        experience = Math.random() * 0.599;
                    }

                    let normative_influence = is_early_adopter ? 0.51 : 0.6;

                    let reliance_on_product;

                    if(experience >= 0.6) {
                        // if(provider_trust >= 0.75) {
                        //     reliance_on_product = 0.9;
                        // } else {
                            let year_diff = 13 - (2035 - year);
                            let percentage = (year_diff / 13); //13 years in the model
                            reliance_on_product = 0.4 + (0.2 * percentage); //lerp between 0.4 and 0.6
                        // }
                    } else {
                        reliance_on_product = 0.6;
                    }

                    let is_product_released = year >= product_release_year;

                    let ship_certainty = ((1-reliance_on_product)*experience) + (reliance_on_product*forecast_reliability);

                    let adopted_total = 0;

                    ships.forEach(ship=>{
                        if(ship.adoption_status.status === "Adopted") adopted_total++;
                    });

                    let adopted_ratio = adopted_total / ships.length;

                    let y = product_quality >= utility_threshold ? 1 : 0;
                    let product_utility = (normative_influence * adopted_ratio) + ( (1 - normative_influence) * y);

                    let adoption_status = "NonUser";

                    let sorted_ships = ships
                        .map(ship=>ship.experience_level)
                        .concat(experience)
                        .sort()
                        .reverse(); //Reverse because it sorts it lowest experience to highest

                    let experience_ranking = sorted_ships.indexOf(experience) / sorted_ships.length;

                    if(product_utility >= utility_threshold &&
                        is_product_released &&
                        //If it is in the highly experienced percentile, or if that's 0, if its in the top 15%
                        // (experience_percentile >= proportion_early_adopters)
                        experience_ranking < proportion_early_adopters
                    ) adoption_status = "InTrial";

                    module.add_ship(
                        poi[0][0], poi[0][1],
                        Math.random(),
                        is_early_adopter,
                        adoption_status,
                        utility_threshold,
                        experience,
                        ship_certainty,
                        reliance_on_product,
                        normative_influence,
                        0.5,
                        Math.random() * 20,
                        Math.random() * 20
                    );
                } //Add a ship, return it's id

                ships = module.get_ship_states();
            }

            //Sort by certainty
            let sorted_ships = ships.sort((ship_a, ship_b)=>{
                if(ship_a.certainty > ship_b.certainty) {
                    return 1;
                } else if(ship_a.certainty < ship_b.certainty) {
                    return -1;
                }
                return 0;
            });

            let taskGen = getIteratorTaskGenerator();

            let filteredShips = ships.filter(ship=>ship.experience_level >= 0.6).concat(
                ships.filter(ship=>ship.experience_level < 0.6)
            );
            //If we're in a month where we need less ships than we've generated, only grab the ships that are highly experienced
            //Otherwise, use all ships

            for(let i=0;i<real_ship_count;i++) {
                let ship = filteredShips[i];
                taskGen(ship, ship.id, real_ship_count, sorted_ships.indexOf(ship));
            }
        }

        let speed = parseInt(document.getElementById("speed").value);

        for(let i=0;i<speed;i++) module.tick_game();

        if(endOfMonth) updateGraph(module.get_ship_states(), module.get_routes());

        if(shouldDraw) requestAnimationFrame(draw);
    }

    document.getElementById("play").onclick = () => {
        shouldDraw = true;
        if(year < 2035) draw();
    }

    //Boilerplate code for the UI as I don't want to have to load any frameworks just for some basic sliders
    let updateReleaseYearDisplay = val => {
        product_release_year = parseInt(val.value);
        document.getElementById("release-year-label").innerHTML = `Release year (${val.value})`;
    }

    let updateForecastReliability = val => {
        let newval = parseInt(val.value) / 10;
        document.getElementById("forecast-reliability-label").innerHTML = `Forecast reliability (${newval})`;
        forecast_reliability = newval;
    }

    let updateProviderTrust = val => {
        let newval = parseInt(val.value) / 10;
        document.getElementById("provider-trust-label").innerHTML = `Provider trust (${newval})`;
        provider_trust = newval;
    }

    let updateProductQuality = val => {
        product_quality = parseFloat(val.value);
        document.getElementById("product-quality-label").innerHTML = `Product quality (${product_quality})`;
    }

    let updatePropHE = val => {
        proportion_highly_experienced = val.value;
        document.getElementById("prop-he-label").innerHTML = `Percentage highly experienced (${proportion_highly_experienced * 100}%)`;
    }

    let updatePropEA = val => {
        proportion_early_adopters = val.value;
        document.getElementById("prop-ea-label").innerHTML = `Percentage early adopters (${proportion_early_adopters * 100}%)`;
    }

    let updateIncProductUtility = val => {
        should_inc_product_utility = val.checked;
    }

    let updateMinYearView = val => {
        minGraphYear = parseInt(val.value);
        document.getElementById("min-year-label").innerHTML = `Min graph year (${minGraphYear})`;

        updateGraph(module.get_ship_states(), module.get_routes());
    }

    let updateMaxYearView = val => {
        maxGraphYear = parseInt(val.value);
        document.getElementById("max-year-label").innerHTML = `Max graph year (${maxGraphYear})`;

        updateGraph(module.get_ship_states(), module.get_routes());
    }

    document.getElementById("release-year").onchange = e => updateReleaseYearDisplay(e.target);
    document.getElementById("forecast-reliability").onchange = e => updateForecastReliability(e.target);
    document.getElementById("provider-trust").onchange = e => updateProviderTrust(e.target);
    document.getElementById("product-quality").onchange = e => updateProductQuality(e.target);
    document.getElementById("prop-he").onchange = e => updatePropHE(e.target);
    document.getElementById("prop-ea").onchange = e => updatePropEA(e.target);
    document.getElementById("inc-prod").onchange = e => updateIncProductUtility(e.target);

    document.getElementById("min-year-view").onchange = e => updateMinYearView(e.target);
    document.getElementById("max-year-view").onchange = e => updateMaxYearView(e.target);

    //Initialize the slider values
    updateReleaseYearDisplay(document.getElementById("release-year"));
    updateForecastReliability(document.getElementById("forecast-reliability"));
    updateProviderTrust(document.getElementById("provider-trust"));
    updateProductQuality(document.getElementById("product-quality"));
    updatePropHE(document.getElementById("prop-he"));
    updatePropEA(document.getElementById("prop-ea"));
    updateIncProductUtility(document.getElementById("inc-prod"));
    updateMinYearView(document.getElementById("min-year-view"));
    updateMaxYearView(document.getElementById("max-year-view"));

})()