// third-party
const bodyParser = require('body-parser');
const Bluebird   = require('bluebird');

const interfaces = require('../interfaces');

module.exports = function (app, options) {

  const errors = app.errors;
  const workspaceCtrl = app.controllers.workspace;

  const authenticateOptions = {
    hAccountToken: options.hAccountToken
  };

  /**
   * Ensures the project's workspace is ready
   */
  app.post('/project/:projectId/workspace/ensure-ready',
    app.middleware.authenticate(authenticateOptions),
    app.middleware.verifyProjectPermissions({
      hProjectToken: options.hProjectToken,
      permissions: [
        'read',
        'update',
        'delete',
      ],
    }),
    bodyParser.json(),
    function (req, res, next) {

      var username  = req.tokenData.username;
      var projectId = req.params.projectId;

      app.services.workspaceSetupManager.ensureReady(username, projectId)
        .then((workspace) => {
          var msg = app.services.messageAPI.item(workspace, interfaces.WORKSPACE_DATA);
          res.status(201).json(msg);
        })
        .catch(next);
    }
  );

  /**
   * Retrieves data on a workspace.
   */
  app.get('/project/:identifier/workspace',
    app.middleware.authenticate(authenticateOptions),

    // we must first load the workspace
    // before verifying permissions,
    // as the `verifyProjectPermissions`
    // middleware requires a `projectId`
    app.middleware.loadWorkspace({
      identifier: function (req) {
        return req.params.identifier;
      },
    }),
    app.middleware.verifyProjectPermissions({
      hProjectToken: options.hProjectToken,
      permissions: [
        'read',
      ],
      projectId: function (req) {
        return req.workspace.projectId;
      }
    }),
    function (req, res, next) {

      var workspace = req.workspace;

      var msg = app.services.messageAPI.item(workspace, interfaces.WORKSPACE_DATA);
      res.json(msg);
    }
  );

  /**
   * Loads the latest version of the project
   * into the workspace's files.
   *
   * ATTENTION: removes all current files in the workspace
   * and updates them with the latest version's files.
   */
  app.post('/project/:identifier/workspace/load-latest-version',
    app.middleware.authenticate(authenticateOptions),

    app.middleware.loadWorkspace({
      identifier: function (req) {
        return req.params.identifier;
      },
    }),
    app.middleware.verifyProjectPermissions({
      hProjectToken: options.hProjectToken,
      permissions: [
        'read',
        'update',
      ],
      projectId: function (req) {
        return req.workspace.projectId;
      }
    }),
    function (req, res, next) {

      var workspace = req.workspace;

      workspaceCtrl.loadLatestVersion(workspace)
        .then((workspace) => {

          // if there is any workspaceRoom referencing
          // the workspace, it has to be destroyed, in order
          // to avoid any pending connections from editing 
          // an old version of the files
          return app.services.workspaceRooms.ensureWorkspaceRoomDestroyed(workspace._id);
        })
        .then(() => {
          var msg = app.services.messageAPI.item(workspace, interfaces.WORKSPACE_DATA);
          res.json(msg);
        })
        .catch(next);
    }
  );
};
