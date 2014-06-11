
var CONFIG = require('config');


/**
* Checks if user can read project elements
*
* If public, yes
* If private, only admin or project members logged or via API
*/
exports.can_read = function(user, project, key) {
  var anonymous = false;
  if(!user || !user.username || user.username=='') { anonymous = true;}
  if(key != undefined && key != null) {
    // API call, increment counter
    projects_db.update({ _id: project._id }, { $inc: stats.api },
                       function(err) {}); 
  }
  // Is admin ?
  if(!anonymous && CONFIG.general.admin.indexOf(user.username)>-1) {
    return true;
  }
  if(project.public) {
    return true;
  }
  else {
    // Has key or memeber of project ?
    if(project.api==key || (!anonymous && project.users.indexOf(user.username)>-1)) {
        return true;
    }
    return false;
  }
}

/**
* Checks if project can be edited (admin or owner)
*/
exports.can_edit = function(user, project, key) {
  // Is admin ?
  var anonymous = false;
  if(!user || !user.username || user.username=='') { anonymous = true;}
  if(!anonymous && CONFIG.general.admin.indexOf(user.username)>-1) {
    return true;
  }
  // Has key or memeber of project ?
  if(project.api==key || (!anonymous && project.owner == user.username)) {
      return true;
  }
  return false;
}

/**
* Checks if user can add new elements
*
* If public, yes
* If private, only admin or members logged or via API key
*/
exports.can_add = function(user, project, key) {
  var anonymous = false;
  if(!user || !user.username || user.username=='') { anonymous = true;}
  // Is admin ?
  if(!anonymous && CONFIG.general.admin.indexOf(user.username)>-1) {
    return true;
  }
  if(project.public) {
    return true;
  }
  else {
    // Has key or memeber of project ?
    if(project.api==key || (!anonymous && project.users.indexOf(user.username)>-1)) {
        return true;
    }
    return false;
  }
}
