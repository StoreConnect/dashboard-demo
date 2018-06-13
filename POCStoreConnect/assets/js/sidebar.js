let API_URL = "http://apicapteur.westeurope.cloudapp.azure.com:8080/SensorThingsService/v1.0/";
let API_OBSERVATIONS = API_URL + "Observations?$top=500000&$expand=Datastream";
let API_DATASTREAM = API_URL + "Datastreams([id])/Observations?$top=5000000&$orderby=phenomenonTime asc";
let myHeaders = new Headers();
let dtFROM = document.querySelector("#dtFROM");
let dtTO = document.querySelector("#dtTO");

let loaderCapteur = document.querySelector(".loader-capteur");
let loaderService = document.querySelector(".loader-service");

let Observations = [];
let obsBySubject = [];

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

    $("#datetimepickerFROM").on("dp.change", function (e) {
        $('#datetimepickerTO').data("DateTimePicker").minDate(e.date);
    });
    $("#datetimepickerTO").on("dp.change", function (e) {
        $('#datetimepickerFROM').data("DateTimePicker").maxDate(e.date);
    });
});

$(function () {
    $("#loadMenu").on("click", function () {
        if (dtFROM.value != "" && dtTO.value != "") {
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
    document.querySelector("#apicapteurservice").innerHTML = "";

    //toggle loaders
    toggleLoaderCapteur();
    toggleLoaderService();


    myHeaders.append('Access-Control-Allow-Origin', '*');
    myHeaders.append('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    myHeaders.append('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Auth-Token');

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
            console.log(items[item][datastream][0].Datastream.phenomenonTime);
            let li = document.createElement("li");

            let datetimeF = items[item][datastream][0].Datastream.phenomenonTime.split("/")[0];
            let datetimeT = items[item][datastream][0].Datastream.phenomenonTime.split("/")[1];

            let spanDS = document.createElement("span");
            spanDS.setAttribute("class", "li-ds");
            spanDS.appendChild(document.createTextNode(datastream));

            let spanDSDate = document.createElement("span");
            spanDSDate.setAttribute("class", "li-ds-date");
            spanDSDate.appendChild(document.createTextNode(" (" + datetimeF.substring(0, datetimeF.length - 8) + "-" + datetimeT.substring(0, datetimeT.length - 8) + ")"));

            let color = colorFactory.getRandomColor();
            let colorIcon = document.createElement("i");
            colorIcon.setAttribute("class", "fas fa-square-full float-right pr-5");
            colorIcon.style.color = color;

            li.appendChild(spanDS);
            li.appendChild(spanDSDate);
            li.appendChild(colorIcon);

            li.setAttribute("data-color", color);
            li.setAttribute("data-datastream-id", items[item][datastream][0].Datastream["@iot.id"]);
            li.setAttribute("data-subject-id", item);
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


/**
 * Handle click on api capteur item
 * Fetch corresponding datastream with observations
 * And pass it to map
 */
function apiCapteurMenuClick(el) {
    el.classList.toggle("active");
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
        let data = [];
        for (let item of response.value) {
            //refilter by subject here for camera datastream
            if (item.result.subject.id === el.getAttribute("data-subject-id")) {
                let location = item.result.location;
                data.push(location);
            }
        }
        geojson.features = data;

        let numberOfPoints = Object.keys(geojson.features).length;

        //Handle opacity.
        let i = 0;
        for (let point of geojson.features) {
            let opacity = (i + 1) / numberOfPoints;
            geojson.features[i].properties.opacity = opacity.toFixed(2);
            i++;
        }

        console.log(JSON.stringify(geojson));
        //TODO: here pass to map


    });
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
