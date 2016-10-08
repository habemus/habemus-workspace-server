// third-party dependencies
const expressJwt = require('express-jwt');

// exports a function that takes the app and some options and
// returns the middleware
module.exports = function (app, options) {

  /**
   * Secret used to verify access to the private API
   * @type {String}
   */
  const PRIVATE_API_SECRET = options.privateAPISecret;

  const errors = app.errors;

  return expressJwt({
    requestProperty: 'privateTokenData',
    secret: PRIVATE_API_SECRET
  });
};
