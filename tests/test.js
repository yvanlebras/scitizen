// force the test environment to 'test'
process.env.NODE_ENV = 'test';
process.env.PORT = 3001;

// get the application server module
var app = require('../app');
var http = require('http');
var path = require('path');
var fs = require('fs');

var expect = require('chai').expect;

var CONFIG = require('config');

var monk = require('monk'),
   db = monk('localhost:27017/'+CONFIG.general.db),
   users = db.get('users'),
   projects = db.get('projects'),
   tasks = db.get('tasks'),
   images = db.get('images');

var image_tasks = require('../lib/image_tasks');

var querystring = require('querystring');

var scitizen_storage = require('scitizen-storage');
scitizen_storage.configure(CONFIG.general.storage, CONFIG.storage);


var test_context =  {};

  function encodeFieldPart(boundary,name,value) {
    var return_part = '--' + boundary + '\r\n';
    return_part += 'Content-Disposition: form-data; name="' + name + '"\r\n\r\n';
    return_part += value + '\r\n';
    return return_part;
  }
  function encodeFilePart(boundary,type,name,filename) {
    var return_part = '--' + boundary + '\r\n';
    return_part += 'Content-Disposition: form-data; name="' + name + '"; filename="' + filename + '"\r\n';
    return_part += 'Content-Type: ' + type + '\r\n\r\n';
    return return_part;
  }

