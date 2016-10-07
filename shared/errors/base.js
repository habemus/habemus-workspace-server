const util = require('util');

/**
 * The base error constructor
 * @param {String} code   
 * @param {String} message
 */
function HDevError(code, message) {
  Error.call(this);
  
  this.message = message;
}
util.inherits(HDevError, Error);

HDevError.prototype.name = 'HDevError';

module.exports = HDevError;