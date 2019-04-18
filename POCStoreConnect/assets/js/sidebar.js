let API_URL = "http://apicapteur.westeurope.cloudapp.azure.com:8080/SensorThingsService/v1.0/";
let API_OBSERVATIONS = API_URL + "Observations?$top=500000&$expand=Datastream";
let API_DATASTREAM = API_URL + "Datastreams([id])/Observations?$top=5000000&$orderby=phenomenonTime asc";
let API_SERVICE_URL = "http://api-service.westeurope.cloudapp.azure.com:8080/services-api/";
let sessionId = "";

let myHeaders = new Headers();
let dtFROM = document.querySelector("#dtFROM");
let dtTO = document.querySelector("#dtTO");

let loaderCapteur = document.querySelector(".loader-capteur");
let loaderService = document.querySelector(".loader-service");

let Observations = [];
let obsBySubject = [];
let obsByMotionSubject = [];

//DateTimePicker handling
$(function () {
    $('#datetimepickerFROM').datetimepicker({
        icons: {
            time: "fas fa-clock-o",
            date: "fas fa-calendar",
            up: "fas fa-arrow-up",
            down: "fas fa-arrow-down"
        },
        format: 'YYYY-MM-DDTHH:mm:ss'
    });
    $('#datetimepickerTO').datetimepicker({
        icons: {
            time: "fas fa-clock-o",
            date: "fas fa-calendar",
            up: "fas fa-arrow-up",
            down: "fas fa-arrow-down"
        },
        format: 'YYYY-MM-DDTHH:mm:ss',
        useCurrent: false //Important
    });

    // $("#datetimepickerFROM").on("change.datetimepicker", function (e) {
    //     $('#datetimepickerTO').datetimepicker(minDate, e.date);
    // });
    // $("#datetimepickerTO").on("change.datetimepicker", function (e) {
    //     $('#datetimepickerFROM').datetimepicker(maxDate, e.date);
    // });
});

$(function () {
    $("#loadMenu").on("click", function () {
        removeAllLayers();
        if (dtFROM.value !== "" && dtTO.value !== "") {
            loadMenu(dtFROM.value, dtTO.value);
        } else {
            alert('please select a date range first');
        }
    });
});

/**
 * Init function
 * 1. Fetch API_OBSERVATIONS.
 * 2. Filter by date
 * 3. Group by subject.
 * 4. Foreach subjects, retrieve datastream
 * 5. Foreach datastream, store corresponding endpoint.
 * @param dateFROM
 * @param dateTO
 */
function loadMenu(dateFROM, dateTO) {
    //resetting used colors
    colorFactory.reset();

    //empty already shown data
    document.querySelector("#apicapteurmenu").innerHTML = "";
    document.querySelector("#apiservicemenu").innerHTML = "";

    //toggle loaders
    toggleLoaderCapteur();
    toggleLoaderService();

    myHeaders.append('Content-Type', 'application/json');
    //myHeaders.append('Access-Control-Allow-Origin', '*');
    //myHeaders.append('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    //myHeaders.append('Access-Control-Allow-Headers', 'content-type');

    let opt = {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors',
        cache: 'default'
    };
    let df = moment(dateFROM).add('2', 'hours').toISOString();
    let dt = moment(dateTO).add('2', 'hours').toISOString();
    let filter = "&$filter=during(phenomenonTime," + df + "/" + dt + ")";

    fetch(API_OBSERVATIONS + filter, opt).then(res => res.json()).then(function (response) {
        Observations = [];
        obsBySubject = [];
        for (let item of response.value) {
            Observations.push(item);
        }

        //group by subject
        for (let item of Observations) {
            if (!obsBySubject.hasOwnProperty(item.result.subject.id)) {
                obsBySubject[item.result.subject.id] = [];
            }
            if (!obsBySubject[item.result.subject.id].hasOwnProperty(item.Datastream.name)) {
                obsBySubject[item.result.subject.id][item.Datastream.name] = [];
            }
            obsBySubject[item.result.subject.id][item.Datastream.name].push(item);

        }

        createApiCapteurMenu(obsBySubject);
    });


    //{
    //    "observations" : [{
    //        "timestamp": "2017-06-06T12:36:13 00:00",
    //        "store": {
    //            "id": "1234",
    //            "label": "The specific '1234' Store from within a move can be observed",
    //            "floor": 1
    //        }
    //    }, {
    //        "timestamp": "2017-06-06T12:36:13 00:00",
    //        "store": {
    //            "id": "1234",
    //            "label": "My Store",
    //            "floor": 1
    //        }
    //    }]
    //}

    // Get trajectories
    let endpoint = '/proxy.aspx?df=' + dtFROM.value + '&dt=' + dtTO.value;
    //endpoint = '/assets/mockservice.json?ts=' + new Date();
    fetch(endpoint).then(res => res.json()).then(function (response) {
        obsByMotionSubject = [];
        motionSubjects = [];
        for (let obs of response.observations) {
            if (obsByMotionSubject[obs.motionSubject] === undefined) {
                obsByMotionSubject[obs.motionSubject] = [];
                motionSubjects.push(obs.motionSubject);
            }
            obsByMotionSubject[obs.motionSubject].push(obs);
        }
        for (let motionSubject of motionSubjects) {
            obsByMotionSubject[motionSubject] = obsByMotionSubject[motionSubject].sort(function (a, b) {
                return a.timestamp > b.timestamp;
            });
        }
        console.log({ obsByMotionSubject: obsByMotionSubject });
        createApiServiceMenu(obsByMotionSubject);
    }).catch(function () {
        alert('Error while loading data from api service');
        toggleLoaderService();        
    });


}


