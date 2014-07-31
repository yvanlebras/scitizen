
/**
 * Module dependencies.
 */

var CONFIG = require('config');

var user = require('../routes/user'),
   project = require('../routes/project'),
   image = require('../routes/image'),
   mongo = require('mongodb'),
   monk = require('monk'),
   db = monk('localhost:27017/'+CONFIG.general.db),
   users = db.get('users'),
   projects = db.get('projects'),
   images = db.get('images'),
   tasks_db = db.get('tasks'),
   sciconfig = db.get('config'),
   path = require('path');


var pkgcloud = require('pkgcloud');

var gm = require('gm');
gm = gm.subClass({ imageMagick: true });

function image_resize(image, callback) {
 gm(image)
 .resize(600)
 .autoOrient()
 .write(writeStream, function (err) {
  if (!err) { callback(true); }
  else { callback(false); }
 });
}

var args = process.argv.slice(2);
console.log(args);

tasks_db.find({}, function(err, tasks) {
        console.log(tasks);
        process.exit(0);
});

