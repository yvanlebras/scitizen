
/**
 * Module dependencies.
 */

var CONFIG = require('config');

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , project = require('./routes/project')
  , image = require('./routes/image')
  , http = require('http')
  , url = require('url')
  , formidable = require('formidable')
  , mongo = require('mongodb')
  , monk = require('monk')
  , db = monk('localhost:27017/'+CONFIG.general.db)
  , users = db.get('users')
  , projects = db.get('projects')
  , images = db.get('images')
  , sciconfig = db.get('config')
  , bcrypt = require('bcryptjs')
  , path = require('path');


var pkgcloud = require("pkgcloud");


var flash = require('connect-flash');


/**
* Create admin user if none
*/
var salt = null;

sciconfig.findOne( { name: 'default'}, function(err, config) {
    if(!config) {
        salt = bcrypt.genSaltSync(10);
        sciconfig.insert({ name: 'default', salt: salt }, function(err) {
            //createAdmin();
        });
    }
    else {
        salt = config.salt;
        //createAdmin();
    }
});

function createAdmin() {
    users.findOne({ username: 'admin' }, function (err, user) {
    if(!user) {
        var hash = bcrypt.hashSync('passwd', salt);
        users.insert({ username: 'admin', password: hash, group: ['admin']})
        console.log("Create admin user with password: passwd");
    }
    else {
        console.log("admin user already exists");
        console.log(user);
    }
});
}


/**
* Authentication
*/
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

passport.serializeUser(function(user, done) {
  done(null, user.username);
});

passport.deserializeUser(function(id, done) {
  users.findOne({ username : id }, function(err, user) {
    done(err, user);
  });
});


passport.use(new LocalStrategy(
  function(username, password, done) {
    users.findOne({ username: username }, function (err, user) {
      console.log(user);
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if(! user.registered) {
        return done(null, false, { message: 'Registration not yet completed'});
      }
      var hash = bcrypt.hashSync(password, salt);
      console.log(user.password+" =? "+hash);
      if (user.password!=hash) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));



var app = express();

app.engine('html', require('hogan-express'));

app.configure(function() {
app.use(express.cookieParser('my cookie secret'));
app.use(express.session({ secret: 'keyboard cat' }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.set('layout', 'layouts/default/public');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
//app.use(express.multipart());
//app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
});

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/my', ensureAuthenticated, user.my);
app.get('/admin', ensureAuthenticated, user.admin);
app.get('/users', user.list);
app.get('/users/register', user.register_new);
app.post('/users/register', user.register);
app.get('/users/confirm', user.confirm);
app.get('/project', project.list);
app.post('/project', project.add);
//app.get('/projects', project.list);
app.get('/project/:id', project.get);
app.delete('/project/:id', project.delete);
app.put('/project/:id', project.edit);
app.post('/project/:id', project.upload);
app.get('/project/:id/dashboard', project.dashboard);
app.get('/project/:id/current', project.current);
//app.get('/project/:id/random', project.random);
//app.get('/project/:id/map', project.map);
app.get('/project/:id/around/:long/:lat/:dist', project.around);
app.get('/project/:id/image', image.list);
app.delete('/image/:id', image.delete);
app.get('/image/:id', image.get);
app.put('/image/:id', image.curate);
app.put('/image/:id/validate', image.validate);
app.get('/image/:id/control', image.control);

app.get('/login', user.login);
app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login',
                                   failureFlash: true }),
  function(req, res) {
    res.redirect('/my');
  }
);

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  else {
    res.redirect('/login');
  }
}

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