describe('Anonymous', function() {
  before(function() {
    this.server = http.createServer(app).listen(app.get('port'));
  });

  beforeEach(function(done){
    tasks.remove({}, function(err){});
    projects.remove({}, function(err) {
    users.remove({}, function(err) {
    images.remove({}, function(err) {
    test_context.users = [{
        username: 'test',
        password: '123',
        group: ['default'],
        registered: true,
        regkey: '123',
        key: '123'
      }];
    users.insert(test_context.users, function(err, user) {
            if(err) {
              console.log(err);
              done(err);
            }
            projects.insert([{
                name: 'test',
                short_description: 'short',
                description: 'long',
                api: '123',
                stats: {quota: 0},
                owner: 'test',
                users: [ 'test' ],
                public: true,
                geo: true,
                status:true,
                validation: false,
                form: {}
                },
                {
                name: 'test2',
                short_description: 'short',
                description: 'long',
                api: '123',
                stats: {quota: 0},
                owner: 'test',
                users: [ 'test' ],
                public: false,
                geo: true,
                status:true,
                validation: false,
                form: {}
                }
                ], function(err, project) {
                    if(err) {
                        console.log(err);
                    }
                    projects.find({}, function(err, projects){
                      test_context.projects = projects;
                      var test_images = [
                        { name: 'image1',
                          project: test_context.projects[0]._id,
                          validated: true,
                          need_spam_control: false,
                          ready: true,
                          user: 'test'
                        },
                        { name: 'image2',
                          project: test_context.projects[0]._id,
                          validated: false,
                          need_spam_control: false,
                          ready: true,
                          user: ''
                        },
                        { name: 'image3',
                          project: test_context.projects[1]._id,
                          validated: true,
                          need_spam_control: false,
                          ready: true,
                          user: 'test'
                        },
                        { name: 'image4',
                          project: test_context.projects[1]._id,
                          validated: false,
                          need_spam_control: false,
                          ready: true,
                          user: ''
                        },
                        ];
                      images.insert(test_images, function(err) {
                        images.find({}, function(err, images){
                          test_context.images = images;
                          done();
                        });
                      });
                    });
            });
    });

    });
    });
    });

  });

  it('anonymous cannot create a project', function(done) {
    var options = {
        hostname: 'localhost',
        port: app.get('port'),
        path: '/project',
        method: 'POST'
    };
    var req = http.request(options, function(res) {
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(res.headers));
        expect(res.statusCode).to.not.equal(200);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            done();
            //console.log('BODY: ' + chunk);
        });
    });
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        expect(false).to.be.true;
        done();
    });
    req.end();

  });

  it('anonymous cannot list users', function(done) {
    var options = {
        hostname: 'localhost',
        port: app.get('port'),
        path: '/users',
        method: 'GET'
    };
    var req = http.request(options, function(res) {
        expect(res.statusCode).to.equal(401);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            done();
        });
    });
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        expect(false).to.be.true;
        done();
    });
    req.end();
  });

  it('anonymous cannot get a user info', function(done) {
    var options = {
        hostname: 'localhost',
        port: app.get('port'),
        path: '/users/'+test_context.users[0]._id,
        method: 'GET'
    };
    var req = http.request(options, function(res) {
        expect(res.statusCode).to.equal(401);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            done();
        });
    });
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        expect(false).to.be.true;
        done();
    });
    req.end();
  });

  it('anonymous cannot edit a user info', function(done) {
    var options = {
        hostname: 'localhost',
        port: app.get('port'),
        path: '/users/'+test_context.users[0]._id,
        method: 'PUT'
    };
    var req = http.request(options, function(res) {
        expect(res.statusCode).to.equal(401);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            done();
        });
    });
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        expect(false).to.be.true;
        done();
    });
    req.end();
  });

  it('anonymous cannot change API of a user',
    function(done) {
      var options = {
        hostname: 'localhost',
        port: app.get('port'),
        path: '/users/'+test_context.users[0]._id+'/key',
        method: 'PUT'
      };
      var req = http.request(options, function(res) {
        expect(res.statusCode).to.equal(401);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          done();
        });
      });
      req.on('error', function(e) {
        expect(false).to.be.true;
        console.log('problem with request: ' + e.message);
        done();
      });
      req.end();
  });

  it('anonymous cannot change password of a user',
    function(done) {
      var options = {
        hostname: 'localhost',
        port: app.get('port'),
        path: '/users/'+test_context.users[0]._id+'/password',
        method: 'PUT'
      };
      var req = http.request(options, function(res) {
        expect(res.statusCode).to.equal(401);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          done();
        });
      });
      req.on('error', function(e) {
        expect(false).to.be.true;
        console.log('problem with request: ' + e.message);
        done();
      });
      req.end();
  });


  it('anonymous cannot suspend a user',
    function(done) {
      var options = {
        hostname: 'localhost',
        port: app.get('port'),
        path: '/users/'+test_context.users[0]._id+'/suspend',
        method: 'PUT'
      };
      var req = http.request(options, function(res) {
        expect(res.statusCode).to.equal(401);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          done();
        });
      });
      req.on('error', function(e) {
        expect(false).to.be.true;
        console.log('problem with request: ' + e.message);
        done();
      });
      req.end();
  });

  it('anonymous can get public project list', function(done) {
    var options = {
        hostname: 'localhost',
        port: app.get('port'),
        path: '/project',
        method: 'GET'
    };
    var req = http.request(options, function(res) {
        expect(res.statusCode).to.equal(200);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            var projects = JSON.parse(chunk);
            expect(projects.length).to.equal(1);
            done();
        });
    });
    req.on('error', function(e) {
        expect(false).to.be.true;
        console.log('problem with request: ' + e.message);
        done();
    });
    req.end();
  });

  it('anonymous can get public project', function(done) {
    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[0]._id,
      method: 'GET'
    };
    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(200);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          var project = JSON.parse(chunk);
          expect(project._id).to.equal(test_context.projects[0]._id.toHexString());
          done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();
  });

  it('anonymous cannot get private project', function(done) {
    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[1]._id,
      method: 'GET'
    };
    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(401);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();
  });

  it('anonymous cannot edit a public project', function(done) {
    var form_data =  querystring.stringify({
      description: 'change'
    });

    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[0]._id,
      method: 'PUT',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': form_data.length
      }
    };

    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(401);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.write(form_data);
    req.end();
  });

  it('anonymous cannot edit a private project', function(done) {

    var form_data =  querystring.stringify({
      description: 'change'
    });

    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[1]._id,
      method: 'PUT',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': form_data.length
      }
    };


    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(401);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.write(form_data);
    req.end();
  });

  it('anonymous cannot delete a public project', function(done) {
    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[0]._id,
      method: 'DELETE'
    };
    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(401);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();
  });

  it('anonymous cannot delete a private project', function(done) {
    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[1]._id,
      method: 'DELETE'
    };
    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(401);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();
  });

  it('anonymous cannot get a project statistics', function(done) {
    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[0]._id+'/stats',
      method: 'GET'
    };
    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(401);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();


  });

  it('anonymous can list validated images of a public project', function(done) {
    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[0]._id+'/image',
      method: 'GET'
    };
    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(200);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        var images = JSON.parse(chunk);
        expect(images.length).to.equal(1);
        done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();
  });

  it('anonymous can get a validated image of a public project', function(done) {
    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/image/'+test_context.images[0]._id,
      method: 'GET'
    };
    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(200);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        var image = JSON.parse(chunk);
        expect(image.name).to.equal(test_context.images[0].name);
        done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();
  });

  it('anonymous cannot get a non validated image of a public project',
    function(done) {
      var options = {
        hostname: 'localhost',
        port: app.get('port'),
        path: '/image/'+test_context.images[1]._id,
        method: 'GET'
      };
      var req = http.request(options, function(res) {
        expect(res.statusCode).to.equal(401);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          done();
        });
      });
      req.on('error', function(e) {
        expect(false).to.be.true;
        console.log('problem with request: ' + e.message);
        done();
      });
      req.end();
  });

  it('anonymous can post an image to a public project', function(done) {
    var boundary = Math.random();
    var post_data = [];
    var fields = {
      location: '11,22',
      key1: 'value1',
      key2: 'value2'
    };
    var files = [{ type: 'image/jpeg',
               keyname: 'image',
               valuename: 'image.jpg',
               data: 'xxx'
        }];

    for (var key in fields) {
      var value = fields[key];
      post_data.push(new Buffer(encodeFieldPart(boundary, key, value), 'ascii'));
    }

    for (var key in files) {
      var value = files[key];
      post_data.push(new Buffer(encodeFilePart(boundary, value.type, value.keyname, value.valuename), 'ascii'));
      post_data.push(new Buffer(value.data, 'utf8'))
    }

    post_data.push(new Buffer('\r\n--' + boundary + '--'), 'ascii');
    var length = 0;

    for(var i = 0; i < post_data.length; i++) {
      length += post_data[i].length;
    }

    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[0]._id,
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': length
      }
    };

    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(200);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        var image = JSON.parse(chunk);
        expect(image.fields.key1).to.equal('value1');
        tasks.find({}, function(err, task_list) {
          expect(task_list.length).to.equal(1);
          expect(task_list[0].type).to.equal('rescale');
          done();
        });
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    for (var i = 0; i < post_data.length; i++) {
      req.write(post_data[i]);
    }
    req.end();
  });

  it('anonymous cannot post an image to a private project', function(done) {
    var boundary = Math.random();
    var post_data = [];
    var fields = {
      location: '11,22',
      key1: 'value1',
      key2: 'value2'
    };
    var files = [{ type: 'image/jpeg',
               keyname: 'image',
               valuename: 'image.jpg',
               data: 'xxx'
        }];

    for (var key in fields) {
      var value = fields[key];
      post_data.push(new Buffer(encodeFieldPart(boundary, key, value), 'ascii'));
    }

    for (var key in files) {
      var value = files[key];
      post_data.push(new Buffer(encodeFilePart(boundary, value.type, value.keyname, value.valuename), 'ascii'));
      post_data.push(new Buffer(value.data, 'utf8'))
    }

    post_data.push(new Buffer('\r\n--' + boundary + '--'), 'ascii');
    var length = 0;

    for(var i = 0; i < post_data.length; i++) {
      length += post_data[i].length;
    }

    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[1]._id,
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': length
      }
    };

    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(401);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    for (var i = 0; i < post_data.length; i++) {
      req.write(post_data[i]);
    }
    req.end();
  });


  it('anonymous can curate an image of a public project', function(done) {
    var form_data =  querystring.stringify({
      form_elts: 'description,other',
      description: 'change',
      other: 'any'
    });

    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/image/'+test_context.images[0]._id,
      method: 'PUT',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': form_data.length
      }
    };

    var req = http.request(options);
    req.on('response', function(res) {
      expect(res.statusCode).to.equal(200);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          images.findOne({ _id: test_context.images[0]._id },
            function(err, image) {
              if(err) { expect(false).to.be.true; }
              expect(image.stats.description.change).to.equal(1);
              expect(image.stats.other.any).to.equal(1);
              done();
          });
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.write(form_data);
    req.end();

  });

  it('anonymous cannot curate an image of a private project', function(done) {
    var form_data =  querystring.stringify({
      form_elts: 'description,other',
      description: 'change',
      other: 'any'
    });

    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/image/'+test_context.images[2]._id,
      method: 'PUT',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': form_data.length
      }
    };

    var req = http.request(options);
    req.on('response', function(res) {
      expect(res.statusCode).to.equal(401);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.write(form_data);
    req.end();
  });


  it('anonymous cannot delete an image of a private project', function(done) {
    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/image/'+test_context.images[0]._id,
      method: 'DELETE'
    };
    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(401);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();
  });


  it('anonymous cannot list *my* images of a public project', function(done) {
    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[0]._id+'/image/my',
      method: 'GET'
    };
    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(401);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();
  });


  after(function(done) {
    var myapp = this.server;
    this.server.close(done);
  });
});


