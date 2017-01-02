// own
const RoomManager = require('./classes/room-manager')

/**
 * Export a function that sets up the workspace room manager.
 */
module.exports = function setupWorkspaceRoomManager(app, options) {

  var roomManager = new RoomManager({
    ioApp: app.io,
    mainApp: app,
    rootPath: options.workspacesFsRoot,
    apiVersion: options.apiVersion,

    redisSubClient: app.services.redis.sub,
  });

  app.io.roomManager = roomManager;
};
