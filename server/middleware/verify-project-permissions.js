// third-party
const Bluebird = require('bluebird');

// own
const aux = require('./auxiliary');

// exports a function that takes the app and some options and
// returns the middleware
module.exports = function (app, options) {
  /**
   * Private token used to authenticate h-website to h-project
   * @type {JWT}
   */
  const H_PROJECT_TOKEN = options.hProjectToken;

  if (!H_PROJECT_TOKEN) {
    throw new Error('options.hProjectToken is required');
  }

  const errors = app.errors;

  const hProject = app.services.hProject;

  /**
   * Default sub loader retrieves value from req
   * 
   * @param  {Express Request} req
   * @return {String}
   */
  const _sub = options.sub || function (req) {
    return req.tokenData.sub;
  }

  /**
   * Function to get the project's id.
   * 
   * @param  {Express Request} req
   * @return {String}
   */
  const _projectId = options.projectId || function (req) {
    return req.params.projectId;
  };

  /**
   * Permissions to be verified
   * @type {Array}
   */
  const _permissions = options.permissions;

  return function verifyPermissions(req, res, next) {
    /**
     * Requires authenticate middleware to have been executed
     * before in the middleware chain
     */
    var sub         = aux.evalOpt(_sub, req);
    var projectId   = aux.evalOpt(_projectId, req);
    var permissions = aux.evalOpt(_permissions, req);

    hProject.verifyProjectPermissions(
      H_PROJECT_TOKEN,
      sub,
      projectId,
      permissions
    )
    .then((result) => {

      if (result.allowed) {
        next();
      } else {
        return Bluebird.reject(new errors.Unauthorized());
      }
    })
    .catch((err) => {
      // prohibit
      next(err);
    });
  };
};
