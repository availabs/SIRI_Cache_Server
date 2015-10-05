//$(function () {
    'use strict';

    /* globals $, L, mapbox_id, mapbox_accessToken */



    var centerCoords = [40.74, -73.9751];
    var map = L.map('map').setView(centerCoords, 13);
    var markers = new L.FeatureGroup();

    var allTripIDs,
        allRoutesIDs,

        locationData,

        timestamps,
        curTimestamp,

        selectedTrip  = null,
        selectedRoute = null,

        sliceStart,
        sliceEnd;

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


    (function retrieveLocations() {
        $.ajax({
            url: '/locations',
            success: function(data) {
               timestamps = Object.keys(data);
               curTimestamp = timestamps[0];
               locationData = data;
               setAllTripIDs();
               setAllRouteIDs();
               initSlider();
               initTextFields();
               showTrains();

            },
        });
    }());

    var sliderDiv = $('#slider-container');

    function setAllTripIDs () {
       var timeStamps = Object.keys(locationData),
           ids = {};

       for (var i=0; i < timeStamps.length; ++i) {
        var theseTripIDs = Object.keys(locationData[timeStamps[i]]); 
        for (var j=0; j < theseTripIDs.length; ++j) {
            ids[theseTripIDs[j]] = 1;
        }
       }

       allTripIDs = Object.keys(ids);

    }


    function setAllRouteIDs () {
        var timeStamps = Object.keys(locationData),
            theseTripIDs,
            locData,
            routeID,
            ids = {};

        for (var i=0; i < timeStamps.length; ++i) {
            locData = locationData[timeStamps[i]];

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
        var slider = $( "<div id='slider'></div>" ).appendTo( sliderDiv ).slider({
            min: 0,
            max: Object.keys(locationData).length - 1,
            //range: "min",
            value: 0,
            slide: function( event, ui ) {
                curTimestamp = timestamps[ui.value];
                showTrains();
            }
        });

        slider.css('background-color', 'red');
        slider.css('position', 'fixed');
        slider.css('bottom', '30px');
        slider.css('height', '15px');
        slider.css('width', '1000px');
        slider.css('left', '50px');
        slider.slider('value', 3);

    }


    function initTextFields () {
        $('#trip_id_field').attr('placeholder', 'trip_id');
        $('#route_id_field').attr('placeholder', 'route_id');
        $('#trips_slice_start').attr('placeholder', 0);
        $('#trips_slice_end').attr('placeholder', allTripIDs.length);
    }

    function clearTrains () {
        markers.clearLayers();
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

    function showTrains () {

        var snapshot = locationData[curTimestamp], 
            //trips    = Object.keys(snapshot).slice(25,40);
            trips    = selectedTrip ? [selectedTrip] : (snapshot && Object.keys(snapshot)),
            marker;


        if (selectedRoute) {
            trips = trips && trips.filter(function (trip) {
                return (snapshot[trip].route_id === selectedRoute);
            });
        }


        if (trips) {
            trips.sort();
        }


        if ( (! selectedTrip) && ((sliceStart !== null) || (sliceEnd !== null)) ) {
            trips = trips.slice(sliceStart, (sliceEnd !== null) ? sliceEnd : allTripIDs.length);
        }

        clearTrains();

        for (var i=0; i < trips.length; ++i) {
            console.log(snapshot[trips[i]].route_id);
            console.log(selectedRoute);

            marker = L.marker([parseFloat(snapshot[trips[i]].lat), parseFloat(snapshot[trips[i]].lon)]);

            marker.bindLabel(trips[i], { clickable: true, noHide: true });
            marker.on('click', tripMarkerClickHandler);

            markers.addLayer(marker);
            markers.addTo(map);
        }
    }

//});
