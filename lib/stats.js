var influx = require('influx');
var CONFIG = require('config');


var client = null;

if(CONFIG.stats.backend!='fake') {
    client = influx({
       host : CONFIG.stats.influx.host,
       port : CONFIG.stats.influx.port,
       username : CONFIG.stats.influx.username,
       password : CONFIG.stats.influx.password,
       database : CONFIG.stats.influx.database
       }
   );
}
else {
    client = {
        writeSeries: function(series,
                              options,
                              callback) { console.log('using fake');}
    };
}

/**
* Sends a statistic to InfluxDB on project_name series
*/
exports.send = function(project_name, stat_type, stat_value) {
  var series = {};
  series[project_name] = [];
  var point = {};
  point[stat_type] = stat_value;
  point.time = new Date();
  series[project_name].push(point);
  client.writeSeries(series, {},  function() {});
};

/**
* Send multiple points to project_name series to InfluxDB
*/
exports.sendPoints = function(project_name, points) {
  var series = {};
  series[project_name] = [];
  for(var i = 0; i < points.length; i++) {
    var point = points[i];
    point.time = new Date();
    series[project_name].push(point);
  }
  client.writeSeries(series, {},  function() {});
};
