var url = require("url");
var util = require('util');
var path = require("path");
var fs = require("fs");
var formidable = require("formidable");
var pkgcloud = require("pkgcloud");

var MongoClient = require('mongodb').MongoClient;

var monk = require('monk')
  , db = monk('localhost:27017/citizen')
  , users_db = db.get('users')
  , projects_db = db.get('projects')
  , images_db = db.get('images');

var CONFIG = require('config').Swift;

var rackspace = pkgcloud.storage.createClient({
    provider: 'openstack',
    username: CONFIG.username,
    //apiKey: '',
    region: CONFIG.region,
    password: CONFIG.password,
    authUrl: CONFIG.authUrl
  });

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
*/
function serve_image(image_id, contentType, req, res) {
    fs.readFile(CONFIG.dir + '/' + image_id, function(error, content) {
        if (error) {
            console.log(error);
            res.writeHead(500);
            res.end();
        }
        else {
            res.writeHead(200, { 'Content-Type': contentType});
            res.end(content, 'utf-8');
        }
    });
}

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
            stats["stats."+forms[i]+"."+req.param(forms[i])] = 1;
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
    rackspace.removeFile(CONFIG.container, image_id, function(err) {
        if(err!=null) {
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
    var image = cache.get(image_id);
    if(image==null) {
        var myFile = fs.createWriteStream(CONFIG.dir+'/'+image_id);
        rackspace.download({
            container: CONFIG.container,
            remote: image_id
        }, function(err, result) {
            if(err!=null) {
                if('statusCode' in err) {
                    res.status(err['statusCode']).send('Could not retreive image');
                }
                else {
                    res.status(500).send(err['errno']);
                }
            }
            else {
                cache.set(image_id, result);
                serve_image(image_id, result.contentType, req, res);
            }
            // handle the download result
        }).pipe(myFile);
    }
    else {
        serve_image(image_id, image, req, res);
    }
}

exports.list = function(req, res) {
    console.log("list images for project "+req.param('id'));
    images_db.find({ project: images_db.id(req.param('id')) }, function(err, images) {
        res.json(images);
    });
    /*   
    var files = rackspace.getFiles("scitizen", function(err, files) {
        if(err!=null && ('statusCode' in err) && (err['statusCode']==404)) {
            rackspace.createContainer({ name: "scitizen" },function(err, files)             {
                if(err!=null && 'statusCode' in err) {
                    res.status(err['statusCode']).send(err);
                }
                else {
                    res.json([]);
                }
            });
        }
        else {
            res.json(files);
        }
    });
    */
};

