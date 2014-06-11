var url = require("url");
var util = require('util');
var path = require("path");
var fs = require("fs");
var formidable = require("formidable");
var pkgcloud = require("pkgcloud");
var scitizen_storage = require("scitizen-storage");

var scitizen_auth = require("../lib/auth.js");


var CONFIG = require('config');

var MongoClient = require('mongodb').MongoClient;

var monk = require('monk')
  , db = monk('localhost:27017/'+CONFIG.general.db)
  , users_db = db.get('users')
  , projects_db = db.get('projects')
  , tasks_db = db.get('tasks')
  , images_db = db.get('images');



scitizen_storage.configure(CONFIG.general.storage, CONFIG.storage);


var version = null;

MongoClient.connect('mongodb://127.0.0.1:27017/scitizen', function(err, db) {
    db.admin().serverInfo(function(err, result){
         console.log(result);
         version = result["versionArray"][1];
         db.close();
     });

});

/**
* Sets current project in session
*
*/
exports.current = function(req, res) {
    // If same project, do not update session
    if(req.session.project_current._id == req.param('id')) {
        res.json(req.session.project);
        return;
    }
    projects_db.findOne({ _id: req.param('id') }, function(err, project) {
        req.session.project_current = project;
        res.json(project);
    });
}


/**
* Upload a new item (must be logged or via API)
*
*/
exports.upload = function(req, res) {
    projects_db.findOne({ _id: req.param('id') }, function(err, project) {
        if(scitizen_auth.can_add(req.user, project, req.param('api'))) {
        //if(can_upload(req.user, project, req.param('api'))) {
	        upload_file(req, res, project);
        }
        else { res.status(401).send('You\'re not authorized to submit elements'); }

    });
};

/**
* Creates a new project, parameters are pname, pdesc.
*
*/
exports.add = function(req, res) {
    var key = (Math.random() + 1).toString(36).substring(7);
    projects_db.insert({ name: req.param('pname'),
                          description: req.param('pdesc'),
                          theme: 'default',
                          owner: req.user.username,
                          users: [ req.user.username ],
                          validation: false,
                          geo: true,
                          status: false,
                          public: true,
                          api: key,
                          google_api: '',
                          askimet_api: '',
                          quota: 0,
                          stats: {api: 0, google: 0, quota: 0},
                          form: {}
                        }, function(err, project) {
                          res.json(project);
    });
}

/**
* Update project information, user must be owner of the project.
*
*/
exports.edit = function(req, res) {
    projects_db.findOne({ _id: req.param('id') }, function(err, project) {
        if(scitizen_auth.can_edit(req.user, project, req.param('api'))) {
        //if(project.owner == req.user.username || req.user.username == 'admin') {
            // check params and update
            for(elt in req.body) {
              if(req.body[elt] == 'false') {
                req.body[elt] = false;
              }
              if(req.body[elt] == 'true') {
                req.body[elt] = true;
              }
            }
            projects_db.update({ _id: req.param('id') }, {$set: req.body}, function(err) {
              if(err) {
                console.log(err);
              }
                res.json({});
            });
        }
        else {
            res.json({err: "You do not own this project"});
        }
    });
}

/**
* Delete a project, user must be owner of the project
*
*/
exports.delete = function(req, res) {
    projects_db.findOne({ _id: req.param('id') }, function(err, project) {
        if(scitizen_auth.can_edit(req.user, project, req.param('api'))) {
        //if(project.owner == req.user.username || req.user.username == 'admin') {
            projects_db.remove({ _id: req.param('id') }, function(err) {
              if(err) {
                console.log(err);
                res.json({});
                return;
              }
              else {
                // TODO should remove with a background task all images of project
                // quick for mongodb images, but for storage need to treat each image separatly
                tasks_db.insert({ type: 'remove',
                                  object: 'images',
                                  objectid: req.param('id')
                                }, function(err, task) {
                                    if(err) {
                                      console.log(err);
                                    }
                                      res.json({});
                });
              }
            });
        }
        else {
            res.json({err: "You do not own this project"});
        }
    });
}

