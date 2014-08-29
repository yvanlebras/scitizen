var url = require('url');
var util = require('util');
var path = require('path');
var fs = require('fs');
var formidable = require('formidable');
var pkgcloud = require('pkgcloud');
var scitizen_storage = require('scitizen-storage');

var scitizen_auth = require('../lib/auth.js');
var scitizen_stats = require('../lib/stats.js');


var CONFIG = require('config');

var MongoClient = require('mongodb').MongoClient;

var monk = require('monk'),
   db = monk('localhost:27017/'+CONFIG.general.db),
   users_db = db.get('users'),
   projects_db = db.get('projects'),
   tasks_db = db.get('tasks'),
   images_db = db.get('images');



scitizen_storage.configure(CONFIG.general.storage, CONFIG.storage);


var version = null;

MongoClient.connect('mongodb://127.0.0.1:27017/'+CONFIG.general.db,
                    function(err, db) {
                        db.admin().serverInfo(function(err, result){
                          console.log(result);
                          version = result.versionArray[1];
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
};


/**
* Upload a new item (must be logged or via API)
*
*/
exports.upload = function(req, res) {
    projects_db.findOne({ _id: req.param('id') }, function(err, project) {
        scitizen_auth.can_add(req.user, project, req.param('api'),
                              function(can_add) {
        if(can_add) {
        //if(can_upload(req.user, project, req.param('api'))) {
	        upload_file(req, res, project);
        }
        else {
          res.status(401).send('You\'re not authorized to submit elements');
        }
      });
    });
};

/**
* Creates a new project, parameters are pname, pdesc.
*
*/
exports.add = function(req, res) {
    //var key = (Math.random() + 1).toString(36).substring(7);
    projects_db.insert({ name: req.param('pname'),
                          short_description: req.param('pdesc'),
                          description: '',
                          theme: 'default',
                          owner: req.user.username,
                          users: [ req.user.username ],
                          users_can_add: true,
                          point_and_click: false,
                          validation: false,
                          geo: true,
                          status: false,
                          public: true,
                          google_api: '',
                          askimet_api: '',
                          plan: 'default',
                          stats: {quota: 0},
                          form: {}
                        }, function(err, project) {
                          res.json(project);
    });
};

/**
* Update project information, user must be owner of the project.
*
*/
exports.edit = function(req, res) {
    projects_db.findOne({ _id: req.param('id') }, function(err, project) {
      scitizen_auth.can_edit(req.user, project, req.param('api'),
                            function(can_edit) {
        if(can_edit) {
            // check params and update
            if(req.body.form) {
            for(var elt in req.body.form) {
              if(! Array.isArray(req.body.form[elt].values)) {
                if(req.body.form[elt].values == 'false') {
                  req.body.form[elt].values = false;
                }
                if(req.body.form[elt].values == 'true') {
                  req.body.form[elt].values = true;
                }
              }
              if(elt == 'api') {
                delete req.body.form[elt];
              }
            }
          }
          else {
            if(req.body.geo) {
              if(req.body.geo == 'false') { req.body.geo = false; }
              else { req.body.geo = true; }
            }
            if(req.body.users_can_add) {
              if(req.body.users_can_add == 'false') {
                req.body.users_can_add = false;
              }
              else { req.body.users_can_add = true; }
            }
            if(req.body.point_and_click) {
              if(req.body.point_and_click == 'false') {
                req.body.point_and_click = false;
              }
              else { req.body.point_and_click = true; }
            }
            if(req.body.validation) {
              if(req.body.validation == 'false') {
                req.body.validation = false;
              }
              else { req.body.validation = true; }
            }
            if(req.body.status) {
              if(req.body.status == 'false') { req.body.status = false; }
              else { req.body.status = true; }
            }
            if(req.body.public) {
              if(req.body.public == 'false') { req.body.public = false; }
              else { req.body.public = true; }
            }
            if(req.body.api) { delete req.body.api; }
          }


            projects_db.update({ _id: req.param('id') },
                                {$set: req.body},
                                function(err) {
                                  if(err) {
                                    console.log(err);
                                  }
                                  res.json({});
                                });
        }
        else {
            res.status(401).send('Not allowed to modify this project');
        }
      });
    });
};

/**
* Delete a project, user must be owner of the project
*
*/
exports.delete = function(req, res) {
    projects_db.findOne({ _id: req.param('id') }, function(err, project) {
      scitizen_auth.can_edit(req.user, project, req.param('api'),
                              function(can_edit) {
        if(can_edit) {
            projects_db.remove({ _id: req.param('id') }, function(err) {
              if(err) {
                console.log(err);
                res.json({});
                return;
              }
              else {
                // Delay task because need to remove all items from storage too,
                // can be time consuming
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
            res.status(401).send('You do not own this project');
        }
      });
    });
};

/**
* Get all projects that can be seen by the user i.e. public projects
* or projects where user is listed in <i>users</i> field list.
*
*/
exports.list = function(req, res) {
      var isAdmin = false;
      var filter = {};
      if(req.param('api')) {
        users_db.findOne({key: req.param('api')}, function(err, key_user){
          if(err) {
            res.status(500).send('api does not match');
            return;
          }

          filter = { $or: [
                          { public: true },
                          { users: { '$in': [key_user.username] }}
                          ]
                  };
          projects_db.find(filter, function(err,projects) {
            if(err) {
              console.log(err);
              res.status(404).send('no match');
              return;
            }
            for(i=0;i<projects.length;i++) {
            // Remove sensitive data for non project members
                if(projects[i].users.indexOf(key_user.name)==-1 && 
                    key_user.name!= projects[i].owner ) {
                    project_mask(projects[i]);
                }
            }
              res.json(projects);
          });
        });
      }
      else {
        if(req.user === undefined || req.user.username === undefined) {
          filter.public = true;
          filter.status = true;
        }
        else if(CONFIG.general.admin.indexOf(req.user.username)==-1) {
          // Not admin, search "is in user" or "public = true"
          filter = { $or: [
                        { public: true},
                        { users: { $in: [req.user.username] }}
                        ]
                  };
        }
        projects_db.find(filter, function(err,projects) {
          for(i=0;i<projects.length;i++) {
            // Remove sensitive data for non project members
            if(!req.user || !req.user.username ||
                (projects[i].users.indexOf(req.user.username)==-1 &&
                    req.user.username!= projects[i].owner )) {
            project_mask(projects[i]);
            }
          }
          url_parts = url.parse(req.url, true);
          url_callback = url_parts.query.jsoncallback;
          if(url_callback !== undefined && url_callback!==null) {
            res.set('Content-Type', 'application/json');
            res.write(url_callback+'('+JSON.stringify(projects)+')');
            res.end();
          }
          else {
            res.json(projects);
          }
        });
    }
};

/**
* Get a project
*
*/
exports.get = function(req, res){
    projects_db.findOne({ _id : req.param('id')}, function(err, project) {
      if(err) {
        res.status(404).send();
        return;
      }
      scitizen_auth.can_read(req.user, project, req.param('api'),
                            function(can_read) {
      if(can_read) {
        if (! project.form) { project.form = {}; }
            // Remove sensitive data for non project members
            if(!req.user || !req.user.username ||
                (project.users.indexOf(req.user.username)==-1 &&
                    req.user.username!= project.owner )) {
                project_mask(project);
            }
        url_parts = url.parse(req.url, true);
        url_callback = url_parts.query.jsoncallback;
        if(url_callback !== undefined && url_callback!==null) {
            res.set('Content-Type', 'application/json');
            res.write(url_callback+'('+JSON.stringify(project)+')');
            res.end();
        }
        else {
            res.json(project);
        }
      }
      else {
        res.status(401).send('You are not allowed to access this project');
      }
    });
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
    console.log('looking around '+req.param('long')+','+
                req.param('lat')+' for dist '+req.param('dist')+' km');
    var filter= { 'project': images_db.id(req.param('id')),
                  'fields.location': {
                    '$within': {
                      '$centerSphere': [[ parseFloat(req.params.long),
                                          parseFloat(req.params.lat)
                                        ],
                                        parseInt(req.params.dist)/6378.137
                                        ]
                                      }
                                    }
                };
    if(version>=4) {
        // For mongo 2.4, distance in m, so we multiply to get km
        filter = {'project': images_db.id(req.param('id')),
                  'fields.loc': {
                    '$near': {
                      '$geometry':  {
                        'type': 'Point',
                        'coordinates': [ parseFloat(req.params.long),
                                          parseFloat(req.params.lat)
                                        ] }},
                                '$maxDistance': parseInt(req.params.dist) * 1000
                                      }
                  };
    }
    images_db.find(filter, function(err, images) {
      if(err) {
        console.log(err);
        res.json([]);
        return;
      }
      if(url_callback !== undefined && url_callback!==null) {
          res.set('Content-Type', 'application/json');
          res.write(url_callback+'('+JSON.stringify(nearmatches)+')');
          res.end();
      }
      else {
          res.json(images);
      }
    });
};



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
    projects_db.findOne({ _id : req.param('id')},
      function(err,project) {
      scitizen_auth.can_read(req.user, project, req.param('api'),
                            function(can_read) {
      if(! can_read){
        // Project is private and user is not logged or part of members
        res.status(401).send('You are not allowed to access this project');
        return;
      }
        var theme_view = 'dashboard';
        if(project.theme!='default') {
          theme_view = 'themes/'+project.theme+'/dashboard';
        }
        var google_api = CONFIG.Google.apikey;
        if(project.google_api!==undefined && project.google_api!=='') {
            google_api = project.google_api;
        }
        else {
            scitizen_stats.send(project.name, 'google', 1);
        }
        res.render(theme_view,
                    { layout: 'layouts/'+project.theme+'/public',
                      partials: { part: 'new_item' },
                      project: project,
                      apikey: google_api,
                      messages: req.flash('info'),
                      user: username });
        });
    });
};

exports.stats = function(req, res) {
    projects_db.findOne({ _id : req.param('id')}, function(err, project) {
      if(err) {
        res.status(404).send();
        return;
      }
      scitizen_auth.can_read(req.user, project, req.param('api'),
                            function(can_read) {
        if(can_read) {

          scitizen_stats.query(project.name,'1w','1d',
                                function(err, data) { res.json(data); });
        }
        else {
          res.status(401).send('You are not allowed to access this project');
        }
      });
   });
}


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
      if(Array.isArray(properfields[name])) {
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
      if(project.geo && fields.location==='') {
        res.status(400).send('Geo position is missing');
        return;
      }

      fields.location =  fields.location.split(',');
      fields.location[0] = parseFloat(fields.location[0]);
      fields.location[1] = parseFloat(fields.location[1]);
      if(version>=4) {
        // Add GeoJSON
        fields.loc  = {'type': 'Point', 'coordinates': fields.location};
      }


      var validated = true;

      if(project.validation) {
        validated = false;
      }
      var need_control = false;
      if(project.askimet_api!=='') {
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
           //scitizen_stats.send(project.name, 'image', 1);
           scitizen_stats.sendPoints(project.name,[
             { 'image': 1}, { 'quota': project.stats.quota + image.size }
             ]);
           if(err!==null) {
                res.status(500).send('Error while saving item');
            }
            var metadata = { project:  image.project, name: image.name };
            scitizen_storage.put(image._id.toHexString(),
                        files.image.path,
                        metadata,
                        function(err, result) {
                          if(err!==0) {
                            res.status(err).send('Could not save image');
                          }
                          else {
                            projects_db.update({_id: image.project},
                                              {$inc: {
                                                'stats.quota': image.size
                                              }},
                                              function(err){
                                                if(need_control) {
                                                  check_spam(project, image);
                                                }
                                              }
                                            );
                            res.json(image);
                          }
            });

            tasks_db.insert({ type: 'rescale',
                              object: 'images',
                              objectid: image._id.toHexString()
                                }, function(err, task) {
                            });






        });
    });
}


function get_content(image) {
  var comment = '';
  for(var elt in image.fields) {
    if(elt=='loc') { continue; }
    if(Array.isArray(image.fields.elt)) {
      for(var i=0;i<image.fields.elt.length;i++) {
        comment += +elt+':'+image.fields.elt[i]+' ';
      }
    }
    else {
      comment += elt+':'+image.fields[elt]+' ';
    }
  }
  return comment;
}

/**
* Mask sensitive data of project
*/
function project_mask(project) {
    project.askimet_api = '';
    project.google_api = '';
    project.api = '';
}

function check_spam(project, image) {
  var akismet_options = {
    apikey: project.askimet_api, // required: your akismet api key
    blog: CONFIG.general.url, // required: your root level url
    headers:  // optional, but akismet likes it if you set this
    {
        'User-Agent': 'testhost/1.0 | node-akismet/0.0.1'
    }
  };
  var args = {
    permalink: '/image/'+image._id+'/control',
    comment_content: get_content(image),
    comment_type: 'comment'
  };

  var Akismet = require('akismet').client(akismet_options);

  Akismet.checkSpam(args, function(isSpam) {
    if (isSpam) {
        // quarantine that
        images_db.remove({_id: image._id},
                  function(err){
                    if(err) {
                      console.log(err);
                    }
                  });
        scitizen_storage.delete(image._id.toHexString(), function(err, result){
          if(err>0) { console.log(err);}
        });
    }
    else {
      images_db.update({_id: image._id},
                  {$set: {
                    'need_spam_control': false
                  }},
                  function(err){
                    if(err) {
                      console.log(err);
                    }
                  }
                );
    }
  });

}
