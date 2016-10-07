// third-party dependencies
const rootPathBuilder = require('root-path-builder');

module.exports = function (app, options) {

  if (!options.workspacesFsRoot) {
    throw new Error('workspacesFsRoot is required');
  }

  const workspacesRoot = rootPathBuilder(options.workspacesFsRoot);

  return workspacesRoot;
};