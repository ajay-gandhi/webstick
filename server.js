'use strict';

// NPM modules
var express = require('express');

// Local modules
var UserDB = require('./postgres');

var users = new UserDB();

// Set up express
var app = express();
app.set('port', (process.env.PORT || 8000));

app.use(express.static(__dirname + '/public'));

app.use(function (req, res, next) {
  if (req.method.toLowerCase() === 'post' && !req.body.user_id) {
    console.log('Request without user!', req.body);
  }
  next();
});

/**
 * Receive stickies, save them in db
 */
app.get('/sync', function (req, res) {
  users.set_stickies(req.query.user_id, req.query.stickies);
  users.page(req.query.user_id);
  res.send(true);
});

/**
 * Get stickies from db and send
 */
app.get('/getStickies', function (req, res) {
  res.send(users.get_stickies(req.query.user_id));
});

app.listen(app.get('port'), function () {
  console.log('Serving on port', app.get('port'));
});
