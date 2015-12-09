'use strict';

var express = require('express');
var app = express();

var locationsCacher = require('./src/locationsCacher');

app.get('/locations', function (req, res) {
  res.send(locationsCacher.getLocations());
});

app.use('/', express.static('public'));

var server = app.listen('11939', function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
