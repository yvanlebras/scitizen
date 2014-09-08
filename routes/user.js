var GENERAL_CONFIG = require('config').general;

var monk = require('monk'),
    db = monk('localhost:27017/'+GENERAL_CONFIG.db),
    users_db = db.get('users'),
    sciconfig = db.get('config'),
    bcrypt = require('bcryptjs');

var nodemailer = require('nodemailer');
/*
 * GET users listing.
 */
var MAIL_CONFIG = require('config').mail;
var transport = null;

var scitizen_auth = require('../lib/auth.js');


if(MAIL_CONFIG.host!='fake') {
  transport = nodemailer.createTransport('SMTP', {
    host: MAIL_CONFIG.host, // hostname
    secureConnection: MAIL_CONFIG.secure, // use SSL
    port: MAIL_CONFIG.port, // port for secure SMTP
    auth: {
        user: MAIL_CONFIG.user,
        pass: MAIL_CONFIG.password
    }
  });
}

exports.list = function(req, res){
  if(scitizen_auth.is_admin(req)) {
    // is admin
    users_db.find({}, function(err, users) {
      res.json(users);
    });
  }
  else {
    res.status(401).send('respond with a resource');
  }
};

exports.get = function(req, res){
  if((req.user!==undefined && req.user.username!==undefined)||
      req.param('api')!==undefined) {
    users_db.findOne({_id: req.param('id')}, function(err, user){
      // if current user or admin
      if(!err &&
        ((user.key == req.param('api')) ||
        scitizen_auth.is_admin(req) ||
        (user.username == req.user.username ))) {
        res.json(user);
      }
    });
  }
  else {
    res.status(401).send('Not authorized');
  }
};

exports.suspend = function(req, res) {
  if(scitizen_auth.is_admin(req)) {
    users_db.update({_id: req.param('id')},
                    { $set: { registered: false }}, function(err, user){
      // Now disable projects owned by user
      projects_db.update({ owner: user.username},
                          { status: false}, function(err){
        if(err) {
          console.log(err);
        }
        res.json(user);
      });

    });
  }
  else {
    res.status(401).send('Not authorized');
  }
};


exports.update_password = function(req, res) {
  if((req.user!==undefined && req.user.username!==undefined) ||
      req.param('api')!==undefined) {
      var user_updates = {};
      users_db.findOne({_id: req.param('id')}, function(err, user){
        if(!err &&
          ((user.key == req.param('api')) ||
          scitizen_auth.is_admin(req) ||
          (user.username == req.user.username ))) {
            var password = req.param('password');
            user_updates.password = bcrypt.hashSync(password, salt);

            users_db.update({ _id: req.param('id') },
                        {$set: user_updates},
                        function(err) {
                          if(err) {
                            console.log(err);
                            res.status(500).send('an error occured');
                            return;
                          }
                          res.json(user);
                        });
        }
        else {
            console.log(err);
            res.status(401).send('an error occured');
        }
        });
  }
  else {
    res.status(401).send('You need to login first');
  }

};

exports.update_key = function(req, res) {
  if((req.user!==undefined && req.user.username!==undefined) ||
      req.param('api')!==undefined) {
      var user_updates = {};
      users_db.findOne({_id: req.param('id')}, function(err, user){
        if(!err &&
          ((user.key == req.param('api')) ||
          scitizen_auth.is_admin(req) ||
          (user.username == req.user.username ))) {
            user_updates.key = (Math.random() + 1).toString(36).substring(7);
            user.key = user_updates.key;

            users_db.update({ _id: req.param('id') },
                        {$set: user_updates},
                        function(err) {
                          if(err) {
                            console.log(err);
                            res.status(500).send('an error occured');
                            return;
                          }
                          res.json(user);
                        });
        }
        else {
            console.log(err);
            res.status(401).send('an error occured');
        }
        });
  }
  else {
    res.status(401).send('You need to login first');
  }

};

exports.edit = function(req, res){
  if((req.user!==undefined && req.user.username!==undefined) ||
      req.param('api')!==undefined) {
    users_db.findOne({_id: req.param('id')}, function(err, user){
      // if current user or admin

      if(!err &&
        ((user.key == req.param('api')) ||
        scitizen_auth.is_admin(req) ||
        (user.username == req.user.username ))) {

          for(var elt in req.body.form) {
            // if not admin, do not allow changing username
            if((elt == 'username' ||
                elt == 'registered' ||
                elt == 'group' ||
                elt == 'api')&&
                GENERAL_CONFIG.admin.indexOf(user.username) == -1) {
              continue;
            }
            if(! Array.isArray(req.body.form[elt].values)) {
              if(req.body.form[elt].values == 'false') {
                req.body.form[elt].values = false;
              }
              if(req.body.form[elt].values == 'true') {
                req.body.form[elt].values = true;
              }
            }
          }
          users_db.update({ _id: req.param('id') },
                              {$set: req.body},
                              function(err) {
                                if(err) {
                                  console.log(err);
                                }
                                res.json({});
                              });
      }
      else {
        res.status(401).send('Not authorized');
      }
    });
  }
  else {
    res.status(401).send('You need to login first');
  }
};

exports.login = function(req, res){
    var username = '';
    if(req.user) {
        username = req.user.username;
    }
    var project = { theme: 'default' };
    res.render('login', { messages: req.flash('error'),
                          project: project,
                          user: username });
};

