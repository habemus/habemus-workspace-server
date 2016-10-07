const util = require('util');

/**
 * The base error constructor
 * @param {String} code   
 * @param {String} message
 */
function HWorkspaceError(code, message) {
  Error.call(this);
  
  this.message = message;
}
util.inherits(HWorkspaceError, Error);

HWorkspaceError.prototype.name = 'HWorkspaceError';

module.exports = HWorkspaceError;