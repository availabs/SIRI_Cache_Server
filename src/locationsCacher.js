'use strict';

var request = require('request');

var locations = {};

function updateLocationsData (siriResponse) {
    try {
        var timestamp = siriResponse.Siri.ServiceDelivery.ResponseTimestamp,

            vehicleActivity = siriResponse.Siri.ServiceDelivery.VehicleMonitoringDelivery.VehicleActivity,

            projection = vehicleActivity.reduce(function (acc, monitoredJourney) {
                var vRef     = monitoredJourney.MonitoredVehicleJourney.VehicleRef,
                    lon      = monitoredJourney.MonitoredVehicleJourney.VehicleLocation.Longitude,
                    lat      = monitoredJourney.MonitoredVehicleJourney.VehicleLocation.Latitude,
                    route_id = monitoredJourney.MonitoredVehicleJourney.LineRef;

                route_id = route_id && route_id.slice(4);

                if ( lon && lat ) {
                   acc[vRef] = {
                       lon      : lon,
                       lat      : lat,
                       route_id : route_id,
                   }; 
                }

               return acc;
            }, {});

        locations[timestamp] = projection;

    } catch (e) {
        console.log(e.stack);
    }
} 

function requestSIRIData () {
    request('http://localhost:16180/vehicle-monitoring', function (error, response, body) {
        if (!error && response.statusCode === 200) {
            try {
                updateLocationsData(JSON.parse(body));
            } catch (e) {
                console.eror(e.stack);
            }
        }
    });
}

function getLocations () {
    return locations;
}

setInterval(requestSIRIData, 30000);

module.exports = {
    getLocations : getLocations ,    
};