exports.my = function(req, res){
    users_db.findOne({username: req.user.username}, function(err, user) {
        if(! user) {
            res.redirect('/login');
        }
        else {
            var isAdmin = false;
            if(GENERAL_CONFIG.admin.indexOf(req.user.username)>-1) {
              isAdmin = true;
            }
            res.render('my', {
                                layout: 'layouts/default/index',
                                user: user,
                                isAdmin: isAdmin,
                                plans: GENERAL_CONFIG.plans
                              });
        }
    });
};

exports.admin = function(req, res){
    users_db.findOne({username: req.user.username}, function(err, user) {
        if(GENERAL_CONFIG.admin.indexOf(req.user.username)==-1) {
            res.redirect('/');
        }
        else {
            isAdmin = true;
            res.render('admin', {
                                  layout: 'layouts/default/index',
                                  user: user,
                                  isAdmin: isAdmin });
        }
    });
};

var salt = null;

exports.register_new = function(req, res) {
  var project = { theme: 'default' };
  res.render('register', { layout: 'layouts/default/public',
                           user: '',
                           project: project});
};

exports.register = function(req, res) {
  var login = req.param('login');
  var password = req.param('password');
  var confirm = req.param('password_confirm');
  if(password!=confirm) {
    res.json({ err: 503, msg: 'Passwords do not match'});
    return;
  }
  sciconfig.findOne( { name: 'default'}, function(err, config) {
      if(!config) {
          res.json({ err: 500, msg: 'Application is not configured'});
      }
      else {
          salt = config.salt;
          createUser(login, password);
          res.json({ err: 0, msg: 'User created'});
      }
  });
};

exports.password_reset_request = function(req, res){
  var login = req.param('login');
  if(login === undefined) {
    res.json({ err: 401, msg: 'Missing user id'});
    return;
  }
  users_db.findOne({username: login}, function(err, user) {
    if(err) {
      res.json({ err: 401, msg: 'USer does not exist'});
      return;
    }
    var link = GENERAL_CONFIG.url +
                encodeURI('users/'+user._id+
                          '/password_reset?login='+
                          login+'&regkey='+user.regkey);
    var mailOptions = {
      from: MAIL_CONFIG.origin, // sender address
      to: login, // list of receivers
      subject: 'Scitizen password modification request', // Subject line
      text: 'You have request a password reset,' +
            'Go to the following link to modify your password: '+
            link, // plaintext body
      html: 'You have request a password reset, '+
             'click the following link to modify your password:'+
             ' <a href="'+link+'">'+
             link+'</a>' // html body
    };
    if(transport!==null) {
      transport.sendMail(mailOptions, function(error, response){
        if(error){
          console.log(error);
        }
      });
    }
    res.json({ err: 0, msg: 'An email has been sent to your mailbox with a link to reset your password.'});
    return;
  });
};

exports.password_reset = function(req, res) {
  var login = req.param('login');
  var regkey = req.param('regkey');
  var password = req.param('password');
  var confirm = req.param('password_confirm');
  if(password === undefined) {
    res.render('password_reset', { layout: 'layouts/default/public',
                           user: login, regkey: regkey, user_id: req.param('id') });
  }
  else {
    if(password!=confirm) {
      res.json({ err: 503, msg: 'Passwords do not match'});
      return;
    }
    sciconfig.findOne( { name: 'default'}, function(err, config) {
        if(!config) {
            res.json({ err: 500, msg: 'Application is not configured'});
        }
        else {
          users_db.findOne({username: login}, function(err, user) {
            if(err) {
              res.json({ err: 401, msg: 'USer does not exist'});
              return;
            }
            if(user.regkey == regkey) {
              salt = config.salt;
              var hash = bcrypt.hashSync(password, salt);
              users_db.update({_id: user._id},
                            {$set: {password: hash}
                            });
              res.json({ err: 0, msg: 'Password modified'});
            }
            else {
              res.json({ err: 0, msg: 'key is not valid'});
              return;
            }
        });
        }
    });

  }


};

exports.confirm = function(req, res) {
  var login = req.param('user');
  var regkey = req.param('regkey');
  users_db.findOne({username: login}, function(err, user) {
    if(! user) {
      res.render('error', { msg: 'User id or key is not valid'});
      return;
    }
    else {
        if(user.regkey == regkey) {
          users_db.update({ _id: user._id},
                          { $set: { registered: true}}, function(err) {});
          res.redirect('/login');
          return;
        }
        else {
          res.render('error', { msg: 'key is not valid'});
          return;
        }
    }
  });
};


function createUser(login, password) {
  var hash = bcrypt.hashSync(password, salt);
  var apikey = (Math.random() + 1).toString(36).substring(7);
  var regkey = Math.random().toString(36).substring(7);
  var groups = ['default'];
  if(GENERAL_CONFIG.admin.indexOf(login)>-1) {
    groups.push('admin');
  }
  users_db.insert({ username: login,
                    password: hash,
                    group: groups,
                    registered: false,
                    regkey: regkey,
                    key: apikey
                  });
  var link = GENERAL_CONFIG.url +
              encodeURI('users/confirm?user='+login+'&regkey='+regkey);
  var mailOptions = {
    from: MAIL_CONFIG.origin, // sender address
    to: login, // list of receivers
    subject: 'Scitizen registration', // Subject line
    text: 'You have created an account in Scitizen project,' +
          'please confirm your subscription at the following link: '+
          link, // plaintext body
    html: 'You have created an account in Scitizen project, please confirm '+
           'your subscription at the following link: <a href="'+link+'">'+
           link+'</a>' // html body
  };
  if(transport!==null) {
    transport.sendMail(mailOptions, function(error, response){
      if(error){
        console.log(error);
      }
    });
  }
}
