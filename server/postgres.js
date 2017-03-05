/**
 * User database module backed by PostGreSQL. Supports get/set operations.
 */

'use strict';

var pg = require('pg');
pg.defaults.ssl = true;

module.exports = (function () {

  function PostGres () {
    this.users = {};
    var self = this;

    pg.connect(process.env.DATABASE_URL, function (err, client) {
      if (err) throw err;

      self.client = client;

      client.query('CREATE TABLE IF NOT EXISTS users (' +
        'user_id SERIAL PRIMARY KEY, ' +
        'fb_user_id varchar(20) NOT NULL, ' +
        'stickies text NOT NULL' +
      ')');

      client
        .query('SELECT * FROM users')
        .on('row', function (row) {
          self.users[row.fb_user_id] = row;
          self.users[row.fb_user_id].stickies = JSON.parse(self.users[row.fb_user_id].stickies);
        });
    });
    return this;
  }

  /**
   * Get a user from the database. If the user isn't found, create it.
   */
  PostGres.prototype.get_user = function (fb_uid) {
    var user = this.users[fb_uid];
    if (user) return user;

    // User didn't exist, create new
    this.save_user({
      fb_user_id: fb_uid,
      stickies: '{}'
    });
    return this.users[fb_uid];
  }

  /**
   * Updates a user in the database
   */
  PostGres.prototype.save_user = function (user_data) {
    this.users[user_data.fb_user_id] = user_data;
  }

  /****************************** Public Methods ******************************/

  /**
   * Saves the given data as the user's stickies
   */
  PostGres.prototype.set_stickies = function (fb_uid, data) {
    var user = this.get_user(fb_uid);
    user.stickies = data;
    this.save_user(user);
  }

  /**
   * Retrieves the user's stickies as a string
   */
  PostGres.prototype.get_stickies = function (fb_uid) {
    return this.get_user(fb_uid).stickes;
  }

  /**
   * Page the user to the database.
   */
  PostGres.prototype.page = function (fb_uid) {
    var user = this.get_user(fb_uid);
    var self = this;

    if (user.user_id) {
      // Update
      self.client.query("UPDATE users SET stickies = '" +
        JSON.stringify(user.stickies) + "' WHERE user_id = '" +
        user.user_id + "'");

    } else {
      // New addition to db
      self.client
        .query('INSERT INTO users (fb_user_id, stickies) ' + "VALUES ('" +
          fb_uid + "', '" + user.stickies + "') " +
          'RETURNING user_id, fb_user_id, stickies')
        .on('row', function (row) {
          self.save_user({
            user_id: row.user_id,
            fb_user_id: row.fb_user_id,
            stickies: row.stickies
          });
        });
    }
  }

  return PostGres;

})();
