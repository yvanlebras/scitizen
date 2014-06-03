var monk = require('monk')
  , db = monk('localhost:27017/citizen')
  , projects_db = db.get('projects');

/*
 * GET home page.
 */

exports.index = function(req, res){
        res.render('index', { layout: "layouts/default/index"});
};
