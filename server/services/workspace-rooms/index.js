// native
const util = require('util');

// third-party
const Bluebird        = require('bluebird');
const rootPathBuilder = require('root-path-builder');

// own
const WorkspaceRoom = require('./workspace-room');

const CONSTANTS = require('../../../shared/constants');

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

  if (!options.redisSubClient) {
    throw new Error('redisSubClient is required');
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
   * Store the redis client
   * @type {RedisClient}
   */
  this.redisSubClient = options.redisSubClient;

  // subscribe to workspace-updated events
  this.redisSubClient.subscribe(CONSTANTS.WORKSPACE_EVENTS.UPDATE_STARTED);
  this.redisSubClient.subscribe(CONSTANTS.WORKSPACE_EVENTS.UPDATE_FINISHED);
  this.redisSubClient.subscribe(CONSTANTS.WORKSPACE_EVENTS.UPDATE_FAILED);
  this.redisSubClient.on('message', this._handleWorkspaceEvent.bind(this));

  /**
   * Hash to store workspaces by their ids
   * @type {Object}
   */
  this.workspaceRooms = {};
}

/**
 * Handles workspace events
 * @param  {String} eventName
 * @param  {String} workspaceId
 */
WorkspaceRoomManager.prototype._handleWorkspaceEvent = function (eventName, workspaceId) {
  switch (eventName) {
    case CONSTANTS.WORKSPACE_EVENTS.UPDATE_STARTED:

      console.log('workspace-update-started', workspaceId);

      this.getRoom(workspaceId)
        .then((room) => {
          if (room) {
            room.socketBroadcast(CONSTANTS.WORKSPACE_EVENTS.UPDATE_STARTED);
          }
        });

      break;
    case CONSTANTS.WORKSPACE_EVENTS.UPDATE_FINISHED:

      console.log('workspace-update-finished', workspaceId);

      this.getRoom(workspaceId)
        .then((room) => {
          if (room) {
            room.socketBroadcast(CONSTANTS.WORKSPACE_EVENTS.UPDATE_FINISHED);

            // TODO:
            // do not destroy the room
            return this.ensureRoomDestroyed(workspaceId);
          }
        });

      break;
    case CONSTANTS.WORKSPACE_EVENTS.UPDATE_FAILED:

      console.log('workspace-update-failed', workspaceId);

      this.getRoom(workspaceId)
        .then((room) => {
          if (room) {
            room.socketBroadcast(CONSTANTS.WORKSPACE_EVENTS.UPDATE_FAILED);

            return this.ensureRoomDestroyed(workspaceId);
          }
        });

      break;
    default:
      console.warn('unknown eventName ' + eventName);
      break;
  }
};

/**
 * Creates a room for the workspace
 * @param  {Workspace} workspace
 * @return {Bluebird -> WorkspaceRoom}
 */
WorkspaceRoomManager.prototype.createRoom = function (workspace) {
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
  room.once('empty', this.ensureRoomDestroyed.bind(this, workspace._id));

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
WorkspaceRoomManager.prototype.getRoom = function (workspaceId) {
  return Bluebird.resolve(this.workspaceRooms[workspaceId] || null);
};

/**
 * Destroys the workspace room identified by the given workspaceId
 * @param  {String} workspaceId
 */
WorkspaceRoomManager.prototype.destroyRoom = function (workspaceId) {

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
WorkspaceRoomManager.prototype.ensureRoomDestroyed = function (workspaceId) {
  return this.getRoom(workspaceId)
    .then((room) => {
      if (room) {
        return this.destroyRoom(workspaceId);
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
WorkspaceRoomManager.prototype.ensureRoom = function (workspace) {
  if (!workspace || !workspace._id) {
    throw new Error('workspace is required');
  }

  if (!this.workspaceRooms[workspace._id]) {
    return this.createRoom(workspace);
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

    redisSubClient: app.services.redis.sub,
  });

  return workspaceRooms;
};