/**
 * Buil API Capteur menu
 */
function createApiCapteurMenu(items) {
    let menu = document.querySelector("#apicapteurmenu");
    let uls = [];

    for (let item of Object.keys(items)) {
        let ul = document.createElement('ul');
        ul.setAttribute("class", "ul-subject");
        let p = document.createElement("p");
        p.setAttribute("class", "ul-subject-title");
        p.appendChild(document.createTextNode(item));
        ul.appendChild(p);

        for (let datastream of Object.keys(items[item])) {
            let li = document.createElement("li");

            let datetimeF = items[item][datastream][0].Datastream.phenomenonTime.split("/")[0];
            let datetimeT = items[item][datastream][0].Datastream.phenomenonTime.split("/")[1];

            let spanDS = document.createElement("span");
            spanDS.setAttribute("class", "li-ds");
            spanDS.appendChild(document.createTextNode(datastream));

            let spanDSDate = document.createElement("span");
            spanDSDate.setAttribute("class", "li-ds-date");
            spanDSDate.appendChild(document.createTextNode(" (" + datetimeF.substring(0, datetimeF.length - 8) + "/" + datetimeT.substring(0, datetimeT.length - 8) + ")"));

            let color = colorFactory.getRandomColor();
            if (typeof color == 'undefined') {
                color = "#000000";
            }
            let colorIcon = document.createElement("i");
            colorIcon.setAttribute("class", "fas fa-square-full float-right pr-5");
            colorIcon.style.color = color;

            let spanNBPoints = document.createElement("span");
            spanNBPoints.setAttribute("class", "li-ds-nbpoints");
            spanNBPoints.appendChild(document.createTextNode(" - " + items[item][datastream].length));

            li.appendChild(spanDS);
            li.appendChild(spanDSDate);
            li.appendChild(spanNBPoints);
            li.appendChild(colorIcon);

            li.setAttribute("data-color", color);
            li.setAttribute("data-datastream-id", items[item][datastream][0].Datastream["@iot.id"]);
            li.setAttribute("data-subject-id", item);
            li.setAttribute("data-layer-id", "geojson-data-" + randomId());
            li.style.cursor = "pointer";

            li.onclick = function () {
                apiCapteurMenuClick(li);
            };

            ul.appendChild(li);
        }

        uls.push(ul);
    }


    for (let ul of uls) {
        menu.appendChild(ul);
    }

    toggleLoaderCapteur();

}

