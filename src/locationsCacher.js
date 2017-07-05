'use strict';

var fs = require('fs') ,
    path = require('path') ,
    readline = require('readline') ,
    request = require('request') ,
    moment  = require('moment-timezone') ,
    _ = require('lodash') ;


var feedURLs = require('../config/feedURLs')

var locations = {};
var bufferedLocations = null

var dataDirPath = path.normalize(path.join(__dirname, '../data')),
    logDate ,
    dataStream ;




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

        // Clean out expired locations data.
        var timestamps = Object.keys(locations);

        locations[timestamp] = _.merge(locations[timestamp], locations[timestamps[timestamps.length - 1]], projection);

        var now = moment();
        var expiredTimestamps = timestamps.filter(t => (moment(t).add(1, 'days').unix() < now.unix()));

        for (i = 0; i < expiredTimestamps.length; ++i) {
          delete locations[expiredTimestamps[i]];
        }

        process.nextTick(() => {
          bufferedLocations = new Buffer(JSON.stringify(locations), "utf-8")
        })
    } catch (e) {
        console.log(e.stack);
    }
} 



var latestTimestamp;

function requestSIRIData () {
    var thisTimestamp = latestTimestamp = moment().format(),
        i;

    function handler (error, response, body) {
        if (response.statusCode === 200) {
            try {
                updateLocationsData(JSON.parse(body), thisTimestamp);
            } catch (e) {
                console.error(e.stack);
            }
        } else {
          if (error) {
              console.error('request error',error);
          }
          
          // Retry, if not too late.
          if (thisTimestamp === latestTimestamp) {
            console.log('Retrying the Siri server');
            request(response.request.href, handler)
          }
        }
    }

    for ( i = 0; i < feedURLs.length; ++i ) {
        request(feedURLs[i], handler);
    }
}

function getLocations () {
    return bufferedLocations;
}

requestSIRIData()
setInterval(requestSIRIData, 30000);

module.exports = {
    getLocations : getLocations ,    
};
