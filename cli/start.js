// native dependencies
const fs   = require('fs');
const path = require('path');
const http = require('http');

// third-party
const envOptions = require('@habemus/env-options');

// internal dependencies
const hWorkspace = require('../server');

var options = envOptions({
  port: 'env:PORT',

  // basic info
  apiVersion: 'pkg:version',
  workspacesFsRoot: 'env:WORKSPACES_FS_ROOT',
  corsWhitelist: 'list:CORS_WHITELIST',

  // services
  mongodbURI: 'fs:MONGODB_URI_PATH',
  redisURI: 'fs:REDIS_URI_PATH',

  hProjectURI: 'env:H_PROJECT_URI',
  hProjectToken: 'fs:H_PROJECT_TOKEN_PATH',

  hAccountURI: 'env:H_ACCOUNT_URI',
  hAccountToken: 'fs:H_ACCOUNT_TOKEN_PATH',

  enablePrivateAPI: 'bool?:ENABLE_PRIVATE_API',
  privateAPISecret: 'fs?:PRVATE_API_SECRET',
});

// create http server and pass express app as callback
var server = http.createServer();

var app = hWorkspace(options);
app.attach(server).then(() => {
  console.log('h-workspace ready');
})
.catch((err) => {
  console.warn('h-workspace setup error', err);
});

// start listening
server.listen(options.port, function () {
  console.log('h-dev-cloud admin server listening at port %s', options.port);
});
