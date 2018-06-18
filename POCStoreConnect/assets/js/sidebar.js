let API_URL = "http://apicapteur.westeurope.cloudapp.azure.com:8080/SensorThingsService/v1.0/";
let API_OBSERVATIONS = API_URL + "Observations?$top=500000&$expand=Datastream";
let API_DATASTREAM = API_URL + "Datastreams([id])/Observations?$top=5000000&$orderby=phenomenonTime asc";
let API_SERVICE_URL = "http://api-service.westeurope.cloudapp.azure.com:8080/services-api/";
let API_SERVICE_LOGIN = API_SERVICE_URL + "connect/apiontologie.westeurope.cloudapp.azure.com/8890";
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


    // myHeaders.append('Access-Control-Allow-Origin', '*');
    // myHeaders.append('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    // myHeaders.append('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Auth-Token');

    let opt = {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors',
        cache: 'default'
    };
    let df = moment(dateFROM).add('2', 'hours').toISOString();
    let dt = moment(dateTO).add('2', 'hours').toISOString();
    let filter = "&$filter=during(%20phenomenonTime,%20" + df + "/" + dt + "%20)";
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

    //TODO: fetch API service
    //API SERVICE
    //1. se logger sur API_SERVICE_LOGIN
    //2. enregistrer l'id de session dans la variable sessionId
    //3.
    let options = {
        method: 'POST',
        headers: myHeaders,
        mode: 'cors',
        cache: 'default'
    };
    fetch(API_SERVICE_LOGIN, options).then(response => response.text()).then(function (response) {
        sessionId = response;
        console.log("Session id  : " + sessionId);

        //Creation du filtre de date pour les observations.
        // let endpointFilter = API_SERVICE_URL+sessionId+"/filters/dashboardFilter";
        // fetch(endpointFilter,options).then(function(response) {
        //     console.log(endpointFilter+"/date/bt/"+df+"000 00:00"+"/"+dt+"000 00:00");
        //     fetch(endpointFilter+"/date/bt/"+df+"000 00:00"+"/"+dt+"000 00:00", {method:"PUT",headers:myHeaders, mode:'cors',cache:"default"}).then(function(response) {
        let endpoint = API_SERVICE_URL + sessionId + "/observations";
        // let endpoint = API_SERVICE_URL + sessionId + "/observations/filter/dashboardFilter";
        fetch(endpoint, opt).then(res => res.json()).then(function (response) {
            obsByMotionSubject = [];
            let motionSubject;
            for (let obs of response.features) {
                let itemDate = moment(obs.properties.timeStamp.slice(0, -9)).add("2", "hours");
                if (itemDate.isBetween(df, dt)) {
                    motionSubject = obs.properties.motionSubject.split("/").pop();
                    if (!obsByMotionSubject.hasOwnProperty(motionSubject)) {
                        obsByMotionSubject[motionSubject] = [];
                    }
                    obsByMotionSubject[motionSubject].push(obs);
                }
            }
            if (!typeof obsByMotionSubject[motionSubject] == 'undefined' && obsByMotionSubject[motionSubject].length > 1) {
                obsByMotionSubject[motionSubject].sort(function (a, b) {
                    return moment(a.properties.timeStamp.slice(0, -9)).valueOf() - (moment(b.properties.timeStamp.slice(0, -9)).valueOf());
                });
            }
            createApiServiceMenu(obsByMotionSubject);
        });
        //     });
        // });

        // let endpoint = API_SERVICE_URL+sessionId+"/filters/dashboardFilter/date/bt/"+df+"/"+dt;


    }).catch(function (error) {

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
    console.log(items);
    let menu = document.querySelector("#apiservicemenu");
    let uls = [];
    let ul = document.createElement('ul');
    ul.setAttribute("class", "ul-subject");

    // items[Object.keys(items)[0]]
    for (let it of Object.keys(items)) {
        let li = document.createElement("li");
        first = true;
        let datetimeF;
        let datetimeT;
        items[it].sort(function(a, b) {
            return moment(a.properties.timeStamp.slice(0, -9)).valueOf() - (moment(b.properties.timeStamp.slice(0, -9)).valueOf());
        });
        for (let item of items[it]) {
            item.properties.locationbuilding = "1";
            item.properties.locationfloor = "" + item.properties.floor;
            let v1 = item.geometry.coordinates[0];
            item.geometry.coordinates[0] = item.geometry.coordinates[1];
            item.geometry.coordinates[1] = v1;

            if (first) {
                first = false;
                datetimeF = moment(item.properties.timeStamp.slice(0, -9));
                datetimeT = moment(item.properties.timeStamp.slice(0, -9));
            } else {
                let itemDate = moment(item.properties.timeStamp.slice(0, -9));
                if (itemDate.isBefore(datetimeF)) {
                    datetimeF = itemDate;
                }
                if (itemDate.isAfter(datetimeT)) {
                    datetimeT = itemDate;
                }
            }
        }

        datetimeF = datetimeF.add('2', 'hours').toISOString();
        datetimeT = datetimeT.add('2', 'hours').toISOString();


        let spanDS = document.createElement("span");
        spanDS.setAttribute("class", "ul-subject-title");
        spanDS.appendChild(document.createTextNode(it));

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
        // }
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

        let endpoint = API_DATASTREAM.replace("[id]", el.getAttribute("data-datastream-id"));
        let opt = {
            method: 'GET',
            headers: myHeaders,
            mode: 'cors',
            cache: 'default'
        };
        fetch(endpoint, opt).then(res => res.json()).then(function (response) {
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

            // console.log(JSON.stringify(geojson));
            drawTrajectoire(geojson);

        });
    } else {
        removeLayer(el.getAttribute("data-layer-id"));
    }
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
            geojson.features[i].properties.building = 1;
            i++;
        }

        // console.log(JSON.stringify(geojson));
        drawTrajectoire(geojson);
    } else {
        removeLayer(el.getAttribute("data-layer-id"));
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
