// native
const util         = require('util');
const EventEmitter = require('events');

// third-party
const Bluebird    = require('bluebird');
const debug       = require('debug')('h-workspace');
const jsonMessage = require('json-message');
const HFs         = require('h-fs');

// own
const HFsIntercomm = require('./h-fs-intercomm');

// constants
const SHARED_CONSTATNS = require('../../../../shared/constants');

const ROLES = SHARED_CONSTATNS.ROLES;

/**
 * Constructor of a workspace.
 * The Room is responsible for setting up resources for
 * each of the workspaces:
 * - hFs
 * - message routing
 * 
 * @param {String} workspace
 * @param {Object} options
 */
function Room(workspace, options) {

  if (!workspace) {
    throw new Error('workspace is required');
  }
  if (!options.rootPath || typeof options.rootPath !== 'string') {
    throw new Error('options.rootPath is required');
  }
  if (!options.ioApp) {
    throw new Error('options.ioApp is required');
  }
  if (!options.mainApp) {
    throw new Error('options.mainApp is required');
  }
  if (!options.apiVersion) {
    throw new Error('options.apiVersion is required');
  }

  /**
   * The workspace this room refers to
   * @type {Workspace}
   */
  this.workspace = workspace;

  /**
   * Room's rootPath
   * @type {String}
   */
  this.rootPath = options.rootPath;

  /**
   * Reference to the main socket.io application
   * @type {Socket.io}
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
   * Create a message api instance for generating messages that
   * are outside the scope of any IPCNode.
   * @type {jsonMessage}
   */
  // this.messageAPI = jsonMessage(this.apiVersion);

  /**
   * Instantiate hFs
   */
  this.hFs = new HFs(this.rootPath);
  
  // handle hFs file events
  this.hFs.on('file-created', this._handleHFsFileEvent.bind(this, 'file-created'));
  this.hFs.on('file-removed', this._handleHFsFileEvent.bind(this, 'file-removed'));
  this.hFs.on('file-updated', this._handleHFsFileEvent.bind(this, 'file-updated'));  
  /**
   * Instantiate the hFsIPC
   * @type {HFsIntercomm}
   */
  this.hFsIPC = new HFsIntercomm({
    ioApp: this.ioApp,
    ioRoomId: this.ioRoomId,
    hFs: this.hFs,
    apiVersion: this.apiVersion,
  });
}
util.inherits(Room, EventEmitter);

/**
 * Id of the socket.io room used to broadcast messages to
 * sockets that are connected to this workspace
 * @type {String}
 */
Object.defineProperty(Room.prototype, 'ioRoomId', {
  get: function () {
    return 'workspace-io-room#' + this.workspace._id; 
  },
  set: function () {
    throw new Error('prohibited');
  }
});

/**
 * Makes a socket join the workspace.
 * @param  {socket.io socket} socket
 * @return {Bluebird}
 */
Room.prototype.join = function (socket, role) {
  // let the socket join the workspace's room
  socket.join(this.ioRoomId);

  // store the role in the socket itself
  socket.role = role;

  debug('Room#join', this.ioRoomId, role);

  socket.on(SHARED_CONSTATNS.MESSAGE_EVENT,
    this._routeSocketMessage.bind(this, socket));
  socket.on('disconnect',
    this._handleSocketDisconnect.bind(this, socket));
};

/**
 * Sets event listeners and timers.
 * @return {Bluebird}
 */
Room.prototype.setup = function () {

  return Bluebird.resolve();
};

/**
 * Removes all event listeners, timers, intervals, redis keys
 * related to the workspace room
 * @return {Bluebird}
 */
Room.prototype.destroy = function () {

  this.socketBroadcast(SHARED_CONSTATNS.ROOM_DESTROYED_EVENT)

  // TODO: disconnect all sockets
  // and tie all h-fs-intercomm operations to a workspace's version

  return this.listLocalSockets()
    .then((localSocketIds) => {

      var localSockets = localSocketIds.map((socketId) => {
        return this.ioApp.sockets.connected[socketId];
      });

      return localSockets.map((socket) => {
        return socket.disconnect();
      });
    });
};

/**
 * Emits an event to all sockets connected to this room.
 * @param  {String} eventName
 * @param  {*} data
 */
Room.prototype.socketBroadcast = function (eventName, data) {
  // events are broadcasted to the whole room
  this.ioApp.in(this.ioRoomId).emit(eventName, data);
};

