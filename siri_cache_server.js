'use strict';

var express = require('express');
var app = express();

var locationsCacher = require('./src/locationsCacher');

app.get('/locations', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.write(locationsCacher.getLocations());
  res.end();
});

app.get('/latest', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.write(locationsCacher.getLatest());
  res.end();
});

app.use('/', express.static('public'));

var server = app.listen('10203', function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
