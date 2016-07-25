# SIRI_Cache_Server

This project provides a Node server that will visualize the locations ov vehicles in a Siri 
feed. It keeps the locations data for the past 24 hours.

### Pointing this server at a feed.
+ You can add multiple feeds to the feedURLs property in `config/config.js`

### MapBox auth.
+ `cp public/mapbox_auth.js.template public/mapbox_auth.js`
+ Fill in your id and authToken.

###Deployment
+ `npm install`
+ npm start
