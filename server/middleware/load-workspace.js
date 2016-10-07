// own dependencies
const aux = require('./auxiliary');

// exports a function that takes the app and some options and
// returns the middleware
module.exports = function (app, options) {

  options = options || {};

  const errors = app.errors;

  /**
   * Function to get the workspace identifier
   * Defaults to retrieving the identifier from the 
   * req.params.identifier
   * 
   * @param  {Express Request} req
   * @return {String}
   */
  const _identifier = options.identifier || function (req) {
    return req.params.identifier;
  };

  /**
   * Function to get the identifierProp
   * @param  {Express Request} req
   * @return {String}
   */
  const _identifierProp = options.identifierProp || function (req) {
    if (req.query.byCode) {
      return 'code';
    } else if (req.query.byProjectId) {
      return 'projectId';
    } else {
      // by default use _id as the identifier property
      return '_id';
    }
  };

  /**
   * Property onto which the workspace should be loaded into
   * @type {String}
   */
  const _as = options.as || 'workspace';

  return function loadWorkspace(req, res, next) {

    var identifier     = aux.evaluateOpt(_identifier, req);
    var identifierProp = aux.evaluateOpt(_identifierProp, req);
    var as             = aux.evaluateOpt(_as, req);

    var getPromise;

    switch (identifierProp) {
      case 'code':
        getPromise = app.controllers.workspace.getByProjectCode(identifier);
        break;
      case 'projectId':
        getPromise = app.controllers.workspace.getByProjectId(identifier);
        break;
      case '_id':
        getPromise = app.controllers.workspace.getById(identifier);
        break;
      default:
        next(new Error('unsupported identifierProp ' + identifierProp)) 
        break;
    }
  
    getPromise.then((workspace) => {
      req[as] = workspace;

      next();
    })
    .catch(next);
  };
};
