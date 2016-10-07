// third-party
const Bluebird = require('bluebird');

const PrivateHAccount = require('h-account-client/private');

module.exports = function (app, options) {
  
  return new Bluebird((resolve, reject) => {
    resolve(new PrivateHAccount({
      serverURI: options.hAccountURI,
    }));
  });
};
