$(function () {
    'use strict';

    /* globals _, $, L, mapbox_id, mapbox_accessToken */

    var latestReqCounter = 0

    var centerCoords = [40.74, -73.9751];
    var map = L.map('map').setView(centerCoords, 13);
    var markers = new L.FeatureGroup();

    var allTripIDs,
        allRoutesIDs,

        locationData,

        allTimestamps,
        curTimestamp,

        selectedTrip  = null,
        selectedRoute = null,

        sliceStart,
        sliceEnd,

        slider;

    var isInMonitorMode = true;

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        maxZoom: 18,
        id: mapbox_id,
        accessToken: mapbox_accessToken,
    }).addTo(map);


    $('#filter_trip_btn').click(selectTrip);
    $('#clear_trip_btn').click(deselectTrip);
    $('#filter_route_btn').click(selectRoute);
    $('#clear_route_btn').click(deselectRoute);
    $('#slice_btn').click(setSliceValues);
    $('#clear_slice_btn').click(clearSliceValues);


    // Should only be called once.
    function retrieveAllLocations() {
        var tag = 'retrieveAllLocations'
        console.time(tag)
        $.ajax({
            url: '/locations',
            success: function(data) {
               console.timeEnd(tag)
               var timestamps = Object.keys(data).sort().reverse();
               var ts
               var i

               locationData = locationData || {}

               for (i = 0; i < timestamps.length; ++i) {
                 ts = timestamps[i]
                 locationData[ts] = data[ts]
                 data[ts] = null  // give GC the heads up
               }

               allTimestamps = Object.keys(locationData).sort()

               if (isInMonitorMode) {
                 curTimestamp = allTimestamps[allTimestamps.length - 1]
               }

               setTimeout(function () {
                 setAllTripIDs();
                 setAllRouteIDs();
                 initSlider();
                 initTextFields();
                 showTrains();
               }, 0)
            },
        });
    };

    function retrieveLatestLocations () {
      var tag = ++latestReqCounter + ': retrieveLatestLocations'
      console.time(tag)

      $.ajax({
        url: '/latest',
        success: function(data) {
          console.timeEnd(tag)
          var latestTimestamps = Object.keys(data).sort().reverse()
          var i

          locationData = locationData || {}

          for (i = 0; i < latestTimestamps.length; ++i) {
            var ts = latestTimestamps[i]
            locationData[ts] = data[ts]
            data[ts] = null  // give GC the heads up
          }

          allTimestamps = Object.keys(locationData).sort()

          if (isInMonitorMode) {
            curTimestamp = allTimestamps[allTimestamps.length - 1]
          }

          setTimeout(function () {
            setAllTripIDs();
            setAllRouteIDs();
            initSlider();
            initTextFields();
            showTrains();
          }, 0)
        }
      });
    }

    var sliderDiv = $('#slider-container');

    function setAllTripIDs () {
       var timestamps = Object.keys(locationData),
           ids = {};

       for (var i=0; i < timestamps.length; ++i) {
        var theseTripIDs = Object.keys(locationData[timestamps[i]]); 
        for (var j=0; j < theseTripIDs.length; ++j) {
            ids[theseTripIDs[j]] = 1;
        }
       }

       allTripIDs = Object.keys(ids);

    }


    function setAllRouteIDs () {
        var timestamps = Object.keys(locationData),
            theseTripIDs,
            locData,
            routeID,
            ids = {};

        for (var i=0; i < timestamps.length; ++i) {
            locData = locationData[timestamps[i]];

            theseTripIDs = Object.keys(locData); 

        for (var j=0; j < theseTripIDs.length; ++j) {
            routeID = locData[theseTripIDs[j]].route_id;
            ids[routeID] = 1;
        }
       }

       allRoutesIDs = Object.keys(ids);
    }


    function selectTrip () {
        selectedTrip = $.trim($('#trip_id_field').val());
        showTrains();
    }
    function deselectTrip () {
        selectedTrip = null;
        $('#trip_id_field').val('');
        showTrains();
    }

    function selectRoute () {
        selectedRoute = $.trim($('#route_id_field').val());
        showTrains();
    }
    function deselectRoute () {
        selectedRoute = null;
        $('#route_id_field').val('');
        showTrains();
    }

    function setSliceValues () {
        sliceStart = $('#trips_slice_start').val() || 0;
        sliceEnd = $('#trips_slice_end').val() || allTripIDs.length;
        showTrains();
    }
    function clearSliceValues () {
        sliceStart = null;
        sliceEnd = null;

        $('#trips_slice_start').val('');
        $('#trips_slice_end').val('');
        showTrains();
    }



    function initSlider () {
        if (!slider) {

            slider = $( "<div id='slider'></div>" ).appendTo( sliderDiv ).slider({
                min: 0,
                slide: function( event, ui ) {
                    curTimestamp = allTimestamps[ui.value];
                    isInMonitorMode = (curTimestamp === allTimestamps[allTimestamps.length - 1])
                    showTrains();
                }
            });

            slider.css('position', 'fixed');
            slider.css('bottom', '30px');
            slider.css('height', '15px');
            slider.css('width', '1000px');
            slider.css('left', '50px');
        }

        slider.slider("option", "max", Object.keys(locationData).length - 1);
        slider.slider('value', allTimestamps.findIndex(function (t) { return t === curTimestamp; }));
    }


    function initTextFields () {
        $('#trip_id_field').attr('placeholder', 'trip_id');
        $('#route_id_field').attr('placeholder', 'route_id');
        $('#trips_slice_start').attr('placeholder', 0);
        $('#trips_slice_end').attr('placeholder', allTripIDs.length);
    }


    function tripMarkerClickHandler () {
        /* jshint validthis: true */
        if ( ! selectedTrip ) {
            $('#trip_id_field').val(this.getLabel()._content); 
        } else {
            $('#trip_id_field').val(''); 
        }
        selectTrip();
    }

    
    var markerIndex;

    function showTrains () {

        var snapshot = locationData[curTimestamp] , 
            trips    = selectedTrip ? [selectedTrip] : (snapshot && Object.keys(snapshot)) ,
            existingMarkerIds = _.keys(markerIndex) ,
            newMarkerIndex = {},
            marker ;

        var toUpdate,
            toRemove,
            toInsert;

        $("#clock").text(curTimestamp);


        if (selectedRoute) {
            var tripsForRoute = trips && trips.filter(function (trip) {
                return (snapshot[trip].route_id === selectedRoute);
            });

            trips = tripsForRoute
        }

        if ( (! selectedTrip) && ((sliceStart !== null) || (sliceEnd !== null)) ) {
            trips = (trips || []).slice(sliceStart, (sliceEnd !== null) ? sliceEnd : allTripIDs.length);
        }

        toUpdate = _.intersection(existingMarkerIds, trips),
        toRemove = _.difference(existingMarkerIds, trips),
        toInsert = _.difference(trips, existingMarkerIds);

        var tripId,
            latLng,
            i;



        for ( i = 0; i < toRemove.length; ++i ) {
            tripId = toRemove[i];
            map.removeLayer(markerIndex[tripId]);
        }
        
        for ( i = 0; i < toUpdate.length; ++i ) {
            tripId = toUpdate[i];
            latLng = L.latLng(snapshot[tripId].lat, snapshot[tripId].lon);
            markerIndex[tripId].setLatLng(latLng);
            newMarkerIndex[tripId] = markerIndex[tripId];
        }
        
        for ( i = 0; i < toInsert.length; ++i) {
            tripId = toInsert[i];
            latLng = L.latLng(snapshot[tripId].lat, snapshot[tripId].lon);

            marker = new L.marker(latLng);

            marker.bindLabel(toInsert[i], { clickable: true, noHide: false });

            marker.on('click', tripMarkerClickHandler);

            markers.addLayer(marker);
            markers.addTo(map);
            newMarkerIndex[tripId] = marker;
        }

        markerIndex = newMarkerIndex;
    }

  // Set it off
  retrieveLatestLocations()
  retrieveAllLocations()
  setInterval(retrieveLatestLocations, 15000)

});
