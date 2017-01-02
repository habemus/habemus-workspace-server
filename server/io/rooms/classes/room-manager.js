// native
const util = require('util');

// third-party
const Bluebird        = require('bluebird');
const rootPathBuilder = require('root-path-builder');

// own
const Room = require('./room');

const CONSTANTS = require('../../../../shared/constants');

/**
 * Constructor of an object responsible for managing
 * active workspaces.
 * @param {Object} options
 */
function RoomManager(options) {
  if (!options.rootPath || typeof options.rootPath !== 'string') {
    throw new Error('rootPath is required');
  }

  if (!options.ioApp) {
    throw new Error('ioApp is required');
  }
  
  if (!options.mainApp) {
    throw new Error('mainApp is required');
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
   * Store reference to the mainApp
   * @type {Express app}
   */
  this.mainApp = options.mainApp;

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
  this.rooms = {};
}

/**
 * Handles workspace events
 * @param  {String} eventName
 * @param  {String} workspaceId
 */
RoomManager.prototype._handleWorkspaceEvent = function (eventName, workspaceId) {
  switch (eventName) {
    case CONSTANTS.WORKSPACE_EVENTS.UPDATE_STARTED:

      this.getRoom(workspaceId)
        .then((room) => {
          if (room) {
            room.socketBroadcast(CONSTANTS.WORKSPACE_EVENTS.UPDATE_STARTED);
          }
        });

      break;
    case CONSTANTS.WORKSPACE_EVENTS.UPDATE_FINISHED:

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
 * @return {Bluebird -> Room}
 */
RoomManager.prototype.createRoom = function (workspace) {
  if (!workspace || !workspace._id) {
    return Bluebird.reject(new Error('invalid workspace'));
  }

  if (this.rooms[workspace._id]) {
    return Bluebird.reject(new Error('workspaceRoom exists: ' + workspace._id));
  }

  /**
   * The workspace's fs root uses the workspace's _id
   * @type {String}
   */
  var workspaceRootPath = this.root.prependTo(workspace._id);

  var room = new Room(workspace, {
    rootPath: workspaceRootPath,
    ioApp: this.ioApp,
    mainApp: this.mainApp,
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
      this.rooms[workspace._id] = room;

      return room;
    });
};

/**
 * Retrieves the workspace rooom by the workspace's _id
 * @param  {String} workspaceId
 * @return {Room}
 */
RoomManager.prototype.getRoom = function (workspaceId) {
  return Bluebird.resolve(this.rooms[workspaceId] || null);
};

/**
 * Destroys the workspace room identified by the given workspaceId
 * @param  {String} workspaceId
 */
RoomManager.prototype.destroyRoom = function (workspaceId) {

  var room = this.rooms[workspaceId];

  // TODO study whether this deletion is enough
  delete this.rooms[workspaceId];

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
RoomManager.prototype.ensureRoomDestroyed = function (workspaceId) {
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
 * @return {Room}
 */
RoomManager.prototype.ensureRoom = function (workspace) {
  if (!workspace || !workspace._id) {
    throw new Error('workspace is required');
  }

  if (!this.rooms[workspace._id]) {
    return this.createRoom(workspace);
  } else {
    return Bluebird.resolve(this.rooms[workspace._id]);
  }
};

module.exports = RoomManager;
