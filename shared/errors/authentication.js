const util = require('util');

const HWorkspaceError = require('./base');

/**
 * Authentication errors
 */
function Unauthorized(message) {
  HWorkspaceError.call(this, message);
}
util.inherits(Unauthorized, HWorkspaceError);
Unauthorized.prototype.name = 'Unauthorized';

function AuthenticationError(message) {
  HWorkspaceError.call(this, message);
}
util.inherits(AuthenticationError, HWorkspaceError);
AuthenticationError.prototype.name = 'AuthenticationError';

function AuthenticationTimeout(message) {
  HWorkspaceError.call(this, message);
}
util.inherits(AuthenticationTimeout, HWorkspaceError);
AuthenticationTimeout.prototype.name = 'AuthenticationTimeout';

function NotFound() {
  HWorkspaceError.call(this, 'resource not found');
}
util.inherits(NotFound, HWorkspaceError);
NotFound.prototype.name = 'NotFound';

function InvalidToken() {
  HWorkspaceError.call(this, 'invalid token');
}
util.inherits(InvalidToken, HWorkspaceError);
InvalidToken.prototype.name = 'InvalidToken';

exports.Unauthorized          = Unauthorized;
exports.AuthenticationError   = AuthenticationError;
exports.AuthenticationTimeout = AuthenticationTimeout;
exports.NotFound              = NotFound;
exports.InvalidToken          = InvalidToken;
