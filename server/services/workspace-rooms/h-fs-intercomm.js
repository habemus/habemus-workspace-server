// native dependencies
const util = require('util');

// third-party dependencies
const Intercomm = require('intercomm');
const VirtualFs = require('@habemus/virtual-fs');
const debug     = require('debug')('h-workspace');

// constants
const SHARED_CONSTANTS = require('../../../shared/constants');

/**
 * VirtualFsIntercomm constructor
 * @param {Object} options [description]
 */
function VirtualFsIntercomm(options) {
  if (!options.ioApp) {
    throw new Error('ioApp is required');
  }

  if (!options.ioRoomId) {
    throw new Error('ioRoomId is required');
  }

  if (typeof options.rootPath !== 'string' || !options.rootPath) {
    throw new TypeError('rootPath MUST be a non-empty string');
  }

  /**
   * The id must be `h-fs`
   * @type {String}
   */
  options.id = 'h-fs';

  /**
   * h-fs is exclusively a server node.
   * @type {String}
   */
  options.type = 'server';

  // initialize Intercomm
  Intercomm.call(this, options);

  /**
   * Store the id of the socket.io room
   * that all sockets in this project have joined.
   * @type {String}
   */
  this.ioRoomId = options.ioRoomId;

  /**
   * Store reference to the socket.io application
   * @type {Socket.io}
   */
  this.ioApp = options.ioApp;

  /**
   * Store the workspace's rootPath
   * @type {String}
   */
  this.rootPath = options.rootPath;

  /**
   * Instantiate the hFs and store it in the instance
   * @type {VirtualFs}
   */
  var hFs = new VirtualFs(this.rootPath);
  this.hFs = hFs;
  
  // expose the hFs api
  this.expose({
    createFile: hFs.createFile.bind(hFs),
    createDirectory: hFs.createDirectory.bind(hFs),
    readDirectory: hFs.readDirectory.bind(hFs),
    readFile: hFs.readFile.bind(hFs),
    updateFile: hFs.updateFile.bind(hFs),
    move: hFs.move.bind(hFs),
    remove: hFs.remove.bind(hFs),

    pathExists: hFs.pathExists.bind(hFs),
    startWatching: function (path) {
      // TODO: define what should be the way to handle fs
      // watching methods
      // in cloud version we do not watch files
    },
    stopWatching: function (path) {

    }
  });
  
  // map events to be published
  hFs.on('file-created', this.publish.bind(this, 'file-created'));
  hFs.on('file-removed', this.publish.bind(this, 'file-removed'));
  hFs.on('file-updated', this.publish.bind(this, 'file-updated'));
  hFs.on('directory-created', this.publish.bind(this, 'directory-created'));
  hFs.on('directory-removed', this.publish.bind(this, 'directory-removed'));
}
util.inherits(VirtualFsIntercomm, Intercomm);

/**
 * Define `sendMessage` behavior to use the ioApp
 * @param  {Object} message
 */
VirtualFsIntercomm.prototype.sendMessage = function (message) {

  debug('send message from VirtualFsIntercomm', message);

  if (message.to) {

    this.ioApp.to(message.to)
      .emit(SHARED_CONSTANTS.MESSAGE_EVENT, message);

  } else {
    
    if (message.type === 'event') {
      // the message is of type 'event'
      // thus should be broadcasted to the room
      this.ioApp.to(this.ioRoomId)
        .emit(SHARED_CONSTANTS.MESSAGE_EVENT, message);
    } else {
      console.warn('message not sent, lacking to ', message);
    }
  }
};

/**
 * Define response data loader
 * For the h-fs, load the result directly into the response's `data` property.
 * @param  {IPC request} request
 * @param  {IPC response} response
 * @param  {IPC result} result
 */
VirtualFsIntercomm.prototype.loadResponseData = function (request, response, result) {
  response.data = result;
};

/**
 * Define error data loader
 * 
 * @param  {IPC request} request
 * @param  {IPC response} response
 * @param  {IPC error} error
 */
VirtualFsIntercomm.prototype.loadErrorData = function (request, response, error) {
  response.load(error, {
    name: true,
    option: true,
    message: true,
  })
};

module.exports = VirtualFsIntercomm;
