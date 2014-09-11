var CONFIG = require('config');

var fs = require('fs');
var user = require('../routes/user'),
   project = require('../routes/project'),
   image = require('../routes/image'),
   mongo = require('mongodb'),
   monk = require('monk'),
   db = monk('localhost:27017/'+CONFIG.general.db),
   tasks_db = db.get('tasks'),
   sciconfig = db.get('config'),
   path = require('path');
   image_tasks = require('../lib/image_tasks');

var amqp = require('amqp');

var amqp_config = { host: CONFIG.rabbitmq.host,
                    port: CONFIG.rabbitmq.port,
                    vhost: CONFIG.rabbitmq.vhost
                  }

if(CONFIG.rabbitmq.login !== '' && CONFIG.rabbitmq.login !== undefined) {
  amqp_config.login = CONFIG.rabbitmq.login;
  amqp_config.password = CONFIG.rabbitmq.password;
}

var connection = amqp.createConnection(amqp_config);

var count = 1;

var args = process.argv.slice(2);

// Wait for connection to become established.
connection.on('ready', function () {
  // Use the default 'amq.topic' exchange
  connection.exchange("scitizen-exchange",
                    options={type:'fanout', durable: true, autoDelete: false},
                    function(exchange) {
  connection.queue('scitizen-queue', {durable: true, autoDelete: false}, function (q) {
      // Catch all messages
      q.bind(exchange, '');

      // Receive messages
      q.subscribe(function (message) {
        // Print messages to stdout
        var mtask = JSON.parse(message.data);
        console.log(mtask);
        var task_id = mtask._id;
        tasks_db.findOne({ _id : task_id}, function(err, task){
          if(err) {
            console.log('Could not found task ' + task_id);
            return;
          }
          if(task.type == 'rescale') {
            var image_id = task.objectid;
            image_tasks.rescale(image_id, function(code) {
              if(code == 0) {
                tasks_db.remove({ _id : task_id});
              }
              else {
                tasks_db.update({ _id : task_id}, {$set: {status: code}});
              }
            });
          }
          else if(task.type == 'remove') {
            var project_id = task.objectid;
            image_tasks.delete(project_id, function(code) {
              if(code == 0) {
                tasks_db.remove({ _id : task_id});
              }
              else {
                tasks_db.update({ _id : task_id}, {$set: {status: code}});
              }
            });
          }
        });
      });
  });

  });

});
