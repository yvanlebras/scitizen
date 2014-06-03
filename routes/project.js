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

var SWIFT_CONFIG = require('config').Swift;
var GOOGLE_CONFIG = require('config').Google;

var rackspace = pkgcloud.storage.createClient({
    provider: 'openstack',
    username: SWIFT_CONFIG.username,
    region: SWIFT_CONFIG.region,
    password: SWIFT_CONFIG.password,
    authUrl: SWIFT_CONFIG.authUrl
  });



var version = null;

MongoClient.connect('mongodb://127.0.0.1:27017/citizen', function(err, db) {
    db.admin().serverInfo(function(err, result){
         console.log(result);
         version = result["versionArray"][1];
         db.close();
     });

});

/**
* Checks if a user can submit a new item to a project
*/
function can_upload(user, project, key) {
    if(project.public) {
        return true;
    }
    else {
        if(project.api==key) {
            return true;
        }
        return false;
    }
}

/*
 * GET users listing.
 */

exports.upload = function(req, res) {
    projects_db.findOne({ _id: req.param('id') }, function(err, project) {
        if(can_upload(req.user, project, req.param('api'))) {
	        upload_file(req, res, project);
        }
        else { res.status(401).send('You\'re not authorized to submit elements'); }

    });
};

exports.add = function(req, res) {
    var key = (Math.random() + 1).toString(36).substring(7);
    projects_db.insert({ name: req.param('pname'), description:
req.param('pdesc'), owner: req.user.username, validation: false, geo: true, status: false,  public: true, api: key, form: {} }, function(err, project) {
        res.json(project);
    });
}

exports.edit = function(req, res) {
    projects_db.findOne({ _id: req.param('id') }, function(err, project) {
        if(project.owner == req.user.username || req.user.username == 'admin') {
            // check params and update
            projects_db.update({ _id: req.param('id') }, {$set: req.body}, function(err) {
                res.json({});
            });
        }
        else {
            res.json({err: "You do not own this project"});
        }
    });
}

exports.delete = function(req, res) {
    projects_db.findOne({ _id: req.param('id') }, function(err, project) {
        if(project.owner == req.user.username || req.user.username == 'admin') {
            projects_db.remove({ _id: req.param('id') }, function(err) {
                res.json({});
            });
        }
        else {
            res.json({err: "You do not own this project"});
        }
    });
}

exports.list = function(req, res) {
        console.log("list projects");
        projects_db.find({}, function(err,projects) {
            url_parts = url.parse(req.url, true);
            url_callback = url_parts.query.jsoncallback;
            if(url_callback != undefined && url_callback!=null) {
                res.set('Content-Type', 'application/json');
                res.write(url_callback+'('+JSON.stringify(projects)+')');
                res.end()
            }
            else {
                res.json(projects);
            }
            
        });
};

exports.get = function(req, res){
    projects_db.findOne({ _id : req.param('id')}, function(err,project) {
        if (! project.form) { project.form = {} };
        url_parts = url.parse(req.url, true);
        url_callback = url_parts.query.jsoncallback;
        if(url_callback != undefined && url_callback!=null) {
            res.set('Content-Type', 'application/json');
            res.write(url_callback+'('+JSON.stringify(project)+')');
            res.end();
        }
        else {
            res.json(project);
        }
    });
};

exports.around = function(req,res) {
    url_parts = url.parse(req.url, true);
    url_callback = url_parts.query.callback;
    console.log("looking around "+req.params.long+","+req.params.lat+" for dist "+req.params.dist+" km");
    MongoClient.connect('mongodb://127.0.0.1:27017/citizen', function(err, db) {
        if(err) throw err;
        var collection = db.collection('citizen');
        // For mongo 2.2, distance in km
        // db.citizen.find( { "fields.location": { $within: { $centerSphere: [[ -1.675708, 48.113475 ], 3/6378.137 ] }}})
        var filter= { "project": req.params.id, "fields.location": { "$within": { "$centerSphere": [[ parseFloat(req.params.long) , parseFloat(req.params.lat) ], parseInt(req.params.dist)/6378.137 ] }}};
        if(version>=4) {
            // For mongo 2.4, distance in m, so we multiply to get km
            filter = {"project": req.params.id, "fields.loc" : { "$near" : { "$geometry" :  { "type" : "Point", "coordinates" : [ parseFloat(req.params.long) , parseFloat(req.params.lat)] }}, "$maxDistance" : parseInt(req.params.dist) * 1000}};
        }
        collection.find( filter ).toArray(function(err, results) {
        if(err!=null) {
            console.log(err);
        }
        db.close();
        nearmatches = { project: req.params.id, locations: JSON.stringify(results) };
        if(url_callback != undefined && url_callback!=null) {
            res.set('Content-Type', 'application/json');
            res.write(url_callback+'('+JSON.stringify(nearmatches)+')');
            res.end();
        }
        else {
            res.json(nearmatches);
        }

         });
    });
};

