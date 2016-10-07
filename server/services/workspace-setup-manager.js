/**
 * The setup manager ensures that
 * the loading process for a website is not executed
 * by two (or more) processes. It merges requests
 * for loading and destroying websites
 */

// third-party
const Bluebird       = require('bluebird');
const cachePromiseFn = require('cache-promise-fn');

module.exports = function (app, options) {

  var setupManager = {};

  /**
   * Checks whether there is a load request in process.
   * If so, returns it, otherwise creates a new request
   * and registers it, so that further requests to the same website
   * are in cache.
   * 
   * @param  {String} username
   * @param  {String} projectId
   * @return {Bluebird -> undefined}
   */
  setupManager.ensureReady = cachePromiseFn(
    function (username, projectId) {

      var _workspace;

      return app.controllers.workspace.getByProjectId(projectId)
        .then((workspace) => {

          _workspace = workspace;

          return app.controllers.workspace.isReady(workspace);

        })
        .then((isReady) => {
          if (!isReady) {
            return app.controllers.workspace.loadLatestVersion(_workspace);
          }
        })
        .catch((err) => {
          if (err.name === 'NotFound') {

            return app.controllers.workspace.create(username, projectId)
              .then((workspace) => {
                _workspace = workspace;
              });

          } else {
            throw err;
          }
        })
        .then(() => {
          // always return the workspace
          return _workspace;
        });
    }, 
    {
      cacheKey: function (username, projectId) {
        return username + projectId;
      }
    }
  );

  return setupManager;
};
