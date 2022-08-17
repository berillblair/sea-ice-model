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

    let new_product_release_year = parseInt(document.getElementById("release-year").value);

    let new_product_quality = parseFloat(document.getElementById("new-product-quality").value);

    let informational_environment_reliability = parseInt(document.getElementById("informational-environment-reliability").value)/10;
    let provider_trust = parseInt(document.getElementById("provider-trust").value)/10;

    let proportion_highly_experienced = parseFloat(document.getElementById("prop-he").value);
    let proportion_early_adopters = parseFloat(document.getElementById("prop-ea").value);
    const trialLength = 1;

    let highSeaIce = false;
    let heavyIceCoverSeasons = [];
    let heavyIceYears = {};

    let timesToRun = 1;

    let month = 11;
    let year = 2021;

    let simulation = 0;
    let routeHits = {};
    let simulationData = {};

    function makeCsv() {
        let routeAverages = {};
        let simAverages = {};

        let csvOut = [];

        for(let y=0;y<=100;y++) {
            csvOut[y] = [];
        }

        for (let routeId = 1; routeId <= 29; routeId++) {
            for(let simulationId=0;simulationId<timesToRun;simulationId++) {
                for (let _year = 2022; _year <= 2035; _year++) {
                    if(!routeAverages[_year]) routeAverages[_year] = {};
                    if(!routeAverages[_year][routeId]) routeAverages[_year][routeId] = 0;

                    routeAverages[_year][routeId] += routeHits[simulationId][_year][routeId];
                }
            }
        }

        for(let simulationId=0;simulationId<timesToRun;simulationId++) {
            for (let _year = 2022; _year <= 2035; _year++) {
                if(!simAverages[_year]) simAverages[_year] = {
                    adoptionRatio: 0,
                    averageCertainty: 0,
                    averageInfEnv: 0,
                    averageUtility: 0,
                    averageInTrial: 0
                };
                simAverages[_year].adoptionRatio += simulationData[simulationId][_year].adoptionRatio;
                simAverages[_year].averageCertainty += simulationData[simulationId][_year].averageCertainty;
                simAverages[_year].averageInfEnv += simulationData[simulationId][_year].averageInfEnv;
                simAverages[_year].averageUtility += simulationData[simulationId][_year].averageUtility;
                simAverages[_year].averageInTrial += simulationData[simulationId][_year].averageInTrial;
            }
        }

        for (let _year = 2022; _year <= 2035; _year++) {
            if(!simAverages[_year]) simAverages[_year] = {};
            simAverages[_year].adoptionRatio /= timesToRun;
            simAverages[_year].averageCertainty /= timesToRun;
            simAverages[_year].averageInfEnv /= timesToRun;
            simAverages[_year].averageUtility /= timesToRun;
            simAverages[_year].averageInTrial /= timesToRun;
        }

        csvOut[0][0] = "Release year";
        csvOut[1][0] = new_product_release_year;

        csvOut[0][1] = "Informational Environment Reliability";
        csvOut[1][1] = informational_environment_reliability;

        csvOut[0][2] = "Provider trust";
        csvOut[1][2] = provider_trust;

        csvOut[0][3] = "New product quality";
        csvOut[1][3] = new_product_quality;

        csvOut[0][4] = "Percentage highly experienced";
        csvOut[1][4] = proportion_highly_experienced;

        csvOut[0][5] = "Percentage early adopters";
        csvOut[1][5] = proportion_early_adopters;

        csvOut[0][7] = "Trial length";
        csvOut[1][7] = trialLength;

        csvOut[0][8] = "High sea ice?";
        csvOut[1][8] = highSeaIce ? "yes" : "no";

        for(let x=0;x<2035-2021;x++) {
            csvOut[2][x + 1] = x + 2022;
        }


        for (let routeId = 1; routeId <= 29; routeId++) {
            csvOut[routeId + 2][0] = `Route ${routeId}`;

            for (let _year = 2022; _year <= 2035; _year++) {
                routeAverages[_year][routeId] /= timesToRun;

                let x = _year - 2021;

                let result = routeAverages[_year][routeId];

                csvOut[routeId + 2][x] = isNaN(result) ? 0 : result;
            }
        }

        csvOut[2][20] = "Average Certainty";
        csvOut[2][21] = "Adoption Ratio";
        csvOut[2][22] = "Average Informational Environment Reliance";
        csvOut[2][23] = "Average Utility";
        csvOut[2][24] = "In-Trial Ratio";

        for(let _year = 2022; _year <= 2035; _year++) {
            csvOut[(_year - 2021) + 2][19] = _year;

            csvOut[_year - 2021 + 2][20] = simAverages[_year].averageCertainty;
            csvOut[_year - 2021 + 2][21] = simAverages[_year].adoptionRatio;
            csvOut[_year - 2021 + 2][22] = simAverages[_year].averageInfEnv;
            csvOut[_year - 2021 + 2][23] = simAverages[_year].averageUtility;
            csvOut[_year - 2021 + 2][24] = simAverages[_year].averageInTrial;
        }

        csvOut[19][18] = "Simulation";
        for(let simulationId=0;simulationId<timesToRun;simulationId++) {
            let y = (simulationId * (2035 - 2022)) + 20;

            if(!csvOut[y]) csvOut[y] = [];

            csvOut[y][25] = (heavyIceYears[simulationId] || []).join(";");
            for(let _year = 2022; _year <= 2035; _year++) {
                let y = (simulationId * (2035 - 2022)) + 20 + (_year - 2022);

                if(!csvOut[y]) csvOut[y] = [];

                csvOut[y][18] = simulationId;
                csvOut[y][19] = _year;
                csvOut[y][20] = simulationData[simulationId][_year].averageCertainty;
                csvOut[y][21] = simulationData[simulationId][_year].adoptionRatio;
                csvOut[y][22] = simulationData[simulationId][_year].averageCertainty;
                csvOut[y][23] = simulationData[simulationId][_year].averageUtility;
                csvOut[y][24] = simulationData[simulationId][_year].averageInTrial;
            }
        }

        let csvString = "";

        for(let y=0;y<csvOut.length;y++) {
            for(let x = 0;x<=40;x++) {
                csvString += ((csvOut[y][x] === undefined) || ((typeof csvOut[y][x] === "number") && isNaN(csvOut[y][x])) ? "" : csvOut[y][x]) + ",";
            }
            csvString += "\n";
        }

        window.open(encodeURI("data:text/csv;charset=utf-8," + csvString));
    }

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
        reliance_on_informational_environment: new Chart(
            document.getElementById("informational-environment-reliance"),
            {
                type: "line",
                data: {
                    labels: [],

                    datasets: [{
                        label: "Average reliance on informational environment",
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

    function adoptShipsUpdateCertainty(ship) {
        let adjustedTrialLength = trialLength;

        if(provider_trust > 0.7) {
            adjustedTrialLength = Math.ceil(trialLength / 2);
        }

        if(ship.adoption_status.status === "InTrial" && year >= ship.trial_year + adjustedTrialLength) {
            let new_certainty = getShipReliance(heavyIceCoverSeasons, year, ship) * 0.25;

            new_certainty = Math.min(new_certainty + ship.certainty, 1.0);
            module.update_ship_certainty(ship.id, new_certainty);
            module.update_ship_adoption_status(ship.id, "Adopted");
        }
    }

    function updateReliance(ship, experience) {
        let reliance_on_informational_environment;
        if(experience > 0.65) {
            reliance_on_informational_environment = (Math.random() * 0.3) + 0.1
        } else {
            reliance_on_informational_environment = (Math.random() * 0.4) + 0.6;
        }
        module.update_reliance_on_informational_environment(ship.id, reliance_on_informational_environment);
    }

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

    const routes = { //keys are the difficulty
        //1
        1: [
            [[1,2,4,1], 1],
            [[1,2,4,2,1], 2],
            [[1,2,4,6,4,2,1], 3],
        ],
        //4
        2: [
            [[1,2,4,6,8,6,2,1], 4],
            [[1,2,4,6,8,6,4,2,1], 5],
            [[1,2,5,2,1], 6],
            [[1,4,6,8,6,4,2,1], 7],
            [[1,4,6,8,9,3,1], 8],
        ],
        //9
        3: [
            [[1,2,4,6,7,6,2,1], 9],
            [[1,2,4,6,7,6,4,2,1], 10],
        ],
        //11
        4: [
            [[1,2,4,6,10,7,17,6,4,2,1], 11],
            [[1,2,4,6,7,10,9,3,1], 12],
            [[1,2,4,6,7,12,7,6,5,2,1], 13],
            [[1,2,4,6,8,10,7,6,4,2,1], 14],
            [[1,2,4,6,8,16,10,6,4,2,1], 15],
        ],
        //16
        5: [
            [[1,2,4,6,20,18,19,6,4,2,1], 16],
            [[1,2,4,6,20,6,2,1], 17],
            [[1,4,6,20,6,4,2,1], 18],
            [[1,4,6,21,9,3,1], 19],
        ],
        //20
        6: [
            [[1,2,4,6,19,7,17,6,4,2,1], 20],
            [[1,2,4,6,20,19,7,6,4,2,1], 21],
            [[1,2,4,6,20,6,4,2,1], 22],
            [[1,2,4,6,7,19,22,1], 23],
        ],
        //24
        7: [
            [[1,2,4,6,7,14,13,11], 24],
            [[1,2,4,6,8,14,11], 25]
        ],
        8: [
            [[1,2,4,6,20,14,11], 26],
            [[1,2,4,6,21,14,1], 27],
            [[1,2,4,6,7,12,13,11], 28]
        ],
        9: [
            [[1,2,4,6,7,12,15,13,14,11], 29]
        ]
    };

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
    }

    function getRandomRoute(year, adjustment, ...difficulties) {
        let difficulty = difficulties[getRandomInt(0, difficulties.length)];

        let possible_routes = routes[Math.max(difficulty - adjustment, 1)];

        let routeIndex = getRandomInt(0, possible_routes.length);
        let route = possible_routes[routeIndex][0];
        let routeId = possible_routes[routeIndex][1];

        if(!routeHits[simulation]) routeHits[simulation] = {};
        if(!routeHits[simulation][year]) routeHits[simulation][year] = {};
        if(!routeHits[simulation][year][routeId]) routeHits[simulation][year][routeId] = 0;

        routeHits[simulation][year][routeId]++;

        return route;
    }

    function isHeavySeaIce(heavySeaIceCoverSeasons, year) {
        return heavySeaIceCoverSeasons.indexOf(year) != -1;
    }

    function getIteratorTaskGenerator(year) {
        let adjustment = heavyIceCoverSeasons.includes(year) ? 2 : 0;

        switch(year) {
            case 2022:
            case 2023:
            case 2024:
            case 2025:
            case 2026:
            case 2027:
            case 2028:
                switch(month) {
                    //April
                    case 4: return (ship, ship_id, num_ships, certainty_pos)=>{
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 2));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 1));
                        }
                    };
                    case 5: return (ship, ship_id, num_ships, certainty_pos)=>{
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 2));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 1));
                        }
                    };
                    case 6: return (ship, ship_id, num_ships, certainty_pos)=>{
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 2,4));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 3));
                        }
                    };
                    case 7: return (ship, ship_id, num_ships, certainty_pos)=>{
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 7,8));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 2,5,7));
                        }
                    };
                    case 8: return (ship, ship_id, num_ships, certainty_pos)=> {
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 7,8,9));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 4,7,8));
                        }
                    }
                    case 9: return (ship, ship_id, num_ships, certainty_pos)=> {
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 4,5));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 1));
                        }
                    }
                    case 10: return (ship, ship_id, num_ships, certainty_pos)=> {
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 3));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 1));
                        }
                    }
                }
            default:
                switch(month) {
                    case 4: return (ship, ship_id, num_ships, certainty_pos)=> {
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 5));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 2));
                        }
                    }
                    case 5: return (ship, ship_id, num_ships, certainty_pos)=> {
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 5,7));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 3));
                        }
                    }
                    case 6: return (ship, ship_id, num_ships, certainty_pos)=> {
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 7,8));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 5,7));
                        }
                    }
                    case 7: return (ship, ship_id, num_ships, certainty_pos)=> {
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 7,8,9));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 6,7,8));
                        }
                    }
                    case 8: return (ship, ship_id, num_ships, certainty_pos)=> {
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 7,8,9));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 7,8,9));
                        }
                    }
                    case 9: return (ship, ship_id, num_ships, certainty_pos)=> {
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 5,8,9));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 6,7));
                        }
                    }
                    case 10: return (ship, ship_id, num_ships, certainty_pos)=> {
                        if(certainty_pos >= num_ships/2 && ship.certainty >= 0.5) {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 6));
                        } else {
                            addGotoTask(ship_id, getRandomRoute(year, adjustment, 1,6));
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
            case 2032:
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

    function getShipBoost(heavyIceCoverSeasons, year, ship) {
        // let boost = ship.reliance_boost;
        // if(boost == 0) {
        //     boost = ship.experience_level > 0.65 ? Math.random() * 0.2 : Math.random() * 0.4;
        //     module.update_ship_reliance_boost(ship.id, boost);
        // }
        // let total = isHeavySeaIce(heavyIceCoverSeasons, year) ? boost : 0.0;
        // console.log(total);
        // return total;
        return ship.reliance_boost;
    }

    function getShipReliance(heavyIceCoverSeasons, year, ship) {
        return Math.min(ship.reliance_on_informational_environment + getShipBoost(heavyIceCoverSeasons, year, ship), 1.0);
        // return Math.min(ship.reliance_on_informational_environment, 1.0);
    }

    function updateShipCertainty(year, ship) {
        let ship_reliance = getShipReliance(heavyIceCoverSeasons, year, ship);

        let new_certainty = ((1-ship_reliance)*ship.experience_level) + (ship_reliance*informational_environment_reliability);
        module.update_ship_certainty(ship.id, new_certainty);
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

    let run = () => {
        let ships = module.get_ship_states();
        let hasTasks = false;
        for(let i=0;i<ships.length;i++) {
            if(ships[i].tasks.length > 0) {
                hasTasks = true;
                break;
            }
        }

        let endOfMonth = false;

        if(!hasTasks || timesToRun > 1) { //Trips have completed, do the next one
            endOfMonth = true;

            month++;

            if(month > 10) { //End of the season
                ships = module.get_ship_states();

                if(year !== 2021) { //Graph everything
                    if(timesToRun === 1) {
                        let adopted_total = 0;

                        ships.forEach(ship=>{
                            if(ship.adoption_status.status === "Adopted") adopted_total++;
                        });

                        let adopted_ratio = adopted_total / ships.length;

                        let totalCertainty = 0;
                        let totalUtility = 0;

                        ships.forEach(ship=>{
                            let y = new_product_quality >= ship.quality_threshold ? 1 : 0;
                            totalCertainty += ship.certainty;
                            totalUtility += (ship.weight_of_social_influence * adopted_ratio) + ( (1 - ship.weight_of_social_influence) * y);
                        });

                        let averageCertainty = totalCertainty / ships.length;
                        let averageUtility = totalUtility / ships.length;

                        monitor_charts.average_certainty.data.labels.push(year);
                        monitor_charts.average_certainty.data.datasets[0].data.push(averageCertainty);
                        monitor_charts.average_certainty.update();

                        monitor_charts.ship_count.data.labels.push(year);
                        monitor_charts.ship_count.data.datasets[0].data.push(ships.length);
                        monitor_charts.ship_count.update();

                        monitor_charts.adopters.data.labels.push(year);
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

                        ships = module.get_ship_states();

                        let totalExp = 0;

                        ships.forEach(ship => totalExp += getShipReliance(heavyIceCoverSeasons, year, ship));

                        let avgExp = totalExp / ships.length;

                        monitor_charts.reliance_on_informational_environment.data.labels.push(year);
                        monitor_charts.reliance_on_informational_environment.data.datasets[0].data.push(avgExp);
                        monitor_charts.reliance_on_informational_environment.update();

                    }

                    ships = module.get_ship_states();

                    let adopted_total = 0;
                    let in_trial_total = 0;

                    ships.forEach(ship=>{
                        if(ship.adoption_status.status === "Adopted") adopted_total++;
                        if(ship.adoption_status.status === "InTrial") in_trial_total++;
                    });

                    let adoptionRatio = adopted_total / ships.length;
                    let averageInTrial = in_trial_total / ships.length;
                    let totalCertainty = 0;
                    let totalUtility = 0;
                    let totalInfEnv = 0;

                    ships.forEach(ship=>{
                        let y = new_product_quality >= ship.quality_threshold ? 1 : 0;
                        totalCertainty += ship.certainty;
                        totalUtility += (ship.weight_of_social_influence * adoptionRatio) + ( (1 - ship.weight_of_social_influence) * y);
                        totalInfEnv += getShipReliance(heavyIceCoverSeasons, year, ship);
                    });

                    let averageInfEnv = totalInfEnv / ships.length;
                    let averageCertainty = totalCertainty / ships.length;
                    let averageUtility = totalCertainty / ships.length;

                    if(!simulationData[simulation]) simulationData[simulation] = {};
                    simulationData[simulation][year] = {
                        averageInfEnv,
                        averageCertainty,
                        averageUtility,
                        adoptionRatio,
                        averageInTrial
                    }
                }

                ships.forEach(ship=>{
                    let new_experience = Math.min(ship.experience_level + 0.05, 1.0);
                    module.update_ship_experience_level(new_experience);
                    if(new_experience > 0.65) {
                        updateReliance(ship, new_experience);
                    }
                });

                ships = module.get_ship_states();

                ships.forEach(ship => {
                    adoptShipsUpdateCertainty(ship);
                });

                ships = module.get_ship_states();

                let total_he = 0;

                ships.forEach(ship=>{
                    if(ship.experience_level >= 0.65) {
                        total_he++;
                    }
                });

                month = 4;
                year++;

                if(year === 2022) { //beginning of a simulation
                    if(highSeaIce) {
                        const seasons = [2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];

                        heavyIceCoverSeasons = [];
                        for (let i = 0; i < 3; i++) {

                            let seasonToPick = getRandomInt(0, seasons.length);

                            while (heavyIceCoverSeasons.includes(seasons[seasonToPick])) {
                                seasonToPick = getRandomInt(0, seasons.length);
                            }

                            heavyIceCoverSeasons.push(seasons[seasonToPick]);
                        }

                        heavyIceCoverSeasons = heavyIceCoverSeasons.sort((a,b)=>a-b);
                        heavyIceYears[simulation] = heavyIceCoverSeasons;
                        console.log(heavyIceCoverSeasons);
                    }
                }

                if(heavyIceCoverSeasons.indexOf(year) != -1) {
                    ships.forEach(ship=>{
                        let boost = ship.experience_level > 0.65 ? Math.random() * 0.2 : Math.random() * 0.4;
                        module.update_ship_reliance_boost(ship.id, ship.reliance_boost + boost);
                    });
                }

                ships = module.get_ship_states();

                module.update_year(year);

                //Update certainty
                ships.forEach(ship=>updateShipCertainty(year, ship));

                ships = module.get_ship_states();

                if(year >= new_product_release_year) {
                    //Calculate product utility and have some people adopt

                    let adopted_total = 0;

                    ships.forEach(ship=>{
                        if(ship.adoption_status.status === "Adopted") adopted_total++;
                    });

                    let adopted_ratio = adopted_total / ships.length;

                    ships.forEach(ship=>{
                        let y = new_product_quality >= ship.quality_threshold ? 1 : 0;
                        let new_product_utility = (ship.weight_of_social_influence * adopted_ratio) + ( (1 - ship.weight_of_social_influence) * y);
                        if(new_product_utility >= ship.utility_threshold && ship.adoption_status.status === "NonUser") {
                            module.update_ship_trial_year(ship.id, year);
                            module.update_ship_adoption_status(ship.id, "InTrial");
                        }
                    });
                }

                ships = module.get_ship_states();

                //Stop after the year 2035
                if(year > 2035) {
                    if(timesToRun === 1) {
                        shouldDraw = false;
                        makeCsv();
                    }
                    else {
                        simulation++;
                        if(simulation === timesToRun) {
                            shouldDraw = false;
                            makeCsv();
                        } else {
                            document.getElementById("simulation-number").innerHTML = `Simulation: #${simulation + 1}`;
                            year = 2021;
                            month = 4;
                            module.clear_ships();
                            ships = module.get_ship_states();
                        }
                    }
                }
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
                let new_ship_experiences = [];

                for(let i=0;i<ships_to_add;i++) {
                    if(i < ships_to_add * proportion_highly_experienced) {
                        new_ship_experiences.push((Math.random() * 0.35) + 0.65);
                    } else {
                        new_ship_experiences.push(Math.random() * 0.649999);
                    }
                }

                let sorted_by_experience = ships.map(ship=>ship.experience_level).concat(new_ship_experiences).sort((ship_a, ship_b)=>{
                    if(ship_a > ship_b) {
                        return 1;
                    } else if(ship_a < ship_b) {
                        return -1;
                    }
                    return 0;
                });

                for(let i=0;i<ships_to_add;i++) {

                    let is_early_adopter = (i/(real_ship_count-ships.length)) <= proportion_early_adopters;

                    let utility_threshold = is_early_adopter ? Math.random() * 0.8 : Math.random();

                    if(year >= 2029) {
                        utility_threshold = is_early_adopter ? Math.random() * 0.6 : //Scale the value from 0.0-0.8 to 0.0-0.6
                            Math.random()*0.8;
                    }

                    let experience = sorted_by_experience[i];

                    let weight_of_social_influence = is_early_adopter ? 0.51 : 0.6;

                    let reliance_on_informational_environment;

                    debugger;
                    if(experience > 0.65) {
                        reliance_on_informational_environment = (Math.random() * 0.3) + 0.1;
                    } else {
                        reliance_on_informational_environment = (Math.random() * 0.4) + 0.6;
                    }

                    let is_product_released = year >= new_product_release_year;

                    let ship_certainty = ((1-reliance_on_informational_environment)*experience) + (reliance_on_informational_environment*informational_environment_reliability);

                    let adopted_total = 0;

                    ships.forEach(ship=>{
                        if(ship.adoption_status.status === "Adopted") adopted_total++;
                    });

                    //Adopted ratio is social influence
                    let adopted_ratio = adopted_total / ships.length;

                    let y = new_product_quality >= utility_threshold ? 1 : 0;
                    let new_product_utility = (weight_of_social_influence * adopted_ratio) + ( (1 - weight_of_social_influence) * y);

                    let adoption_status = "NonUser";

                    let sorted_ships = ships
                        .map(ship=>ship.experience_level)
                        .concat(experience)
                        .sort()
                        .reverse(); //Reverse because it sorts it lowest experience to highest

                    let experience_ranking = sorted_ships.indexOf(experience) / sorted_ships.length;

                    if(new_product_utility >= utility_threshold &&
                        is_product_released &&
                        //If it is in the highly experienced percentile, or if that's 0, if its in the top 15%
                        // (experience_percentile >= proportion_early_adopters)
                        experience_ranking < (proportion_early_adopters)
                    ) adoption_status = "InTrial";

                    module.add_ship(
                        poi[0][0], poi[0][1],
                        Math.random(),
                        is_early_adopter,
                        adoption_status,
                        utility_threshold,
                        experience,
                        ship_certainty,
                        reliance_on_informational_environment,
                        weight_of_social_influence,
                        provider_trust,
                        Math.random() * 20,
                        Math.random() * 20,
                        year
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

            let taskGen = getIteratorTaskGenerator(year);

            let filteredShips = ships.filter(ship=>ship.experience_level >= 0.65).concat(
                ships.filter(ship=>ship.experience_level < 0.65)
            );

            for(let i=0;i<real_ship_count;i++) {
                let ship = filteredShips[i];
                taskGen(ship, ship.id, real_ship_count, sorted_ships.indexOf(ship));
                taskGen(ship, ship.id, real_ship_count, sorted_ships.indexOf(ship));
            }
        }

        let speed = parseInt(document.getElementById("speed").value);

        if(timesToRun === 1) for(let i=0;i<speed;i++) module.tick_game();

        if(endOfMonth && timesToRun === 1) updateGraph(module.get_ship_states(), module.get_routes());
    }

    document.getElementById("play").onclick = () => {
        shouldDraw = true;

        let callback = () => {
            if(shouldDraw) {
                run();
                requestAnimationFrame(callback);
            }
        }

        callback();
        // if(year < 2035) draw();
    }

    document.getElementById("record").onclick = () => {
        shouldDraw = true;

        timesToRun = 30;

        let callback = () => {
            if(shouldDraw) {
                run();
                requestAnimationFrame(callback);
            }
        }

        callback();
        // if(year < 2035) draw();
    }

    //Boilerplate code for the UI as I don't want to have to load any frameworks just for some basic sliders
    let updateReleaseYearDisplay = val => {
        new_product_release_year = parseInt(val.value);
        document.getElementById("release-year-label").innerHTML = `Release year (${val.value})`;
    }

    let updateInformationalEnvironmentReliability = val => {
        let newval = parseInt(val.value) / 10;
        document.getElementById("informational-environment-reliability-label").innerHTML = `Informational environment reliability (${newval})`;
        informational_environment_reliability = newval;
    }

    let updateProviderTrust = val => {
        let newval = parseInt(val.value) / 10;
        document.getElementById("provider-trust-label").innerHTML = `Provider trust (${newval})`;
        provider_trust = newval;
    }

    let updateProductQuality = val => {
        new_product_quality = parseFloat(val.value);
        document.getElementById("new-product-quality-label").innerHTML = `New-product quality (${new_product_quality})`;
    }

    let updatePropHE = val => {
        proportion_highly_experienced = val.value;
        document.getElementById("prop-he-label").innerHTML = `Percentage highly experienced (${proportion_highly_experienced * 100}%)`;
    }

    let updatePropEA = val => {
        proportion_early_adopters = val.value;
        document.getElementById("prop-ea-label").innerHTML = `Percentage early adopters (${proportion_early_adopters * 100}%)`;
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
    document.getElementById("informational-environment-reliability").onchange = e => updateInformationalEnvironmentReliability(e.target);
    document.getElementById("provider-trust").onchange = e => updateProviderTrust(e.target);
    document.getElementById("new-product-quality").onchange = e => updateProductQuality(e.target);
    document.getElementById("prop-he").onchange = e => updatePropHE(e.target);
    document.getElementById("prop-ea").onchange = e => updatePropEA(e.target);

    document.getElementById("min-year-view").onchange = e => updateMinYearView(e.target);
    document.getElementById("max-year-view").onchange = e => updateMaxYearView(e.target);

    document.getElementById("high-sea-ice").onchange = e => {
        highSeaIce = e.target.checked;
    }

    highSeaIce = document.getElementById("high-sea-ice").checked;

    //Initialize the slider values
    updateReleaseYearDisplay(document.getElementById("release-year"));
    updateInformationalEnvironmentReliability(document.getElementById("informational-environment-reliability"));
    updateProviderTrust(document.getElementById("provider-trust"));
    updateProductQuality(document.getElementById("new-product-quality"));
    updatePropHE(document.getElementById("prop-he"));
    updatePropEA(document.getElementById("prop-ea"));
    updateMinYearView(document.getElementById("min-year-view"));
    updateMaxYearView(document.getElementById("max-year-view"));

})()