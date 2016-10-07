// third-party dependencies
const cors        = require('cors');
const jsonMessage = require('json-message');

module.exports = function (app, options) {

  return cors({
    origin: function (origin, cb) {
      var whitelisted = app.services.cors.isOriginWhitelisted(origin);

      if (!whitelisted) {
        console.warn('request from not-whitelisted origin %s', origin);
      }

      cb(null, whitelisted);
    }
  });

};
