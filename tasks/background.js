/**
 * Executes all background tasks
 */



var CONFIG = require('config');

var fs = require('fs');
var user = require('../routes/user'),
   project = require('../routes/project'),
   image = require('../routes/image'),
   mongo = require('mongodb'),
   monk = require('monk'),
   db = monk('localhost:27017/'+CONFIG.general.db),
   users = db.get('users'),
   projects = db.get('projects'),
   images = db.get('images'),
   tasks_db = db.get('tasks'),
   sciconfig = db.get('config'),
   path = require('path'),
   image_tasks = require('../lib/image_tasks');


var counter = 0;
var nbTasks = -1;
var interval = null;

function manageTask(task) {
  var task_id = task._id;
  if(task.type == 'rescale') {
      var image_id = task.objectid;
      image_tasks.rescale(image_id, function(code) {
        if(code == 0) {
          tasks_db.remove({ _id : task_id}, function(err) { counter++; });
        }
        else {
          tasks_db.update({ _id : task_id}, {$set: {status: code}},
              function(err) { counter++; });
        }
      });
   }
   else if(task.type == 'remove') {
      var project_id = task.objectid;
      image_tasks.delete(project_id, function(code) {
        if(code == 0) {
          tasks_db.remove({ _id : task_id}, function(err) { counter++; });
        }
        else {
          tasks_db.update({ _id : task_id}, {$set: {status: code}},
            function(err) { counter++; });
        }
      });
   }
}

tasks_db.find({}, function(err, tasks) {
   nbTasks = tasks.length;
   for(i=0;i<tasks.length;i++) {
     manageTask(tasks[i]);
   }
});

function checkIsOver() {
  console.log("Checking progress... "+counter+"/"+nbTasks);
  if(nbTasks>-1 && counter == nbTasks) {
    clearInterval(interval);
    process.exit(0);
  }
}

interval = setInterval(function() {checkIsOver();},2000);
