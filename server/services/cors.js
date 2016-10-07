// third-party dependencies
const urlWhitelist = require('@habemus/url-whitelist');

module.exports = function (app, options) {

  var corsWhitelist = options.corsWhitelist || [];

  var cors = {
    isOriginWhitelisted: urlWhitelist(corsWhitelist),
  };

  return cors;
};