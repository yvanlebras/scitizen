
var CONFIG = require('config');


/**
* Checks if user can read project elements
*
* If public, yes
* If private, only admin or project members logged or via API
*/
exports.can_read = function(user, project, key) {
  // Is admin ?
  if(CONFIG.general.admin.indexOf(user.username)>-1) {
    return true;
  }
  if(project.public) {
    return true;
  }
  else {
    // Has key or memeber of project ?
    if(project.api==key || ('username' in user && project.users.indexOf(user.username)>-1)) {
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
  if('username' in user && CONFIG.general.admin.indexOf(user.username)>-1) {
    return true;
  }
  // Has key or memeber of project ?
  if(project.api==key || ('username' in user && project.owner == user.username)) {
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
  // Is admin ?
  if('username' in user && CONFIG.general.admin.indexOf(user.username)>-1) {
    return true;
  }
  if(project.public) {
    return true;
  }
  else {
    // Has key or memeber of project ?
    if(project.api==key || ('username' in user && project.users.indexOf(user.username)>-1)) {
        return true;
    }
    return false;
  }
}
