var CONFIG = require('config');

var monk = require('monk'),
   db = monk('localhost:27017/'+CONFIG.general.db),
   projects_db = db.get('projects');

/*
 * GET home page.
 */

exports.index = function(req, res){
    var username = '';
    if(req.user) {
        username = req.user.username;
    }
    var project = { name: '', theme: 'default' };
    res.render('index', { layout: 'layouts/default/public',
                              user: username,
                              project: project});
};

exports.projects = function(req, res){
    var username = '';
    if(req.user) {
        username = req.user.username;
    }
    var project = { name: '', theme: 'default' };
    res.render('projects', { layout: 'layouts/default/public',
                              user: username,
                              project: project});
};
