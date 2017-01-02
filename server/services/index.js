// third-party
const Bluebird = require('bluebird');

module.exports = function (app, options) {
  
  return Bluebird.all([
    require('./workspaces-root')(app, options),
    require('./message-api')(app, options),
    require('./mongoose')(app, options),
    require('./redis')(app, options),
    require('./h-project')(app, options),
    require('./h-account')(app, options),
    require('./cors')(app, options),
    require('./workspace-setup-manager')(app, options),
  ])
  .then((services) => {
  
    app.services = {};

    app.services.workspacesRoot = services[0];
    app.services.messageAPI = services[1];
    app.services.mongoose = services[2];
    app.services.redis = services[3];
    app.services.hProject = services[4];
    app.services.hAccount = services[5];
    app.services.cors = services[6];
    app.services.workspaceSetupManager = services[7];

    // ensure nothing is returned by the promise
    return;
  });
};