/**
* Get all projects that can be seen by the user i.e. public projects
* or projects where user is listed in <i>users</i> field list.
*
*/
exports.list = function(req, res) {
      var isAdmin = false;
      var filter = {};
      if(req.user == undefined) {
        filter['public'] = true;
        filter['status'] = true;
      }
      else if(CONFIG.general.admin.indexOf(req.user.username)==-1) {
        // Not admin, search "is in user" or "public = true"
        filter = { $or: [{ public: true},{ users: { $elemMatch: req.user.username }}]};
      }
      projects_db.find(filter, function(err,projects) {
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

/**
* Get a project
*
*/
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

/**
* Returns available items around a position
*
* Query parameters: long, lat, dist (distance in km).
*/
exports.around = function(req,res) {
    url_parts = url.parse(req.url, true);
    url_callback = url_parts.query.callback;
    console.log('looking around '+req.param('long')+','+req.param('lat')+" for dist "+req.param('dist')+' km');
    var filter= { "project": images_db.id(req.param('id')),
                  "fields.location": {
                    "$within": {
                      "$centerSphere": [[ parseFloat(req.params.long),
                                          parseFloat(req.params.lat)
                                        ],
                                        parseInt(req.params.dist)/6378.137
                                        ]
                                      }
                                    }
                };
    if(version>=4) {
        // For mongo 2.4, distance in m, so we multiply to get km
        filter = {"project": images_db.id(req.param('id')),
                  "fields.loc" : {
                    "$near" : {
                      "$geometry" :  {
                        "type" : "Point",
                        "coordinates" : [ parseFloat(req.params.long),
                                          parseFloat(req.params.lat)
                                        ] }},
                                        "$maxDistance" : parseInt(req.params.dist) * 1000
                                      }
                  };
    }
    images_db.find(filter, function(err, images) {
      if(err) {
        console.log(err);
        res.json([]);
        return;
      }
      if(url_callback != undefined && url_callback!=null) {
          res.set('Content-Type', 'application/json');
          res.write(url_callback+'('+JSON.stringify(nearmatches)+')');
          res.end();
      }
      else {
          res.json(images);
      }
    });
};

/*
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
*/

/**
*
* Public user page for a project
* Loads view 'themes/my_theme/dashboard.html', using layout
* layout/my_theme/public.html
*
* Provides to template:
* <ul>
*  <li>project</li>
*  <li>username</li>
*  <li>Google maps API key</li>
* </ul>
*
* To include the "contribute" a partial can be included with name <b>part</b>:
*
* <code>{{> part}}</code>
*/
exports.dashboard =  function(req, res){
    var username = '';
    if(req.user) {
        username = req.user.username;
    }
    projects_db.findOne({ _id : req.param('id')}, function(err,project) {
      if(project.public == false && (username=='' || project.users.indexOf(username)==-1)) {
        // Project is private and user is not logged or part of members
        res.status(503).send('You are not allowed to access this project');
        return;
      }
        var theme_view = 'dashboard';
        if(project.theme!='default') {
          theme_view = 'themes/'+project.theme+'/dashboard';
        }
        var google_api = CONFIG.Google.apikey;
        if(project.google_api!=undefined && project.google_api!='') {
            google_api = project.google_api;
        }
        else {
            projects_db.update({_id : project._id},
                               {$inc: { 'stats.google': 1 }},
                               function(err){ console.log(err);});
        }
        res.render(theme_view,
                    { layout: 'layouts/'+project.theme+'/public',
                      partials: { part: 'new_item' },
                      project: project,
                      apikey: google_api,
                      messages: req.flash('info'),
                      user: username });
    });
};

/*
exports.random = function(req, res){
    MongoClient.connect('mongodb://127.0.0.1:27017/citizen', function(err, db) {
        if(err) throw err;
        var collection = db.collection('citizen');
        collection.find({"project": req.params.id}).toArray(function(err, results) {
            var nbelts = results.length;
            db.close();
            if(results.length==0) {
              res.render('random', {jsonobject: {}, file: '', project: req.params.id });
            }
            else {
            var randomelt = Math.floor((Math.random()*nbelts));
            res.render('random', { jsonobject: JSON.stringify(results[randomelt]), file: results[randomelt]['file'].replace('/tmp/',''), project: req.params.id });
            }
        });

    });
};
*/

function upload_file(req, res, project) {
    var form = new formidable.IncomingForm();
    form.uploadDir = '/tmp';
    form.keepExtensions = true;
    var properfields = {};

    form.on('field', function(name, value) {
    name = name.replace('[]','');
    if (!properfields[name]) {
      properfields[name] = value;
    } else {
      if (properfields[name].constructor.toString().indexOf("Array") > -1) { // is array
        properfields[name].push(value);
      } else { // not array
        var tmp = properfields[name];
        properfields[name] = [];
        properfields[name].push(tmp);
        properfields[name].push(value);
      }
    }
    });


    form.parse(req, function(err, fields, files) {
      //console.log(util.inspect({fields: fields, files: files}));
      //console.log(properfields);
      fields = properfields;
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

      var validated = true;

      if(project.validation) {
        validated = false;
      }
      var need_control = false;
      if(project.askimet_api!='') {
        //TODO call askimet
        need_control = true;
      }

      var item = {project: images_db.id(req.param('id')),
                  contentType: files.image.type,
                  fields: fields,
                  name: files.image.name,
                  validated: validated,
                  need_spam_control: need_control,
                  size: files.image.size,
                  spam: false,
                  favorite: false};

      images_db.insert(item, function(err, image) {
           if(err!=null) {
                res.status(500).send("Error while saving item");
            }
            var metadata = { project:  image.project, name: image.name };
            scitizen_storage.put(image._id.toHexString(), files.image.path, metadata,
                        function(err, result) {
                          if(err!=0) {
                            res.status(err).send('Could not save image');
                          }
                          else {
                            projects_db.update({_id: image.project},
                                              {$inc: { 'stats.quota': image.size}},
                                              function(err){});
                            res.json(image);
                          }
            });
        });
    });
}
