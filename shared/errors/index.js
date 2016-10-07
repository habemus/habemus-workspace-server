// native
var util = require('util');

// own deps
const HDevError = require('./base');

/**
 * Happens when any required option is invalid
 *
 * error.option should have the option that is invalid
 * error.kind should contain details on the error type
 * 
 * @param {String} option
 * @param {String} kind
 * @param {String} message
 */
function InvalidOption(option, kind, message) {
  HDevError.call(this, message);

  this.option = option;
  this.kind = kind;
}
util.inherits(InvalidOption, HDevError);
InvalidOption.prototype.name = 'InvalidOption';
exports.InvalidOption = InvalidOption;

exports.HDevError = HDevError;

Object.assign(exports, require('./connection'));
Object.assign(exports, require('./authentication'));
Object.assign(exports, require('./workspace'));
