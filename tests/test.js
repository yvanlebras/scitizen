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
        regkey: '123'
        }, function(err, user) {
            if(err) {
            console.log(err);
            done(err);
            }
            projects.insert({
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
                }, function(err, project) {
                    if(err) {
                        console.log(err);
                    }
                    done();
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
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        expect(res.statusCode).to.equal(200);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
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
 
  after(function(done) {
    var myapp = this.server;
    this.server.close(done);
  });
});