/**
 * Retrieves socketIds that have joined the socket.io room
 * that corresponds to this workspace
 *
 * ATTENTION: this method lists the sockets connected to THIS node,
 * not all sockets.
 * Should not be used to retrieve list of sockets connected
 * to the room.
 *
 * On the other hand, it is perfect for listing
 * sockets connected to node to check if the node's Room
 * is still in use.
 * 
 * @return {Bluebird -> Array}
 */
Room.prototype.listLocalSockets = function () {
  return new Bluebird((resolve, reject) => {
    this.ioApp.in(this.ioRoomId).clients(function (err, clients) {
      if (err) {
        reject(err);
      } else {
        resolve(clients);
      }
    });
  });
};

/**
 * Handles `disconnect` events fired at a socket
 * @param  {Socket.io socket} socket
 */
Room.prototype._handleSocketDisconnect = function (socket) {
  debug('socket %s has disconnected', socket.id);

  this.listLocalSockets().then((socketIds) => {
    if (socketIds.length === 0) {
      this.emit('empty');
    }
  });
};

/**
 * Routes a socket's message data to the right destination.
 * Uses socket ids to route socket-to-socket messages.
 * In case requests are destinated to 'h-fs', will
 * forward requests to the hFs instance that handles filesystem
 * writes.
 * Works according to specs defined at json-message module.
 *
 * ATTENTION: this is the heart of communication and commands.
 * MUST check for the role of the socket before forwarding the messages:
 *
 * ONLY `authenticated-client`s can execute rpc-requests
 * 
 * @param  {Socket.io socket} socket
 * @param  {Object} message
 */
Room.prototype._routeSocketMessage = function (socket, message) {

  debug('message received in socket for workspace %s', this.workspace._id, message);

  if (socket.role === ROLES.AUTHENTICATED_CLIENT) {
    this._routeAuthenticatedSocketMessage(socket, message);
  } else {
    this._routeAnonymousSocketMessage(socket, message);
  }
};

/**
 * Routes authenticated socket connections messages
 */
Room.prototype._routeAuthenticatedSocketMessage = function (socket, message) {

  if (message.type === 'rpc-request') {

    // route rpc-request messages
    switch (message.to) {
      case 'h-fs':
        // this is a fs request, let the fs on the project's resources
        this.hFsIPC.handleMessage(message);
        break;
      default:
        // requests are sent to specific rooms
        // use the message.to as the destination
        socket.broadcast
          .to(message.to)
          .emit(SHARED_CONSTATNS.MESSAGE_EVENT, message);
        break;
    }
    
  } else if (message.type === 'response') {
    // responses always go to specific sockets
    socket.broadcast
      .to(message.to)
      .emit(SHARED_CONSTATNS.MESSAGE_EVENT, message);
  
  } else if (message.type === 'event') {
    // events are broadcasted to the whole room
    socket.broadcast
      .to(this.ioRoomId)
      .emit(SHARED_CONSTATNS.MESSAGE_EVENT, message);
  }
};

/**
 * Routes anonymous socket connection messages
 */
Room.prototype._routeAnonymousSocketMessage = function (socket, message) {

  switch (message.type) {
    case 'rpc-request':
      
      console.warn('rpc-request received at anonymous socket');

      break;
    case 'response':
      // responses always go to specific sockets
      socket.broadcast
        .to(message.to)
        .emit(SHARED_CONSTATNS.MESSAGE_EVENT, message);
      break;
    case 'event':
      // events are broadcasted to the whole room
      socket.broadcast
        .to(this.ioRoomId)
        .emit(SHARED_CONSTATNS.MESSAGE_EVENT, message);
      break;
  }
};

/**
 * Handles file-related events on the hFs instance associated to this
 * Room
 */
Room.prototype._handleHFsFileEvent = function (eventName, event) {

  
  if (event.path === '/bower.json') {
      
    if (eventName === 'file-created' || eventName === 'file-updated') {

      return this.hFs.readFile('/bower.json', 'utf8')
        .then((contents) => {
          var bowerJson = JSON.parse(contents);

          if (bowerJson['enable-bower-beta']) {
            return this.mainApp.controllers.workspace.bowerInstall(this.workspace);
          }
        })
      
      
    } else if (eventName === 'file-removed') {
      
      // TODO: remove bower_components when bower.json is removed
      
    }
    
  }
  
};

module.exports = Room;