'use strict';

var fs = require('fs') ,
    path = require('path') ,
    readline = require('readline') ,
    request = require('request') ,
    moment  = require('moment-timezone') ,
    _ = require('lodash') ;

var locations = {};

var dataDirPath = path.normalize(path.join(__dirname, '../data')),
    logDate ,
    dataStream ;

var feedURLs = [
    'http://mars.availabs.org:16180/api/siri/vehicle-monitoring.json', 
    //'http://localhost:16181/api/siri/vehicle-monitoring.json/?VehicleMonitoringDetailLevel=calls', 
]; 


(function () {
    var curDate  = moment().format('YYYYMMDD') ,
        dataPath = path.join(dataDirPath, curDate + '.txt');

    fs.access(dataPath, fs.R_OK, function (err) {
        if (!err) {
            var lineReader = readline.createInterface({
                input: fs.createReadStream(dataPath),
            });

            lineReader.on('line', function (line) {
                console.log('Line from file:', line);
            });
        }
    });
}());

var timestampCounter = {};

function updateLocationsData (siriResponse, timestamp) {
    try {
        //var timestamp = siriResponse.Siri.ServiceDelivery.ResponseTimestamp,

        var msgDate = moment(timestamp).format('YYYYMMDD') ,

            vehicleActivity = siriResponse.Siri.ServiceDelivery.VehicleMonitoringDelivery[0].VehicleActivity,
 
            projection = vehicleActivity.reduce(function (acc, monitoredJourney) { 
                var journeyRef = monitoredJourney.MonitoredVehicleJourney
                                                 .FramedVehicleJourneyRef
                                                 .DatedVehicleJourneyRef,
                    lon        = monitoredJourney.MonitoredVehicleJourney.VehicleLocation.Longitude,
                    lat        = monitoredJourney.MonitoredVehicleJourney.VehicleLocation.Latitude,
                    route_id   = monitoredJourney.MonitoredVehicleJourney.LineRef;

                route_id = route_id && route_id.slice(4);

                if ( lon && lat ) {
                   acc[journeyRef] = {
                       lon      : lon,
                       lat      : lat,
                       route_id : route_id,
                   }; 
                }

               return acc;
            }, {}) ;


        if (!timestampCounter[timestamp]) {
            timestampCounter[timestamp] = 1; 
        } else {
            ++timestampCounter[timestamp];
        }

        locations[timestamp] = _.assign(locations[timestamp], projection);

console.log(JSON.stringify(locations, null, 5))

        if (msgDate !== logDate) {
            if (dataStream) { dataStream.end(); }

            dataStream = fs.createWriteStream(path.join(dataDirPath, msgDate + '.txt'), {'flags': 'a'});
        }

        if (timestampCounter[timestamp] === (feedURLs.length - 1)) {
            delete timestampCounter[timestamp];
            dataStream.write(JSON.stringify(_.pick(locations, timestamp) + '\n'));
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
            //console.log('got data',body);
            console.log('got data');

            try {
                updateLocationsData(JSON.parse(body), timestamp);
            } catch (e) {
                console.error('try update location error',e.stack);
fs.writeFileSync("wtf.json", body)
process.exit(1)
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

setInterval(requestSIRIData, 30000);

module.exports = {
    getLocations : getLocations ,    
};
