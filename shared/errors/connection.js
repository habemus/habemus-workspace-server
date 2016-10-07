const util = require('util');

const HDevError = require('./base');

/**
 * Connection errors
 * @param {[type]} message [description]
 */
function ConnectionTimeout(message) {
  HDevError.call(this, message);
}
util.inherits(ConnectionTimeout, HDevError);
ConnectionTimeout.prototype.name = 'ConnectionTimeout';

/**
 * Happens when connection attempt times out
 */
function ConnectionError(message) {
  HDevError.call(this, message);
}
util.inherits(ConnectionError, HDevError);
ConnectionError.prototype.name = 'ConnectionError';

exports.ConnectionTimeout = ConnectionTimeout;
exports.ConnectionError = ConnectionError;