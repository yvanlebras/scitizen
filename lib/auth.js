
var CONFIG = require('config');
var scitizen_stats = require('./stats.js');

var monk = require('monk'),
    db = monk('localhost:27017/'+CONFIG.general.db),
    users_db = db.get('users');

function increment_api(key, project) {
  if(key !== undefined && key !== null) {
    // API call, increment counter
    scitizen_stats.increment(project, 'api', 1);
  }
}

/**
* Checks if user can read project elements
*
* If public, yes
* If private, only admin or project members logged or via API
*/
exports.can_read = function(user, project, key, callback) {
  var anonymous = false;
  if(key!==undefined) {
    users_db.findOne({key: key}, function(err, key_user) {
      if(err) { callback(false);}
      module.exports.can_read(key_user, project, undefined, callback);
    });
  }
  else {
    if(!user || !user.username || user.username==='') { anonymous = true; }
    increment_api(key, project);
    // Is admin ?
    if(!anonymous && CONFIG.general.admin.indexOf(user.username)>-1) {
      callback(true);
    }
    if(project.public) {
      callback(true);
    }
    else {
      // Has key or memeber of project ?
      if(!anonymous && project.users.indexOf(user.username)>-1){
        callback(true);
      }
      else {
      callback(false);
    }
    }
  }
};

/**
* Checks if project can be edited (admin or owner)
*/
exports.can_edit = function(user, project, key, callback) {
  // Is admin ?
  var anonymous = false;
  if(key) {
    users_db.findOne({key: key}, function(err, key_user) {
      if(err) { callback(false);}
      module.exports.can_edit(key_user, project, undefined, callback);
    });
  }
  else {
  if(!user || !user.username || user.username==='') { anonymous = true;}
  increment_api(key, project);
  if(!anonymous && CONFIG.general.admin.indexOf(user.username)>-1) {
    callback(true);
  }
  // member of project ?
  if(!anonymous && project.owner == user.username) {
      callback(true);
  }
  else {
  callback(false);
  }
}
};

/**
* Checks if user can add new elements
*
* If public, yes
* If private, only admin or members logged or via API key
*/
exports.can_add = function(user, project, key, callback) {
  var anonymous = false;
  if(key) {
    users_db.findOne({key: key}, function(err, key_user) {
      if(err) { callback(false);}
      module.exports.can_add(key_user, project, undefined, callback);
    });
  }
  else {
  if(!user || !user.username || user.username==='') { anonymous = true;}
  increment_api(key, project);
  // Is admin ?
  if(!anonymous && CONFIG.general.admin.indexOf(user.username)>-1) {
    callback(true);
  }
  if(project.public) {
    callback(true);
  }
  else {
    // member of project ?
    if(!anonymous && project.users.indexOf(user.username)>-1) {
        callback(true);
    }
    else {
    callback(false);
  }
  }
}
};
