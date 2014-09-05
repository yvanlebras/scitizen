/**
 * Module dependencies.
 */

var CONFIG = require('config');

var fs = require('fs');
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

var scitizen_storage = require('scitizen-storage');

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

var counter = 0;
var nbTasks = -1;
var interval = null;

tasks_db.find({}, function(err, tasks) {
   nbTasks = tasks.length;
   for(i=0;i<tasks.length;i++) {
     var task = tasks[i];
     if(task.type == 'rescale') {
        scitizen_storage.get(task.objectid, function(err, result) {
            if(err>0) {
                console.log('Could not retreive image');
                counter += 1;
                tasks_db.remove({_id: task._id});
            }
            else {
                var image_path = CONFIG.storage.path+ '/' +result.path;
                var image_tiny_name = 'tiny-'+path.basename(image_path);
                var image_tiny_path = path.dirname(image_path)+'/'+image_tiny_name+'tmp';
                console.log("manage "+image_path);
                var pipestream = fs.createReadStream(image_path).pipe(fs.createWriteStream(image_tiny_path));
                pipestream.on('finish', function() {
                gm(image_tiny_path).size(function(err, value){
                    if(value.width>640 || value.height>480) {
                        if(value.width>=value.height) {
                          gm(image_tiny_path).resize(640);
                        }
                        else {
                          gm(image_tiny_path).resize(null,480);
                        }
                    }
                    console.log("image resized");
                    scitizen_storage.put(image_tiny_name,
                                        image_tiny_path,
                                        {},
                                        function(code,img){
                                            if(code==0) {
                                            tasks_db.remove({_id: task._id}, function() { counter += 1;});
                                            }
                                            else {
                                            counter += 1;
                                            console.log("Task error: "+task._id);
                                            }
                                            // Set image as ready now
                                            images_db.update({ _id: task.objectid },
                                                                {$set: {ready: true}},
                                                                function(err) {
                                                                  if(err) {
                                                                    console.log(err);
                                                                  }
                                                                });
                                            });
                });
                }); // pipe
            }
        });
     }
   }
});

function checkIsOver() {
  console.log("Checking progress... "+counter+"/"+nbTasks);
  if(nbTasks>-1 && counter == nbTasks) { 
    clearInterval(interval);
    process.exit(0);
  }
}

interval = setInterval(function() {checkIsOver();},2000);
