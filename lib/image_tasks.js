/*jshint -W083 */
var CONFIG = require('config');

var fs = require('fs');

var user = require('../routes/user'),
   project = require('../routes/project'),
   image = require('../routes/image');

var mongo = require('mongodb'),
   monk = require('monk'),
   db = monk(CONFIG.mongo.host+':'+CONFIG.mongo.port+'/'+CONFIG.general.db),
   tasks_db = db.get('tasks'),
   users_db = db.get('users'),
   projects_db = db.get('projects'),
   images_db = db.get('images'),
   tasks_db = db.get('tasks'),
   sciconfig = db.get('config'),
   path = require('path');

var scitizen_storage = require('scitizen-storage');

var pkgcloud = require('pkgcloud');

var gm = require('gm');
gm = gm.subClass({ imageMagick: true });

var nbElts = 0;
var nbCount = 0;
var status = 0;
var interval = null;

function deleteAll(project_id, callback) {
  console.log(nbCount +'/' +nbElts*2);
  if(nbCount == nbElts*2) {
    clearInterval(interval);
    images_db.remove({project: project_id}, function(err){
      callback(status);
    });
  }
}

exports.delete = function(project_id, callback) {
  images_db.find({project: project_id}, function(err, images){
    console.log(images);
    if(err) {
      callback(500);
      return;
    }
    if(images.length === 0) {
      callback(0);
      return;
    }
    status = 0;
    nbCount = 0;
    nbElts = images.length;
    for(i=0;i<images.length;i++){
      (function(ic) {
        var image_id = images[ic]._id;
        console.log('delete '+image_id);
        scitizen_storage.delete(image_id.toHexString(),
          function(err, result) {
            if(err>0){
              status = 500;
              console.log('could not delete image '+image_id);
            }
            nbCount++;
          });
        scitizen_storage.delete('tiny-'+image_id.toHexString(),
          function(err, result) {
            if(err>0){
              status = 500;
              console.log('could not delete tiny image '+image_id);
            }
            nbCount++;
          });
    })(i);
    }
    interval = setInterval(function() {deleteAll(project_id, callback);},2000);

  });
};


exports.rescale = function(image_id, callback) {
  scitizen_storage.get(image_id, function(err, result) {
      if(err>0) {
          console.log('Could not retreive image ' + image_id);
          callback(500);
          return;
      }
      else {
          var image_path = CONFIG.storage.path + '/' +result.path;
          var image_tiny_name = 'tiny-' + path.basename(image_path);
          var image_tiny_path = path.dirname(image_path) + '/';
          image_tiny_path += image_tiny_name + 'tmp';
          var fstream = fs.createReadStream(image_path);
          var pipestream = fstream.pipe(fs.createWriteStream(image_tiny_path));
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
              scitizen_storage.put(image_tiny_name,
                                  image_tiny_path,
                                  {},
                                  function(code,img){
                                      if(code!==0) {
                                        callback(500);
                                        return;
                                      }
                                      else {
                                        callback(0);
                                      }
                                      // Set image as ready now
                                      images_db.update({ _id: image_id },
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

};
