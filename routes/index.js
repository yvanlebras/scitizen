var monk = require('monk')
  , db = monk('localhost:27017/scitizen')
  , projects_db = db.get('projects');

/*
 * GET home page.
 */

exports.index = function(req, res){
    var username = '';
    if(req.user) {
        username = req.user.username;
    }
    var project = { name: "Project list", theme: "default" }
        res.render('index', { layout: "layouts/default/public",
                              user: username,
                              project: project});
};
