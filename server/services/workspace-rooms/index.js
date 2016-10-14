// native
const util = require('util');

// third-party
const Bluebird        = require('bluebird');
const rootPathBuilder = require('root-path-builder');

// own
const WorkspaceRoom = require('./workspace-room');

/**
 * Constructor of an object responsible for managing
 * active workspaces.
 * @param {Object} options
 */
function WorkspaceRoomManager(options) {
  if (!options.rootPath || typeof options.rootPath !== 'string') {
    throw new Error('rootPath is required');
  }

  if (!options.ioApp) {
    throw new Error('ioApp is required');
  }

  if (!options.apiVersion) {
    throw new Error('apiVersion is required');
  }

  /**
   * Store reference to the rootPath object
   * @type {String}
   */
  this.root = rootPathBuilder(options.rootPath);

  /**
   * Store reference to the ioApp
   * @type {Socket.io app}
   */
  this.ioApp = options.ioApp;

  /**
   * Store the apiVersion
   * @type {String}
   */
  this.apiVersion = options.apiVersion;

  /**
   * Hash to store workspaces by their ids
   * @type {Object}
   */
  this.workspaceRooms = {};
}

WorkspaceRoomManager.prototype.createWorkspaceRoom = function (workspace) {
  if (!workspace || !workspace._id) {
    return Bluebird.reject(new Error('invalid workspace'));
  }

  if (this.workspaceRooms[workspace._id]) {
    return Bluebird.reject(new Error('workspaceRoom exists: ' + workspace._id));
  }

  /**
   * The workspace's fs root uses the workspace's _id
   * @type {String}
   */
  var workspaceRootPath = this.root.prependTo(workspace._id);

  var room = new WorkspaceRoom(workspace, {
    rootPath: workspaceRootPath,
    ioApp: this.ioApp,
    apiVersion: this.apiVersion,
  });

  /**
   * Once the room emits an 'empty' event,
   * it should be destroyed.
   */
  room.once('empty', this.destroyWorkspaceRoom.bind(this, workspace._id));

  // return promise for the room's setup to be finished
  return room.setup()
    .then(() => {

      /**
       * Save the workspace room by the workspace._id
       */
      this.workspaceRooms[workspace._id] = room;

      return room;
    });
};

/**
 * Retrieves the workspace rooom by the workspace's _id
 * @param  {String} workspaceId
 * @return {WorkspaceRoom}
 */
WorkspaceRoomManager.prototype.getWorkspaceRoom = function (workspaceId) {
  return Bluebird.resolve(this.workspaceRooms[workspaceId]);
};

/**
 * Destroys the workspace room identified by the given workspaceId
 * @param  {String} workspaceId
 */
WorkspaceRoomManager.prototype.destroyWorkspaceRoom = function (workspaceId) {

  var room = this.workspaceRooms[workspaceId];

  // TODO study whether this deletion is enough
  delete this.workspaceRooms[workspaceId];

  return room.destroy()
    .then(() => {
      return;
    });
};

/**
 * Checks if the room exists. If exists, destroys it.
 * Otherwise, simply returns.
 * 
 * @param  {String} workspaceId
 * @return {Bluebird}
 */
WorkspaceRoomManager.prototype.ensureWorkspaceRoomDestroyed = function (workspaceId) {
  return this.getWorkspaceRoom(workspaceId)
    .then((room) => {
      if (room) {
        return this.destroyWorkspaceRoom(workspaceId);
      }
    });
};

/**
 * Checks whether an active workspace object exists for the given workspaceId.
 * In case there is an workspace, simply return it.
 * Otherwise, create a workspace object and return it.
 * 
 * @param  {Workspace} workspace
 * @return {WorkspaceRoom}
 */
WorkspaceRoomManager.prototype.ensureWorkspaceRoom = function (workspace) {
  if (!workspace || !workspace._id) {
    throw new Error('workspace is required');
  }

  if (!this.workspaceRooms[workspace._id]) {
    return this.createWorkspaceRoom(workspace);
  } else {
    return Bluebird.resolve(this.workspaceRooms[workspace._id]);
  }
};

/**
 * Export a function that sets up the workspace room manager.
 */
module.exports = function setupWorkspaceRoomManager(app, options) {

  var workspaceRooms = new WorkspaceRoomManager({
    ioApp: app.io,
    rootPath: options.workspacesFsRoot,
    apiVersion: options.apiVersion,
  });

  return workspaceRooms;
};
