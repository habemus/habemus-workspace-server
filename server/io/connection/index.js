// native dependencies

// third-party dependencies
const Bluebird = require('bluebird');
const debug    = require('debug')('h-workspace');

// own dependencies
const SHARED_CONSTANTS = require('../../../shared/constants');

const ROLES = SHARED_CONSTANTS.ROLES;

const AUTH_TIMEOUT_EVENT_NAME = 'authent'
const DEFAULT_AUTH_TIMEOUT = 10 * 1000;

/**
 * For now, we will require ALL permissions
 * @type {Array}
 */
const REQUIRED_PERMISSIONS = [
  'admin',
  'read',
  'update',
  'delete'
];

const errors = require('../../../shared/errors');

module.exports = function (app, options) {

  const AUTH_TIMEOUT = options.authTimeout || DEFAULT_AUTH_TIMEOUT;

  /**
   * Upon connection, setup in memory resources
   * to attend requests
   */
  app.io.on('connection', function (socket) {
    /**
     * Upon connection give the socket a TIMEOUT
     * after which if the socket still has not been authenticated,
     * it will be disconnected by AUTH_TIMEOUT
     */
    var scheduledAuthTimeout = setTimeout(function () {

      if (!socket.isAuthenticated) {

        socket.emit(SHARED_CONSTANTS.AUTH_ERROR_EVENT, {
          name: 'AuthenticationTimeout',
        });
        socket.disconnect();
      }

    }, AUTH_TIMEOUT);

    // let all `message` events be unauthorized before
    // a successful authentication
    // 
    // TODO: study better implementations of these
    socket.on(SHARED_CONSTANTS.MESSAGE_EVENT, function (message) {
      
      var err = new errors.Unauthorized('the socket is not authenticated');
      
      socket.emit(SHARED_CONSTANTS.AUTH_ERROR_EVENT, {
        name: err.name,
        message: err.message,
      });

      // disconnect to prevent any malicious uses
      socket.disconnect();
    });

    /**
     * Authentication workflow.
     * The client MUST send an 'authenticate' event
     * upon connection.
     *
     * Before the authentication flow is complete, no resources
     * are exposed to the client.
     */
    socket.on(SHARED_CONSTANTS.AUTH_REQUEST_EVENT, function (data) {

      debug('authenticate request', data);

      var authToken = data.authToken;
      var code      = data.code;
      var role      = data.role;

      // the authentication method depends
      // on the role requested by the client
      var authPromise;

      switch (role) {
        case ROLES.AUTHENTICATED_CLIENT:

          authPromise = app.controllers.socketAuth
            .connectAuthenticatedSocket(socket, authToken, code);

          break;
        case ROLES.ANONYMOUS_CLIENT:

          authPromise = app.controllers.socketAuth
            .connectAnonymousSocket(socket, code);

          break;
        default:
          authPromise = Bluebird.reject(new errors.InvalidOption('role', 'invalid'));
          break;
      }

      authPromise
        .then(() => {
          // set the `isAuthenticated` flag and clear the timeout
          clearTimeout(scheduledAuthTimeout);

          socket.isAuthenticated = true;

          // succesful join
          socket.emit(SHARED_CONSTANTS.AUTH_SUCCESS_EVENT);
        })
        .catch((err) => {
          // ensure error is an object
          err = err || {};

          debug('error', err);

          // TODO: study better way
          // of emitting authentication error events
          // socket.io does not pass the error name by default
          socket.emit(SHARED_CONSTANTS.AUTH_ERROR_EVENT, {
            name: err.name,
            option: err.option,
            kind: err.kind,
            message: err.message
          });
          socket.disconnect();
        });
    });

  });
}