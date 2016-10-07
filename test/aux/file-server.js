// native
const path = require('path');

// third-party
const express = require('express');

module.exports = function (options) {

  var filesDir = options.filesDir;

  if (!path.isAbsolute(filesDir)) {
    throw new Error('filesDir MUST be an absolute path');
  }

  var app = express();

  /**
   * Serve files
   */
  app.use('/files', express.static(filesDir));

  return app;
};
