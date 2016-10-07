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
  if (!workspace || !workspace.code) {
    return Bluebird.reject(new Error('invalid workspace'));
  }

  if (this.workspaceRooms[workspace.code]) {
    return Bluebird.reject(new Error('workspaceRoom exists: ' + workspace.code));
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
  room.once('empty', this.destroyWorkspaceRoom.bind(this, workspace.code));

  // return promise for the room's setup to be finished
  return room.setup()
    .then(() => {

      /**
       * Save the workspace room by the workspace.code
       */
      this.workspaceRooms[workspace.code] = room;

      return room;
    });
};

/**
 * Destroys the workspace room identified by the given workspaceCode
 * @param  {String} workspaceCode
 */
WorkspaceRoomManager.prototype.destroyWorkspaceRoom = function (workspaceCode) {

  var room = this.workspaceRooms[workspaceCode];

  // TODO study whether this deletion is enough
  delete this.workspaceRooms[workspaceCode];

  return room.destroy()
    .then(() => {
      return;
    });
};

/**
 * Retrieves the workspace rooom by the workspace code
 * @param  {String} workspaceCode
 * @return {WorkspaceRoom}
 */
WorkspaceRoomManager.prototype.getWorkspaceRoom = function (workspaceCode) {
  return Bluebird.resolve(this.workspaceRooms[workspaceCode]);
};

/**
 * Checks whether an active workspace object exists for the given workspaceCode.
 * In case there is an workspace, simply return it.
 * Otherwise, create a workspace object and return it.
 * 
 * @param  {Workspace} workspace
 * @return {WorkspaceRoom}
 */
WorkspaceRoomManager.prototype.ensureWorkspaceRoom = function (workspace) {
  if (!workspace || !workspace.code) {
    throw new Error('workspace is required');
  }

  if (!this.workspaceRooms[workspace.code]) {
    return this.createWorkspaceRoom(workspace);
  } else {
    return Bluebird.resolve(this.workspaceRooms[workspace.code]);
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
