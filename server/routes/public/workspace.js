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

  app.post('/project/:projectId/workspaces',
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

      workspaceCtrl.create(username, projectId)
        .then((workspace) => {
          var msg = app.services.messageAPI.item(workspace, interfaces.WORKSPACE_DATA);
          res.status(201).json(msg);
        })
        .catch(next);
    }
  );

  app.get('/project/:projectId/workspace',
    app.middleware.authenticate(authenticateOptions),
    app.middleware.verifyProjectPermissions({
      hProjectToken: options.hProjectToken,
      permissions: [
        'read',
        'update',
        'delete',
      ],
    }),
    app.middleware.loadWorkspace({
      identifier: function (req) {
        return req.params.projectId;
      },
      identifierProp: 'projectId',
    }),
    function (req, res, next) {

      var workspace = req.workspace;

      var msg = app.services.messageAPI.item(workspace, interfaces.WORKSPACE_DATA);
      res.json(msg);
    }
  );
};
