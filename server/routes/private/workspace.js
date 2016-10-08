// third-party
const Bluebird = require('bluebird');

const interfaces = require('../interfaces');

module.exports = function (app, options) {

  const errors = app.errors;
  const workspaceCtrl = app.controllers.workspace;

  app.get('/project/:identifier/workspace',
    // we must first load the workspace
    // before verifying permissions,
    // as the `verifyProjectPermissions`
    // middleware requires a `projectId`
    app.middleware.loadWorkspace({
      identifier: function (req) {
        return req.params.identifier;
      },
    }),
    function (req, res, next) {

      var workspace = req.workspace;

      var msg = app.services.messageAPI.item(workspace, interfaces.WORKSPACE_DATA);
      res.json(msg);
    }
  );
};
