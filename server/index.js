// third-party dependencies
const express  = require('express');
const socketIO = require('socket.io');
const Bluebird = require('bluebird');

const setupServices = require('./services');

module.exports = function (options) {

  if (!options.mongodbURI) { throw new Error('mongodbURI is required'); }
  if (!options.redisURI)   { throw new Error('redisURI is required'); }

  if (!options.hProjectURI)   { throw new Error('hProjectURI is required'); }
  if (!options.hProjectToken) { throw new Error('hProjectToken is required'); }
  if (!options.hAccountURI)   { throw new Error('hAccountURI is required'); }
  if (!options.hAccountToken) { throw new Error('hAccountToken is required'); }

  if (!options.workspacesFsRoot) { throw new Error('workspacesFsRoot is required'); }
  if (!options.workspaceHostURL) { throw new Error('workspaceHostURL is required'); }
  
  /**
   * The main app is an express application
   * This is done because express app has application
   * configuration built-in, so it might be useful for other sub-applications
   * as well.
   * @type {Express Router}
   */
  var app = express();

  /**
   * Instantiate a Socket.io application and make it available
   * as `io` property in the main application
   */
  app.io = socketIO();
  app.io.path('/public/socket.io');

  /**
   * Hash containing all errors the application may throw.
   * @type {Object}
   */
  app.errors = require('../shared/errors');

  /**
   * Promise for whenever the application has been fully set-up.
   */
  app.ready = setupServices(app, options).then(() => {

    /**
     * Hash containing all controllers
     * @type {Object}
     */
    app.controllers = {};
    app.controllers.workspace = require('./controllers/workspace')(app, options);
    app.controllers.socketAuth = require('./controllers/socket-auth')(app, options);

    /**
     * Middleware factory functions.
     * @type {Object}
     */
    app.middleware = {};

    app.middleware.authenticate =
      require('./middleware/authenticate').bind(null, app);
    app.middleware.loadWorkspace =
      require('./middleware/load-workspace').bind(null, app);
    app.middleware.cors =
      require('./middleware/cors').bind(null, app);
    app.middleware.verifyProjectPermissions =
      require('./middleware/verify-project-permissions').bind(null, app);

    /**
     **
     **
     * Setup express application routes
     **
     **
     **/
    require('./routes/public')(app, options);

    // express error-handling
    require('./error-handlers/h-workspace-error')(app, options);

    /**
     **
     **
     * Setup io application
     **
     **
     **/
    require('./io')(app, options);
    
    return app;
  })
  .catch((err) => {
    console.warn('service setup error', err);

    return Bluebird.reject(err);
  });

  // define attach method
  app.attach = function (server) {
    return app.ready.then(() => {
      // attach express app
      // expressApp MUST be attached before the ioApp
      // otherwise 'Error: Can't set headers after they are sent.'
      // will occur
      // TODO: study reasons.
      server.on('request', app);

      // attach socket.io app
      app.io.attach(server);
    });
  };

  return app;
};