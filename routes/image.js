var url = require('url');
var util = require('util');
var path = require('path');
var fs = require('fs');
var formidable = require('formidable');
var pkgcloud = require('pkgcloud');
var scitizen_storage = require('scitizen-storage');
var scitizen_auth = require('../lib/auth.js');


var MongoClient = require('mongodb').MongoClient;

var CONFIG = require('config');

var monk = require('monk'),
   db = monk('localhost:27017/'+CONFIG.general.db),
   users_db = db.get('users'),
   projects_db = db.get('projects'),
   images_db = db.get('images');


scitizen_storage.configure(CONFIG.general.storage, CONFIG.storage);

/**
* Serve image to client
*
* image: image object returned by get method
*/
function serve_image(image, req, res) {
    fs.readFile(CONFIG.storage.path+ '/' +image.path, function(error, content) {
        if (error) {
            console.log(error);
            res.writeHead(500);
            res.end();
        }
        else {
            res.writeHead(200, { 'Content-Type': image.contentType});
            res.end(content, 'utf-8');
        }
    });
}

/**
* Askimet integration, validates if spam or not
*
*/
exports.control = function(req, res) {
  var image_id= req.param('id');
  images_db.findOne({_id:image_id}, function(err, image) {
    var image_text = '';
    if(! err) {
      for(var elt in image.fields) {
        if(elt=='loc') { continue; }
        if(Array.isArray(image.fields.elt)) {
          for(var i=0;i<image.fields.elt.length;i++) {
            image_text += '<div>'+elt+':'+image.fields.elt[i]+'</div>';
          }
        }
        else {
          image_text += '<div>'+elt+':'+image.fields[elt]+'</div>';
        }
      }
    }
    res.render('image',{image_text: image_text});
  });
};

exports.validate = function(req, res) {
  var image_id= req.param('id');
  images_db.findOne({_id:image_id}, function(err, image) {
      if(err) {res.status(503).send('Not authorized'); return; }
      projects_db.findOne({_id: image.project}, function(err, project) {
        if(err) {res.status(503).send('Not authorized'); return; }
        if(scitizen_auth.can_edit(req.user, project, req.param('api'))) {
          images_db.update({_id:image_id},
                            { $set: {validated: true}},
                            function(err){}
                          );
          res.json({});
        }
        else { res.status(503).send('Not authorized'); }
      });
  });
};

/**
* Curation by users
*
*/
exports.curate = function(req, res) {
    var image_id= req.param('id');
    images_db.findOne({_id:image_id}, function(err, image) {
        if(err) {res.status(503).send('Not authorized'); return; }
        projects_db.findOne({_id: image.project}, function(err, project) {
            if(err) {res.status(503).send('Not authorized'); return; }
            if(scitizen_storage.can_add(req.user, project, req.param('api'))) {
              if(req.param('spam')==1) {
                images_db.update({_id: image_id},
                                  {$inc: {'stats.vote': 1,
                                          'stats.spam': 1
                                          }
                                  },
                                  function(err) {
                                      res.json({});
                                  });
              }
              else {
                var forms = req.param('form_elts').split(',');
                var stats = { 'stats.vote': 1};
                for(var i =0;i<forms.length;i++) {
                  var param = req.param(forms[i]);
                  if(param instanceof Array) {
                    for(var j=0;j<param.length;j++) {
                      stats['stats.' + forms[i] + '.' + param[j]] = 1;
                    }
                  }
                  else {
                    stats['stats.' + forms[i] + '.' + param] = 1;
                  }
                }
                var to_update = { $inc : stats };
                images_db.update({_id: image_id}, to_update, function(err) {
                  if(err) { console.log(err); }
                  res.json({});
                });
              }
            }
            else { res.status(503).send('Not authorized'); }
        });
    });
};

exports.delete = function(req, res) {
    var image_id= req.param('id');
    images_db.findOne({_id:image_id}, function(err, image) {
        if(err) {res.status(503).send('Not authorized'); return; }
        projects_db.findOne({_id: image.project}, function(err, project) {
            if(err) {res.status(503).send('Not authorized'); return; }
            if(scitizen_storage.can_edit(req.user, project, req.param('api'))) {
                scitizen_storage.delete(image_id, function(err,res) {
                if(err>0) {
                    console.log('Failed to delete '+image_id+' from storage');
                }
                images_db.remove({_id: image_id}, function(err) {
                  if(err) { console.log(err); }
                  projects_db.update({_id: image.project},
                                    {$inc: {'stats.quota': (image.size*-1)}},
                                    function(err){});

                  });
                  res.json({_id: image_id});
                });
            }
            else { res.status(503).send('Not authorized'); }
        });
    });
};

exports.get = function(req, res) {
  var image_id= req.param('id');
  if(image_id===0) {
    res.status(404).send('Image not found');
    return;
  }

  images_db.findOne({ _id: images_db.id(image_id) }, function(err, image) {
    scitizen_storage.get(image_id, function(err, result) {
      if(err>0) {
        res.status(err).send('Could not retreive image');
      }
      else {
        serve_image(result, req, res);
      }
    });
  });
};

exports.list = function(req, res) {
    projects_db.findOne({ _id: req.param('id') }, function(err, project) {
        console.log("list images");
        if(scitizen_auth.can_read(req.user, project, req.param('api'))) {
            var filter = { project: images_db.id(req.param('id')) };
            console.log("filter ");
            // If not a project member, show only validated images
            if(! req.user || project.users.indexOf(req.user.username)==1) {
                filter.validated = true;
                filter.need_spam_control = false;
            }
            images_db.find(filter, function(err, images) {
                res.json(images);
            });
        }
        else {
            res.status(503).send('You\'re not allowed to access this project');
        }

    });
};
