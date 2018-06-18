let spanTS = document.querySelector("#timesync");
fetch("http://apicapteur.westeurope.cloudapp.azure.com:3000/time_now").then(res => res.json()).then(function (response) {
    spanTS.innerHTML = new moment(response.time_now).format("D/MM/YYYY HH:mm:s");
});
window.setInterval(function () {
    fetch("http://apicapteur.westeurope.cloudapp.azure.com:3000/time_now").then(res => res.json()).then(function (response) {
        spanTS.innerHTML = new moment(response.time_now).format("D/MM/YYYY HH:mm:s");
    });
}, 20000);