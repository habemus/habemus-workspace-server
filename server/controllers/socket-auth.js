// native dependencies

// third-party dependencies
const Bluebird = require('bluebird');
const debug    = require('debug')('h-dev');

const errors = require('../../shared/errors');

const SHARED_CONSTANTS = require('../../shared/constants');
const ROLES = SHARED_CONSTANTS.ROLES;

module.exports = function (app, options) {

  /**
   * Token used to authenticate private requests
   * to the h-account server
   * @type {String}
   */
  const H_ACCOUNT_TOKEN = options.hAccountToken;

  /**
   * Token used to authenticate private requests
   * to the h-project server
   * @type {String}
   */
  const H_PROJECT_TOKEN = options.hProjectToken;

  var socketAuthCtrl = {};

  /**
   * Authenticates a socket and connects it to
   * the workspace identified by the code.
   * 
   * @param  {Socket.io Socket} socket
   * @param  {String} authToken
   * @param  {String} projectCode
   * @return {Bluebird -> undefined}
   */
  socketAuthCtrl.connectAuthenticatedSocket = function (socket, authToken, projectCode) {
    if (!socket) {
      return Bluebird.reject(new errors.InvalidOption('socket', 'required'));
    }

    if (!authToken) {
      return Bluebird.reject(new errors.InvalidOption('authToken', 'required'));
    }

    if (!projectCode) {
      return Bluebird.reject(new errors.InvalidOption('projectCode', 'required'));
    }

    var _workspace;
    var _tokenData;
    var _project;

    // decode the user's authToken
    var accountPromise = app.services.hAccount.decodeToken(
      H_ACCOUNT_TOKEN,
      authToken
    );

    // retrieve the requested project
    var projectPromise = app.services.hProject.get(
      H_PROJECT_TOKEN,
      projectCode,
      {
        byCode: true
      }
    );

    return Bluebird.all([accountPromise, projectPromise])
      .then((results) => {
        var tokenData = _tokenData = results[0];
        var project   = _project   = results[1];

        // verify if the account has `read`, `update` and `delete` permissions
        // over the project
        return app.services.hProject.verifyProjectPermissions(
          H_PROJECT_TOKEN,
          tokenData.sub,
          project._id,
          ['read', 'update', 'delete']
        );
      })
      .then((permissions) => {
        if (!permissions.allowed) {
          return Bluebird.reject(new errors.Unauthorized());
        }

        // retrieve the workspace associated to the given project
        return app.controllers.workspace.getByProjectId(_project._id);
      })
      .then((workspace) => {
        _workspace = workspace;

        return app.services.workspaceSetupManager
          .ensureReady(_tokenData.username, workspace.projectId);
      })
      .then((workspace) => {
        // remove all event listeners from the socket for the `message` event
        // before setting further listeners
        socket.removeAllListeners(SHARED_CONSTANTS.MESSAGE_EVENT);

        // ensure the workspaceRoom object exists
        // and let the socket join it
        return app.services
          .workspaceRooms
          .ensureRoom(_workspace);
      })
      .then((workspaceRoom) => {
        return workspaceRoom.join(
          socket,
          ROLES.AUTHENTICATED_CLIENT
        );
      });
  };

  /**
   * Connects a socket to the workspace identified
   * by the code.
   *
   * The connection is an anonymous one, thus cannot execute
   * any action other than 'publish' and 'subscribe';
   * 
   * @param  {Socket.io Socket} socket
   * @param  {String} projectCode
   * @param  {Object} role
   * @return {Bluebird -> undefined}
   */
  socketAuthCtrl.connectAnonymousSocket = function (socket, projectCode) {
    if (!socket) {
      return Bluebird.reject(new errors.InvalidOption('socket', 'required'));
    }
    if (!projectCode) {
      return Bluebird.reject(new errors.InvalidOption('projectCode', 'required'));
    }

    /**
     * Set the role of the client as 'anonymous-client'
     * @type {String}
     */
    socket.role = ROLES.ANONYMOUS_CLIENT;

    // retrieve the workspace using the projectCode
    return app.controllers.workspace.getByProjectCode(projectCode)
      .then((workspace) => {
        // retrieve the workspace's room
        return app.services.workspaceRooms.getRoom(workspace._id);
      })
      .then((workspaceRoom) => {

        if (workspaceRoom) {
          return workspaceRoom.join(
            socket,
            ROLES.ANONYMOUS_CLIENT
          );
        } else {
          return Bluebird.reject(new errors.NotFound(projectCode));
        }
      });
  };

  return socketAuthCtrl;
};