function createApiServiceMenu(items) {
    let menu = document.querySelector("#apiservicemenu");
    let uls = [];
    let ul = document.createElement('ul');
    ul.setAttribute("class", "ul-subject");

    for (let it of Object.keys(items)) {
        let li = document.createElement("li");
        first = true;
        let datetimeF;
        let datetimeT;

        for (let item of items[it]) {
            let coords = item.coordinates;
            coords = coords.replace("POINT(", "").replace(")", "").split(" ");

            item.type = "Feature";
            item.properties = {
                locationbuilding: item.store.building + "",
                locationfloor: item.store.floor + "",
                timestamp: item.timestamp
            };
            item.geometry = {
                type: "Point",
                coordinates: [parseFloat(coords[1]), parseFloat(coords[0])]
            };

            if (first) {
                first = false;
                datetimeF = item.timestamp;
            } else {
                datetimeT = item.timestamp;
            }
        }

        let spanDS = document.createElement("span");
        spanDS.setAttribute("class", "ul-subject-title");
        spanDS.appendChild(document.createTextNode(it));

        let spanDSDate = document.createElement("span");
        spanDSDate.setAttribute("class", "li-ds-date");
        spanDSDate.appendChild(document.createTextNode(" (" + datetimeF + "/" + datetimeT + ")"));

        let color = colorFactory.getRandomColor();
        if (typeof color == 'undefined') {
            color = "#000000";
        }
        let colorIcon = document.createElement("i");
        colorIcon.setAttribute("class", "fas fa-square-full float-right pr-5");
        colorIcon.style.color = color;

        let spanNBPoints = document.createElement("span");
        spanNBPoints.setAttribute("class", "li-ds-nbpoints");
        spanNBPoints.appendChild(document.createTextNode(" - " + items[it].length));

        li.appendChild(spanDS);
        li.appendChild(spanDSDate);
        li.appendChild(spanNBPoints);
        li.appendChild(colorIcon);

        li.setAttribute("data-color", color);
        li.setAttribute("data-subject-id", it);
        li.setAttribute("data-layer-id", "geojson-data-" + randomId());
        li.setAttribute("data-geojson", JSON.stringify(items[it]));
        li.style.cursor = "pointer";

        li.onclick = function () {
            apiServiceMenuClick(li);
        };

        ul.appendChild(li);

    }

    uls.push(ul);
    for (let ul of uls) {
        menu.appendChild(ul);
    }

    toggleLoaderService();
}

/**
 * Handle click on api capteur item
 * Fetch corresponding datastream with observations
 * And pass it to map
 */
function apiCapteurMenuClick(el) {
    el.classList.toggle("active");

    if (el.classList.contains("active")) {

        let df = moment(dtFROM.value).add('2', 'hours').toISOString();
        let dt = moment(dtTO.value).add('2', 'hours').toISOString();
        let filter = "&$filter=during(%20phenomenonTime,%20" + df + "/" + dt + "%20)";

        let endpoint = API_DATASTREAM.replace("[id]", el.getAttribute("data-datastream-id"));
        let opt = {
            method: 'GET',
            headers: myHeaders,
            mode: 'cors',
            cache: 'default'
        };
        fetch(endpoint + filter, opt).then(res => res.json()).then(function (response) {
            let geojson = {};
            geojson.type = "FeatureCollection";
            geojson.color = el.getAttribute("data-color");
            geojson.datastreamId = el.getAttribute("data-datastream-id");
            geojson.subjectId = el.getAttribute("data-subject-id");
            geojson.layerid = el.getAttribute("data-layer-id");
            let data = [];
            for (let item of response.value) {
                //refilter by subject here for camera datastream
                if (item.result.subject.id === el.getAttribute("data-subject-id")) {
                    let location = item.result.location;
                    let v1 = location.geometry.coordinates[0];
                    location.geometry.coordinates[0] = location.geometry.coordinates[1];
                    location.geometry.coordinates[1] = v1;
                    location.properties.locationbuilding = "" + location.properties.building;
                    location.properties.locationfloor = "" + location.properties.floor;
                    data.push(location);
                }
            }
            geojson.features = data;

            let numberOfPoints = Object.keys(geojson.features).length;
            //Handle opacity.
            let i = 0;
            for (let point of geojson.features) {
                let opacity = (i + 1) / numberOfPoints;
                geojson.features[i].properties.opacity = parseFloat(opacity.toFixed(2));
                i++;
            }

            drawTrajectoire(geojson);

        });
    } else {
        removeLayer(el.getAttribute("data-layer-id"));
    }
}

