var CONFIG = require('config');

var fs = require('fs'),
   mongo = require('mongodb'),
   monk = require('monk'),
   db = monk('localhost:27017/'+CONFIG.general.db),
   tasks_db = db.get('tasks'),
   scitizen_tasks = require('../lib/tasks');


tasks_db.find({status: 0}, function(err, tasks){
  if(err) {
    console.log(err);
    return;
  }
  for(i=0;i<tasks.length;i++){
    scitizen_tasks.send(task._id);
  }
});
