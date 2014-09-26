var CONFIG = require('config');

var monk = require('monk'),
   db = monk(CONFIG.mongo.host+':'+CONFIG.mongo.port+'/'+CONFIG.general.db),
   projects_db = db.get('projects'),
   tasks_db = db.get('tasks');

/*
 * GET home page.
 */

exports.index = function(req, res){
    var username = '';
    if(req.user) {
        username = req.user.username;
    }
    var project = { name: '', theme: 'default' };
    var analytics_part = 'analytics_'+CONFIG.analytics.backend;
    res.render('index', { layout: 'layouts/default/public',
                          partials: { analytics: analytics_part },
                          user: username,
                          analytics: CONFIG.analytics,
                          project: project});
};

exports.projects = function(req, res){
    var username = '';
    if(req.user) {
        username = req.user.username;
    }
    var project = { name: '', theme: 'default' };
    var analytics_part = 'analytics_'+CONFIG.analytics.backend;
    res.render('projects', { layout: 'layouts/default/public',
                             partials: { analytics: analytics_part },
                             user: username,
                             analytics: CONFIG.analytics,
                             project: project});
};

exports.tasks = function(req, res) {
  tasks_db.find({}, function(err, tasks){
    if(err) {
      res.status(500).send('An error occured');
      return;
    }
    res.json(tasks);
  });
};
