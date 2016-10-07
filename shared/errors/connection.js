const util = require('util');

const HWorkspaceError = require('./base');

/**
 * Connection errors
 * @param {[type]} message [description]
 */
function ConnectionTimeout(message) {
  HWorkspaceError.call(this, message);
}
util.inherits(ConnectionTimeout, HWorkspaceError);
ConnectionTimeout.prototype.name = 'ConnectionTimeout';

/**
 * Happens when connection attempt times out
 */
function ConnectionError(message) {
  HWorkspaceError.call(this, message);
}
util.inherits(ConnectionError, HWorkspaceError);
ConnectionError.prototype.name = 'ConnectionError';

exports.ConnectionTimeout = ConnectionTimeout;
exports.ConnectionError = ConnectionError;