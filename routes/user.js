var monk = require('monk')
  , db = monk('localhost:27017/scitizen')
  , users_db = db.get('users')
  , sciconfig = db.get('config')
  , bcrypt = require('bcryptjs');

var nodemailer = require("nodemailer");
/*
 * GET users listing.
 */
var MAIL_CONFIG = require('config').mail;
var GENERAL_CONFIG = require('config').general;

var transport = nodemailer.createTransport("SMTP", {
    host: MAIL_CONFIG.host, // hostname
    secureConnection: MAIL_CONFIG.secure, // use SSL
    port: MAIL_CONFIG.port, // port for secure SMTP
    auth: {
        user: MAIL_CONFIG.user,
        pass: MAIL_CONFIG.password
    }
});

exports.list = function(req, res){
  res.send("respond with a resource");
};

exports.login = function(req, res){
    res.render('login', { messages:  req.flash('error') });
};

exports.my = function(req, res){
    res.render('my', { user: req.user.username });
};

var salt = null;

exports.register_new = function(req, res) {
  res.render('register');
}

exports.register = function(req, res) {
  var login = req.param("login");
  var password = req.param("password");
  var confirm = req.param("password_confirm");
  if(password!=confirm) {
    res.json({ err: 503, msg: "Passwords do not match"});
    return;
  }
  sciconfig.findOne( { name: 'default'}, function(err, config) {
      if(!config) {
          res.json({ err: 500, msg: "Application is not configured"})
      }
      else {
          salt = config.salt;
          createUser(login, password);
          res.json({ err: 0, msg: "User created"});
      }
  });
}

exports.confirm = function(req, res) {
  var login = req.param("user");
  var regkey = req.param("regkey");
  users_db.findOne({name: login}, function(err, user) {
    if(! user) {
      res.render("error", { msg: "User id or key is not valid"});
      return;
    }
    else {
        if(user.regkey == regkey) {
          users_db.update({ _id: user._id}, { registered: true}, function(err) {});
          res.redirect("/login");
          return;
        }
        else {
          res.render("error", { msg: "key is not valid"});
          return;
        }
    }
  });

}


function createUser(login, password) {
  var hash = bcrypt.hashSync('passwd', salt);
  var regkey = Math.random().toString(36).substring(7);
  users_db.insert({ username: login, password: hash, group: ['default'], registered: false, regkey: regkey });
  var link = GENERAL_CONFIG.url+encodeURI("users/confirm?user="+login+"&regkey="+regkey);
  var mailOptions = {
    from: MAIL_CONFIG.origin, // sender address
    to: login, // list of receivers
    subject: "Scitizen registration", // Subject line
    text: "You have created an account in Scitizen project, please confirm your subscription at the following link: "+link, // plaintext body
    html: "You have created an account in Scitizen project, please confirm your subscription at the following link: <a href=\""+link+"\">"+link+"</a>" // html body
}
}