describe('Authenticated', function() {
  before(function() {
    this.server = http.createServer(app).listen(app.get('port'));
  });

  beforeEach(function(done){
    projects.remove({}, function(err) {
    users.remove({}, function(err) {
    images.remove({}, function(err) {
    tasks.remove({}, function(err) {
      test_context.users = [{
          username: 'test',
          password: '123',
          group: ['default'],
          registered: true,
          regkey: '123',
          key: '123'
        },
        {
            username: 'testadmin',
            password: '123',
            group: ['default'],
            registered: true,
            regkey: '123',
            key: '321'
          }
        ]

    users.insert(test_context.users , function(err, user) {
            if(err) {
              console.log(err);
              done(err);
            }
            projects.insert([{
                name: 'test',
                short_description: 'short',
                description: 'long',
                api: '123',
                stats: {quota: 0},
                owner: 'test',
                users: [ 'test' ],
                public: true,
                geo: true,
                status:true,
                validation: false,
                form: {}
                },
                {
                name: 'test2',
                short_description: 'short',
                description: 'long',
                api: '123',
                stats: {quota: 0},
                owner: 'test',
                users: [ 'test' ],
                public: false,
                geo: true,
                status:true,
                validation: false,
                form: {}
                }
                ], function(err, project) {
                    if(err) {
                        console.log(err);
                    }
                    projects.find({}, function(err, projects){
                      test_context.projects = projects;
                      var test_images = [
                        { name: 'image1',
                          project: test_context.projects[0]._id,
                          validated: true,
                          need_spam_control: false,
                          ready: true,
                          user: 'test'
                        },
                        { name: 'image2',
                          project: test_context.projects[0]._id,
                          validated: false,
                          need_spam_control: false,
                          ready: false,
                          user: ''
                        },
                        { name: 'image3',
                          project: test_context.projects[1]._id,
                          validated: true,
                          need_spam_control: false,
                          ready: true,
                          user: 'test'
                        },
                        { name: 'image4',
                          project: test_context.projects[0]._id,
                          validated: false,
                          need_spam_control: false,
                          ready: false,
                          user: ''
                        },
                        ];
                        images.insert(test_images, function(err) {
                          images.find({}, function(err, images){
                            test_context.images = images;
                            done();
                          });
                        });

                    });
            });
    });

    });
    });
    });
    });

  });

  it('user can get his user info', function(done) {
    var options = {
        hostname: 'localhost',
        port: app.get('port'),
        path: '/users/'+test_context.users[0]._id+"?api=123",
        method: 'GET'
    };
    var req = http.request(options, function(res) {
        expect(res.statusCode).to.equal(200);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            done();
        });
    });
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        expect(false).to.be.true;
        done();
    });
    req.end();
  });

  it('user can edit its user data', function(done) {

    var form_data =  querystring.stringify({
      description: 'change',
      api: '123'
    });

    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/users/'+test_context.users[0]._id,
      method: 'PUT',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': form_data.length
      }
    };


    var req = http.request(options);
    req.on('response', function(res) {
      expect(res.statusCode).to.equal(200);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          users.findOne({ _id: test_context.users[0]._id },
            function(err, user) {
              if(err) { expect(false).to.be.true; }
              expect(user.description).to.equal('change');
              done();
          });
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.write(form_data);
    req.end();

  });

  it('user can get public and own project list with API key', function(done) {
  var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project?api=123',
      method: 'GET'
  };
  var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(200);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          var projects = JSON.parse(chunk);
          expect(projects.length).to.equal(2);
          done();
      });
  });
  req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
  });
  req.end();
  });

  it('user can get private project he is member of', function(done) {
    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[1]._id+'?api=123',
      method: 'GET'
    };
    var req = http.request(options, function(res) {
      expect(res.statusCode).to.equal(200);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          var project = JSON.parse(chunk);
          expect(project._id).to.equal(test_context.projects[1]._id.toHexString());
          done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();
  });

  it('user can edit a private project he is member of', function(done) {

    var form_data =  querystring.stringify({
      description: 'change',
      api: '123'
    });

    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[1]._id,
      method: 'PUT',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': form_data.length
      }
    };


    var req = http.request(options);
    req.on('response', function(res) {
      expect(res.statusCode).to.equal(200);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          projects.findOne({ _id: test_context.projects[1]._id },
            function(err, project) {
              if(err) { expect(false).to.be.true; }
              expect(project.description).to.equal('change');
              done();
          });
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.write(form_data);
    req.end();

  });

  it('user can delete a private project he is member of', function(done) {

    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[1]._id+"?api=123",
      method: 'DELETE',
    };


    var req = http.request(options);
    req.on('response', function(res) {
      expect(res.statusCode).to.equal(200);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          tasks.find({},
            function(err, tasks) {
              if(err) { expect(false).to.be.true; }
              expect(tasks.length).to.equal(1);
              done();
          });
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();
  });



  it('user can renew its API key', function(done) {
    var key = test_context.users[0].key;
    var options = {
        hostname: 'localhost',
        port: app.get('port'),
        path: '/users/'+test_context.users[0]._id+"/key?api="+key,
        method: 'PUT'
    };
    var req = http.request(options, function(res) {
        expect(res.statusCode).to.equal(200);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            var user = JSON.parse(chunk);
            expect(user.key).not.to.equal('123');
            done();
        });
    });
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        expect(false).to.be.true;
        done();
    });
    req.end();
  });

  it('rescale an image to create a tiny image', function(done) {
    images.findOne({name: 'image1'}, function (err, image) {
      var orig_file_path = path.join(__dirname, "../public/images/world.png");
      var rstream = fs.createReadStream(orig_file_path);
      rstream.pipe(fs.createWriteStream('/tmp/scitizen-image.png'));
      var metadata = { project:  image.project, name: image.name };
      scitizen_storage.put(image._id.toHexString(),
                  '/tmp/scitizen-image.png',
                  metadata,
                  function(err, result) {
                    expect(err).to.equal(0);
                    image_tasks.rescale(image._id.toHexString(), function(res){
                      expect(res).to.equal(0);
                      scitizen_storage.get(('tiny-'+image._id.toHexString()),
                      function(err, tinyimage) {
                        expect(err).to.equal(0);
                        done();
                      });
                    });

      });

    });
  });


  it('delete all images of a project', function(done){
    this.timeout(8000);
    projects.findOne({name: 'test'}, function(err, project) {
      image_tasks.delete(project._id, function(err) {
        // There is no real file associated
        expect(err).to.equal(500);
        images.count({project: project._id}, function(err, nb) {
          expect(nb).to.equal(0);
          done();
        });
      });
    });
  });


  it('user can list *my* images of a project', function(done) {
    var options = {
      hostname: 'localhost',
      port: app.get('port'),
      path: '/project/'+test_context.projects[0]._id+'/image/my?api=123',
      method: 'GET'
    };
    var req = http.request(options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        var images = JSON.parse(chunk);
        expect(images.length).to.equal(1);
        done();
      });
    });
    req.on('error', function(e) {
      expect(false).to.be.true;
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();
  });


  after(function(done) {
    var myapp = this.server;
    this.server.close(done);
  });
});
