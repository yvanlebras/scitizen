var url = require("url");
var util = require('util');
var path = require("path");
var fs = require("fs");
var formidable = require("formidable");
var pkgcloud = require("pkgcloud");
var scitizen_storage = require("scitizen-storage");

var MongoClient = require('mongodb').MongoClient;

var monk = require('monk')
  , db = monk('localhost:27017/scitizen')
  , users_db = db.get('users')
  , projects_db = db.get('projects')
  , images_db = db.get('images');

var CONFIG = require('config');

scitizen_storage.configure(CONFIG.general.storage, CONFIG.storage);

var LRU = require("lru-cache")
  , options = { max: 100
              , length: function (n) { return n.size/1048576; }
              , dispose: function (key, n) {
                fs.exists(CONFIG.dir + '/' + n.name, function(exists) {
                    if(exists) {
                        fs.unlink(CONFIG.dir + '/' + n.name);
                    }
                });
              }
              , maxAge: 1000 * 60 * 60 }
  , cache = LRU(options)
  , otherCache = LRU(50) // sets just the max size


/**
* Serve image to client
*
* image: image object returned by get method
*/
function serve_image(image, req, res) {
    fs.readFile(image.path, function(error, content) {
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
* Curation by users
*
*/
exports.curate = function(req, res) {
    var image_id= req.param('id');
    if(req.param('spam')==1) {
    images_db.update({_id: image_id},{$inc: { "stats.vote": 1, "stats.spam": 1}}, function(err) {
        res.json({});
    });
    }
    else {
        var forms = req.param('form_elts').split(',');
        var stats = { "stats.vote": 1};
        for(var i =0;i<forms.length;i++) {
            var param = req.param(forms[i]);
            if(param instanceof Array) {
                for(var j=0;j<param.length;j++) {
                  stats["stats." + forms[i] + "." + param[j]] = 1;
                }
            }
            else {
              stats["stats." + forms[i] + "." + param] = 1;
            }
        }
        var to_update = { $inc : stats };
        images_db.update({_id: image_id}, to_update, function(err) {
            if(err) { console.log(err); }
            res.json({});
        });
    }
}

exports.delete = function(req, res) {
    var image_id= req.param('id');
    cache.del(image_id);
    fs.exists(CONFIG.dir + '/' + image_id, function(exists) {
        if(exists) {
            fs.unlink(CONFIG.dir + '/' + image_id, function(err) {});
        }
    });
    scitizen_storage.delete(image_id, function(err,res) {
      if(err>0) {
        console.log("Failed to delete "+image_id+" from S3");
      }
    });
    images_db.remove({_id: image_id}, function(err) {
        if(err) { console.log(err); }
        res.json({_id: image_id});
    });

}

exports.get = function(req, res) {
  var image_id= req.param('id');
  if(image_id==0) {
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
}

exports.list = function(req, res) {
    images_db.find({ project: images_db.id(req.param('id')) }, function(err, images) {
        res.json(images);
    });
};
