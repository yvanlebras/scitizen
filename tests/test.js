// force the test environment to 'test'
process.env.NODE_ENV = 'test';
process.env.PORT = 3001;

// get the application server module
var app = require('../app');
var http = require('http');

var expect = require('chai').expect;

var CONFIG = require('config');

var monk = require('monk'),
   db = monk('localhost:27017/'+CONFIG.general.db),
   users = db.get('users'),
   projects = db.get('projects');


var test_context =  {};

describe('projects', function() {
  before(function() {
    this.server = http.createServer(app).listen(app.get('port'));
  });

  before(function(done){
    projects.remove({}, function(err) {
    users.remove({}, function(err) {

    users.insert({
        username: 'test',
        password: '123',
        group: ['default'],
        registered: true,
        regkey: '123',
        key: '123'
        }, function(err, user) {
            test_context.user = user;
            if(err) {
              console.log(err);
              done(err);
            }
            projects.insert([{
                name: 'test',
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
                      done();
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
        expect().fail(e);
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
        expect.fail(e);
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
      expect.fail(e);
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
      expect(res.statusCode).to.equal(503);
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
          done();
      });
    });
    req.on('error', function(e) {
      expect.fail(e);
      console.log('problem with request: ' + e.message);
      done();
    });
    req.end();
  });


  it('user can get public project list with API key', function(done) {
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
      expect.fail(e);
      console.log('problem with request: ' + e.message);
      done();
  });
  req.end();
  });

  it('user can get private project', function(done) {
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
      expect.fail(e);
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