exports.map  =  function(req, res){
    MongoClient.connect('mongodb://127.0.0.1:27017/citizen', function(err, db) {
        if(err) throw err;
        var collection = db.collection('citizen');
        collection.find({"project": req.params.id}).toArray(function(err, results) {
           db.close();
            res.render('map', { project: req.params.id, locations: JSON.stringify(results) })

         });
    });

}

exports.dashboard =  function(req, res){
    /*
    MongoClient.connect('mongodb://127.0.0.1:27017/citizen', function(err, db) {
        if(err) throw err;
        var collection = db.collection('citizen');
	   collection.find({"project": req.params.id}, { limit: 3, sort: {"_id": -1}}).toArray(function(err, results) {
           db.close();
           var lastimg = '';
           if(results.length>0) {
               lastimg = results[0]['file'].replace('/tmp/','');
           }
           var thumbs = [];
           for(var j=1;j<Math.min(3,results.length);j++) {
              thumbs.push({'file': results[j]['file'].replace('/tmp/','')});
           }
           res.render('dashboard', { file: lastimg, project: req.params.id, last: JSON.stringify(results), thumbfiles: thumbs })
       });
  });
  */
   projects_db.findOne({ _id : req.param('id')}, function(err,project) {
        res.render('dashboard', { layout: "layouts/default/public", project: project, apikey: GOOGLE_CONFIG.apikey, messages: req.flash('info') });

    });
};

exports.random = function(req, res){
    console.log("select random element");
    MongoClient.connect('mongodb://127.0.0.1:27017/citizen', function(err, db) {
        if(err) throw err;
        var collection = db.collection('citizen');
	collection.find({"project": req.params.id}).toArray(function(err, results) {
            console.log(results);
            var nbelts = results.length;
            db.close();
            if(results.length==0) {
              res.render('random', {jsonobject: {}, file: '', project: req.params.id });
            }
            else {
            var randomelt = Math.floor((Math.random()*nbelts));
            console.log(randomelt);
            res.render('random', { jsonobject: JSON.stringify(results[randomelt]), file: results[randomelt]['file'].replace('/tmp/',''), project: req.params.id });
            }
        });

    });
};

function upload_file(req, res, project) {
    console.log("upload new file");
    var form = new formidable.IncomingForm();
    form.uploadDir = '/tmp';
    form.keepExtensions = true;
    form.parse(req, function(err, fields, files) {
      //console.log(util.inspect({fields: fields, files: files}));
      if(project['geo'] && fields["location"]=="") {
        res.status(400).send("Geo position is missing");
        return;
      }

      fields["location"] =  fields["location"].split(',');
      fields["location"][0] = parseFloat(fields["location"][0]);
      fields["location"][1] = parseFloat(fields["location"][1]);
      if(version>=4) {
        // Add GeoJSON
        fields["loc"]  = {"type" :  "Point", "coordinates" : fields["location"]};
      }

      var item = {project: images_db.id(req.param('id')), fields: fields, name:
files.image.name, validated: false, spam: false, favorite: false};

      images_db.insert(item, function(err, image) {
           if(err!=null) {
                res.status(500).send("Error while saving item");
            }
 
            rackspace.upload({
            container:  SWIFT_CONFIG.container,
            remote: image._id.toHexString(),
            local: files.image.path,
            metadata: { project:  image.project, name: image.name }
            }, function(err, result) {
                //fs.unlink(files.image.path);
                if(err!=null) {
                    images_db.remove({ _id: image._id});
                    console.log(err);
                    if('statusCode' in err) {
                        res.status(err['statusCode']).send('Could not save image');
                    }
                    else {
                        res.status(500).send(err['errno']);
                    }
                }
                //res.redirect('/project/'+req.params.id+'/dashboard');
                res.json(image);
            });
      });

    });
}

