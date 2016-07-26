# SIRI_Cache_Server

This project provides a Node server that will visualize the locations ov vehicles in a Siri 
feed. It keeps the locations data for the past 24 hours.

### Pointing this server at a feed.
+ You can add multiple feeds to the  [`config/feedURLs.js`](https://github.com/availabs/SIRI_Cache_Server/blob/master/config/feedURLs.js) configuration file.

### MapBox auth.
+ Fill in your id and authToken in [`public/mapbox_auth.js`](https://github.com/availabs/SIRI_Cache_Server/blob/master/public/mapbox_auth.js)

###Deployment
+ `npm install`
+ `npm start`
