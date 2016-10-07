// native
var util = require('util');

// own deps
const HWorkspaceError = require('./base');

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
  HWorkspaceError.call(this, message);

  this.option = option;
  this.kind = kind;
}
util.inherits(InvalidOption, HWorkspaceError);
InvalidOption.prototype.name = 'InvalidOption';
exports.InvalidOption = InvalidOption;

exports.HWorkspaceError = HWorkspaceError;

Object.assign(exports, require('./connection'));
Object.assign(exports, require('./authentication'));
Object.assign(exports, require('./workspace'));
