exports.EXPOSED_FS_METHODS = [
  'rmdir',
  'mkdir',
  'readdir',
  'rename',
  'readFile',
  'writeFile',
  'appendFile',
  'unlink',
];

/**
 * This is the message event used for the IPC message handling.
 * @type {String}
 */
exports.MESSAGE_EVENT = 'message';

/**
 * The eventName that is used for authentication requests
 * @type {String}
 */
exports.AUTH_REQUEST_EVENT = 'authenticate';

/**
 * The event name that is used for authentication success
 * @type {String}
 */
exports.AUTH_SUCCESS_EVENT = 'authenticated';

/**
 * The event name for transmitting authentication errors
 * @type {String}
 */
exports.AUTH_ERROR_EVENT = 'authentication-error';


exports.AUTH_TIMEOUT_EVENT = 'authentication-timeout';

exports.ROLES = {
  AUTHENTICATED_CLIENT: 'authenticated-client',
  ANONYMOUS_CLIENT: 'anonymous-client',
};