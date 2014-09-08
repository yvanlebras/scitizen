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


/**
* Time based query on project series
* project_name: name of the project
* duration: influxdb duration (1h, 2d, ...)
* group_by: influxdb duration grouping (1m, 1h, ...)
*/
exports.query = function(project_name, duration, group_by, callback) {
   var previous = 'select sum(google),sum(image) from '+project_name;
   previous += ' where time < now() - '+duration+';';
   
   var query = 'select sum(google),sum(image),max(quota) from '+project_name;
   query += ' group by time('+group_by+')';
   query += ' where time > now() - '+duration+';';

   client.query(previous, function(err, prev_data) {
         if(err) { callback(err); }
         else {
         client.query(query, function(err, data) {
                   if(err) { callback(err); }
                   else {
                   var new_data = data;
                   if(prev_data.length>0) {
                     // Add previous data
                     var point = new_data.points.length-1;
                     new_data[0].points[point][1] += prev_data[0].points[0][1];
                     new_data[0].points[point][2] += prev_data[0].points[0][2];
                   }
                   // now aggregate data
                   for(i=new_data[0].points.length-2;i>=0;i--) {
                      new_data[0].points[i][1]+= new_data[0].points[i+1][1];
                      new_data[0].points[i][2]+= new_data[0].points[i+1][2];
                   }
                   callback(err, new_data);
                   }
         });
         }
   });
};
