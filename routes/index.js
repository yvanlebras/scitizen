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
        res.render('index', { layout: "layouts/default/public", user: username});
};
