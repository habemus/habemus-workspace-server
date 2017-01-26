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
  corsWhitelist: 'list:CORS_WHITELIST',
  workspacesFsRoot: 'env:WORKSPACES_FS_ROOT',

  // services
  mongodbURI: 'fs:MONGODB_URI_PATH',
  redisURI: 'fs:REDIS_URI_PATH',

  hAccountURI: 'env:H_ACCOUNT_URI',
  hAccountToken: 'fs:H_ACCOUNT_TOKEN_PATH',

  hProjectURI: 'env:H_PROJECT_URI',
  hProjectToken: 'fs:H_PROJECT_TOKEN_PATH',

  enablePrivateAPI: 'bool?:ENABLE_PRIVATE_API',
  privateAPISecret: 'fs?:PRIVATE_API_SECRET_PATH',
});

// create http server and pass express app as callback
var server = http.createServer();

var app = hWorkspace(options);
app.attach(server).then(() => {
  console.log('h-workspace ready');

  // start listening
  server.listen(options.port, function () {
    console.log('h-workspace server listening at port %s', options.port);
  });
})
.catch((err) => {
  console.error('h-workspace setup error', err);
  process.exit(1);
});
