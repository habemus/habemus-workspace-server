const util = require('util');

const HDevError = require('./base');

/**
 * Authentication errors
 */
function Unauthorized(message) {
  HDevError.call(this, message);
}
util.inherits(Unauthorized, HDevError);
Unauthorized.prototype.name = 'Unauthorized';

function AuthenticationError(message) {
  HDevError.call(this, message);
}
util.inherits(AuthenticationError, HDevError);
AuthenticationError.prototype.name = 'AuthenticationError';

function AuthenticationTimeout(message) {
  HDevError.call(this, message);
}
util.inherits(AuthenticationTimeout, HDevError);
AuthenticationTimeout.prototype.name = 'AuthenticationTimeout';

function NotFound() {
  HDevError.call(this, 'resource not found');
}
util.inherits(NotFound, HDevError);
NotFound.prototype.name = 'NotFound';

function InvalidToken() {
  HDevError.call(this, 'invalid token');
}
util.inherits(InvalidToken, HDevError);
InvalidToken.prototype.name = 'InvalidToken';

exports.Unauthorized          = Unauthorized;
exports.AuthenticationError   = AuthenticationError;
exports.AuthenticationTimeout = AuthenticationTimeout;
exports.NotFound              = NotFound;
exports.InvalidToken          = InvalidToken;
