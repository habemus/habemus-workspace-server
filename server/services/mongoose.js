const mongoose = require('mongoose');
const Bluebird = require('bluebird');

mongoose.Promise = Bluebird;

module.exports = function (app, options) {
  
  var mongooseService = {};
  
  return new Bluebird((resolve, reject) => {
    var conn = mongoose.createConnection(options.mongodbURI);
    
    mongooseService.connection = conn;
    
    conn.once('connected', _resolve);
    conn.once('error', _reject);
    conn.once('disconnected', _reject);

    function off () {
      conn.removeListener('connected', _resolve);
      conn.removeListener('error', _reject);
      conn.removeListener('disconnected', _reject);
    }

    function _resolve () {
      off();
      resolve();
    }

    function _reject () {
      off();
      reject();
    }
  })
  .then(() => {
    
    var conn = mongooseService.connection;
    
    // load models
    mongooseService.models = {};
    mongooseService.models.Workspace =
      require('../models/workspace')(conn, app, options);
      
    return mongooseService;
  });
};
