var influx = require('influx');
var CONFIG = require('config');

console.log("Usage: node tasks/sample_stats.js  fill/query");


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
                              callback) { console.log('using fake');},
        query: function(query, callback) { 
                    console.log('using fake'); callback([]);
                },
        query_last: function(query, callback) {
                    console.log('using fake'); callback([]);
                },
    };
}

/**
* Sends a statistic to InfluxDB on project_name series
*/
function send (project_name, stat_type, stat_value) {
  var series = {};
  series[project_name] = [];
  var point = {};
  point[stat_type] = stat_value;
  point.time = new Date();
  series[project_name].push(point);
  client.writeSeries(series, {},  function() {});
};


/**
* Time based query on project series
* project_name: name of the project
* duration: influxdb duration (1h, 2d, ...)
* group_by: influxdb duration grouping (1m, 1h, ...)
*/
function query(project_name, duration, group_by, callback) {
   var query = 'select sum(google),sum(image),max(quota) from '+project_name;
   query += ' group by time('+group_by+')';
   query += ' where time > now() - '+duration+';';

   client.query(query, callback);

}

function result(err, data) {
  if(data.length==0) { return; }
  for(i=0;i<data[0].points.length;i++) {
  console.log(data[0].points[i]);
  }
}

var interval = null;
var nbpoints = 0;
function fillpoints(project_name) {
    var rand = Math.floor((Math.random() * 10) + 1); 
    if(rand >= 5) {
    send(project_name, 'google', 1);
    }
    rand = Math.floor((Math.random() * 10) + 1);
    if(rand >= 5) {
    send(project_name, 'image', 1);
    }
    var quota = Math.floor((Math.random() * 10000) + 1000);
    send(project_name, 'quota', quota);
    nbpoints += 1;
    console.log('progress '+nbpoints+'/60');
    if(nbpoints>60) { clearInterval(interval); }
}

var args = process.argv.slice(2);
if(args.length>0 && args[0] == 'fill') {
    interval = setInterval(function() {fillpoints("where_is_genouest");},1000);
}
else {
    query('where_is_genouest','1h','1m', result);
}
