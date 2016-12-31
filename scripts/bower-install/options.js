// native
const path = require('path');

// third-party
const nopt = require('nopt');

// constatns
const KNOWN_OPTS = {
  'fs-root': path,
  'package': [String, Array],
};
const SHORTHANDS = {};

// parse cli arguments
var parsed = nopt(KNOWN_OPTS, SHORTHANDS, process.argv, 2);

/**
 * The root of the project: will be used for chroot
 */
exports.fsRoot = parsed['fs-root'];

/**
 * Packages to be installed
 */
exports.packages = parsed['package'];
