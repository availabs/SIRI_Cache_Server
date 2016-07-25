'use strict';

var fs = require('fs') ,
    path = require('path') ,
    readline = require('readline') ,
    request = require('request') ,
    moment  = require('moment-timezone') ,
    _ = require('lodash') ;


var config = require('../config/config')

var locations = {};

var dataDirPath = path.normalize(path.join(__dirname, '../data')),
    logDate ,
    dataStream ;

var feedURLs = config.feedURLs;



var timestampCounter = {};

function updateLocationsData (siriResponse, timestamp) {
    try {
        var msgDate = moment(timestamp).format('YYYYMMDD') ,

            vehicleActivity = siriResponse.Siri.ServiceDelivery.VehicleMonitoringDelivery[0].VehicleActivity,
 
            projection = vehicleActivity.reduce(function (acc, monitoredJourney) { 
                var journeyRef = monitoredJourney.MonitoredVehicleJourney
                                                 .FramedVehicleJourneyRef
                                                 .DatedVehicleJourneyRef,
                    lon        = monitoredJourney.MonitoredVehicleJourney.VehicleLocation.Longitude,
                    lat        = monitoredJourney.MonitoredVehicleJourney.VehicleLocation.Latitude,
                    route_id   = monitoredJourney.MonitoredVehicleJourney.LineRef;

                if ( lon && lat ) {
                   acc[journeyRef] = {
                       lon      : lon,
                       lat      : lat,
                       route_id : route_id,
                   }; 
                }

               return acc;
            }, {}) ,

            i;


        if (!timestampCounter[timestamp]) {
            timestampCounter[timestamp] = 1; 
        } else {
            ++timestampCounter[timestamp];
        }

        locations[timestamp] = _.assign(locations[timestamp], projection);

        // Clean out expired locations data.
        var timestamps = Object.keys(locations);

        var now = moment();
        var expiredTimestamps = timestamps.filter(t => (moment(t).add(1, 'days').unix() < now.unix()));

        for (i = 0; i < expiredTimestamps.length; ++i) {
          delete locations[expiredTimestamps[i]];
        }

        if (timestampCounter[timestamp] === (feedURLs.length - 1)) {
            console.log(timestamp);
            delete timestampCounter[timestamp];
        }

    } catch (e) {
        console.log(e.stack);
    }
} 



function requestSIRIData () {
    var timestamp = moment().format() ,
        i;


    function handler (error, response, body) {
        if (error) {
            console.error('request error',error);
        } else if (response.statusCode === 200) {
            try {
                updateLocationsData(JSON.parse(body), timestamp);
            } catch (e) {
                console.error(e.stack);
            }
        }
    }

    for ( i = 0; i < feedURLs.length; ++i ) {
        request(feedURLs[i], handler);
    }
}

function getLocations () {
    return locations;
}

requestSIRIData()
setInterval(requestSIRIData, 30000);

module.exports = {
    getLocations : getLocations ,    
};
