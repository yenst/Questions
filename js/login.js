"use strict";
var passport = require("passport");

let Login = (function() {
  let isLoggedIn = function(req, res, next) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated()) return next();

    // if they aren't redirect them to the home page
    res.redirect("/");
  };

  return{
      isLoggedIn
  }
})();

module.exports = {
  Login
};
