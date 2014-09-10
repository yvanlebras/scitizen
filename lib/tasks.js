var CONFIG = require('config');

var mongo = require('mongodb'),
   monk = require('monk'),
   db = monk(CONFIG.mongo.host+':'+CONFIG.mongo.port+'/'+CONFIG.general.db),
   tasks_db = db.get('tasks'),
   path = require('path');


var amqp = require('amqp');

var amqp_config = { host: CONFIG.rabbitmq.host,
                    port: CONFIG.rabbitmq.port,
                    vhost: CONFIG.rabbitmq.vhost
                 };


if(CONFIG.rabbitmq.login !== '' && CONFIG.rabbitmq.login !== undefined) {
  amqp_config.login = CONFIG.rabbitmq.login;
  amqp_config.password = CONFIG.rabbitmq.password;
}

var ready = true;
var sendMessage = function(exchange, payload) {};

var amqp_exchange = null;

if(CONFIG.rabbitmq.host === '' || CONFIG.rabbitmq.host === undefined) {
    console.log('Using fake messaging');
    amqp_exchange = {
      publish: function(q, p, o, callback){
        callback(false);
      }
    };
}
else {
  connection = amqp.createConnection(amqp_config);
  // Wait for connection to become established.
  connection.on('ready', function () {
    connection.exchange('scitizen-exchange',
                      options={type:'fanout', durable: true, autoDelete: false},
                      function(exchange) {
                        console.log('amqp ready');
                        ready = true;
                        amqp_exchange = exchange;
                        sendMessage = function(exchange, payload) {
                          var encoded_payload = JSON.stringify(payload);
                          exchange.publish('scitizen-queue',
                                            encoded_payload,
                                            {},
                                            function(err) {
                                              console.log(err);
                                            });
                        };
                      });
  });
}

exports.send = function(payload) {
  if(! ready) {
    callback(true);
    return;
  }
  sendMessage(amqp_exchange, payload);
};
