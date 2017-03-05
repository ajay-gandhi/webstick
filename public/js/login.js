/**
 * Ensures user is logged in to Facebook. Emits an event when login is confirmed
 * and document is ready.
 */

var login_page = 'index.html';

// FB SDK
window.fbAsyncInit = function() {
  FB.init({
    appId      : '270085160043418',
    cookie     : true,
    xfbml      : true,
    version    : 'v2.5'
  });

  // Check login status
  FB.getLoginStatus(check_login_status);
};

// Load FB SDK
(function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s); js.id = id;
  js.src = "//connect.facebook.net/en_US/sdk.js";
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

var doc_ready, login_ready, user_id;

$(document).ready(function () {
  doc_ready = true;
  is_ready();
});

var check_login_status = function (response) {
  if (response.status === 'connected') {
    // logged in!
    user_id = response.authResponse.userID;
    login_ready = true;
    is_ready();

  } else {
    // Redirect to login
    window.location = login_page;
  }
}

// If document is ready and logged in, emit fully ready event
var is_ready = function () {
  if (doc_ready && login_ready) {
    $.ajaxSetup({
      data: { user_id: user_id }
    });

    $.event.trigger({
      type: 'fully_ready'
    });
  }
}

// Intercept all AJAX calls and confirm logged in (just in case)
// Append FB user ID to data
var confirm_logged_in = function (jqXHR, data) {
  if (login_ready) {
    return true;

  // Redirect to login
  } else {
    window.location = login_page;
    return false;
  }
}
$.ajaxSetup({
  method: 'POST',
  beforeSend: confirm_logged_in
});