function processPoints(points) {

    if (points.length > 0) {
        var coll = turf.featureCollection(points);
        let center = turf.center(coll);
        center.properties = points[0].properties;

        // Compute duration
        let duration = 0;
        let first = points[0].properties.timestamp;
        first = first.substring(0, first.length - 13);
        let last = points[points.length - 1].properties.timestamp;
        last = last.substring(0, last.length - 13);
        let mfirst = moment.utc(first);
        let mlast = moment.utc(last);
        duration = moment.duration(mlast.diff(mfirst)).asSeconds();
        //console.log({
        //    points: [
        //        points,
        //        first,
        //        last,
        //        duration
        //    ]
        //});
        center.properties.duration = duration;
        center.properties.radius = 3;

        if (duration > 0 && duration <= 10) {
            center.properties.radius = 5;
        }
        else if (duration > 10 && duration <= 30) {
            center.properties.radius = 10;
        }
        else if (duration > 30 && duration <= 60) {
            center.properties.radius = 15;
        }
        else if (duration > 60 && duration <= 300) {
            center.properties.radius = 25;
        }
        else if (duration > 300) {
            center.properties.radius = 40;
        }

        center.properties.radiusinner = center.properties.radius - 1;

        return center;
    }

    //if (points.length == 1) { // Point
    //    return points[0];
    //}
    //else if (points.length == 2) { // Mid point
    //    let midpoint = turf.midpoint(points[0], points[1]);
    //    midpoint.properties = points[0].properties;
    //    return midpoint;
    //}
    //else if (points.length > 2) { // Convex hull
    //    var coll = turf.featureCollection(points);
    //    let convex = turf.convex(coll);
    //    convex.properties = points[0].properties;
    //    return convex;
    //}
}

/**
 * Handle click on api service item
 * Fetch corresponding geojson
 * And pass it to map
 */
function apiServiceMenuClick(el) {
    el.classList.toggle("active");

    if (el.classList.contains("active")) {
        let geojson = {};
        geojson.type = "FeatureCollection";
        geojson.features = JSON.parse(el.getAttribute("data-geojson"));
        geojson.color = el.getAttribute("data-color");
        geojson.subjectId = el.getAttribute("data-subject-id");
        geojson.layerid = el.getAttribute("data-layer-id");

        let numberOfPoints = Object.keys(geojson.features).length;
        //Handle opacity.
        let i = 0;
        for (let point of geojson.features) {
            let opacity = (i + 1) / numberOfPoints;
            geojson.features[i].properties.opacity = parseFloat(opacity.toFixed(2));
            i++;
        }

        // Draw trajectory
        drawTrajectoire(geojson);

        // Calculate stop points
        let stops = {
            type: "FeatureCollection",
            features: [],
            color: geojson.color,
            layerid: geojson.layerid + "-stops"
        };
        let points = [];
        for (let point of geojson.features) {

            // Add stoppings to temp array
            if (point.motionState == 'Stopping') {
                points.push(turf.point(point.geometry.coordinates, point.properties));
            }
            else {
                // Process temp array
                if (points.length > 0) {
                    stops.features.push(processPoints(points));
                    points = [];
                }
            }
        }

        // Compute last points if any
        if (points.length > 0) {
            stops.features.push(processPoints(points));
        }

        drawStops(stops);

        console.log({ stops: stops });

    } else {
        removeLayer(el.getAttribute("data-layer-id"));
        removeLayer(el.getAttribute("data-layer-id") + "-stops-points");
        removeLayer(el.getAttribute("data-layer-id") + "-stops-points-inner");
        removeLayer(el.getAttribute("data-layer-id") + "-stops-points-text");
    }
}


/**
 * Loader visibility
 */
function toggleLoaderCapteur() {
    $('.loader-capteur').toggle();
}

function toggleLoaderService() {
    $('.loader-service').toggle();
}

/**
 * Get RandomColor
 */
let colorFactory = (function () {
    let allColors = ["#000080", "#008000", "#00BFFF", "#00FF00", "#708090",
        "#7B68EE", "#800000", "#9400D3", "#A9A9A9", "#D2691E", "#DC143C",
        "#DAA520", "#DEB887", "#DB7093", "#E0FFFF", "#E6E6FA", "#F4A460",
        "#FF00FF", "#FF1493", "#FF69B4", "#FF6347", "#FFA500", "#B22222", "#B8860B",
        "#BC8F8F", "#C0C0C0", "#BDB76B", "#CD853F", "#C71585", "#9932CC", "#8B0000"];
    let colorsLeft = allColors.slice(0);

    return {
        getRandomColor: function () {
            if (colorsLeft.length === 0) {
                this.reset();
            }

            // let index = Math.floor(Math.random() * colorsLeft.length);
            let index = colorsLeft.length - (colorsLeft.length - 1);
            let color = colorsLeft[index];
            colorsLeft.splice(index, 1);
            return color;
        },
        reset: function () {
            colorsLeft = allColors.slice(0);
        }
    };
}());

/**
 * Generate random id
 */
function randomId() {
    return 'xxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString();
    });
}
