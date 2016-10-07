// native dependencies
const path = require('path');
const http = require('http');

// third-party dependencies
const fse = require('fs-extra');
const MongoClient = require('mongodb').MongoClient;
const enableDestroy = require('server-destroy');
const Bluebird = require('bluebird');
const mockery = require('mockery');
const mockPrivateHProject = require('h-project-client/mock/private');

const fileServer = require('./file-server');

const TMP_ROOT_PATH = path.join(__dirname, '../.tmp');
const FIXTURES_ROOT_PATH = path.join(__dirname, '../fixtures');

const TEST_DB_URI = 'mongodb://localhost:27017/h-dev-test-db';
const TEST_REDIS_URI = 'redis://192.168.99.100:6379';

exports.mongodbURI = TEST_DB_URI;
exports.redisURI   = TEST_REDIS_URI;

exports.defaultOptions = {
  apiVersion: '0.0.0',
  
  mongodbURI: exports.mongodbURI,
  redisURI: TEST_REDIS_URI,
  
  hProjectURI: 'http://localhost:8000',
  hProjectToken: 'h-project-token',
  
  hAccountURI: 'http://localhost:9000',
  hAccountToken: 'h-account-token',

  workspacesFsRoot: TMP_ROOT_PATH,
  workspaceHostURL: 'http://habemus.website',
  corsWhitelist: '*',
};

/**
 * Enables mockery for h-modules
 */
exports.enableHMocks = function () {
  mockery.enable({
    warnOnReplace: false,
    warnOnUnregistered: false,
    useCleanCache: true
  });

  // mock h-project/client/private
  mockery.registerMock(
    'h-project-client/private',
    mockPrivateHProject({
      data: require('./h-project-mock-data'),
    })
  );

  function PrivateHAccountMock() {}
  PrivateHAccountMock.prototype.decodeToken = function (authToken, token) {
    // console.log('decodeToken', authToken, token);

    if (token === 'VALID_TOKEN') {
      return Bluebird.resolve({
        sub: 'user-1-id',
        username: 'user1username',
      });
    } else {
      return Bluebird.reject(new Error('Unauthorized'));
    }
  };

  mockery.registerMock(
    'h-account-client/private',
    PrivateHAccountMock
  );
};

/**
 * Generates an options object using
 * the passed options and adding default values to
 * empty options
 * @param  {Object} opts
 * @return {Object}
 */
exports.genOptions = function (opts) {
  return Object.assign({}, exports.defaultOptions, opts);
};

/**
 * Returns a promise that delays the given amount of miliseconds
 * @param  {Number} ms
 * @return {Bluebird}
 */
exports.wait = function (ms) {
  return new Bluebird((resolve) => {
    setTimeout(resolve, ms);
  });
};

/**
 * Used to reject successful promises that should have not been fulfilled
 * @return {Bluebird Rejection}
 */
exports.errorExpected = function () {
  return Bluebird.reject(new Error('error expected'));
};

/**
 * Starts a server and keeps reference to it.
 * This reference will be used for teardown.
 */
exports.createTeardownServer = function () {

  var server = this.server = http.createServer();

  // make the server destroyable
  enableDestroy(server);

  // replace the listen method
  var _listen = server.listen;
  server.listen = function () {

    // register the server to be tore down
    exports.registerTeardown(function () {
      return new Promise((resolve, reject) => {
        server.destroy((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
    });

    var args = Array.prototype.slice.call(arguments, 0);
    _listen.apply(server, args);
  };

  return server;
};

/**
 * Sets up an assets object that is ready for the tests
 * @return {[type]} [description]
 */
exports.setup = function () {

  var _assets = {
    projectURI: 'http://localhost:8000',
    tmpRootPath: TMP_ROOT_PATH,
    fixturesRootPath: FIXTURES_ROOT_PATH,
    mongodbURI: TEST_DB_URI,
  };

  fse.emptyDirSync(_assets.tmpRootPath);

  // connect to the database and drop it
  return MongoClient.connect(TEST_DB_URI)
    .then((db) => {

      _assets.db = db;

      // register db teardown
      exports.registerTeardown(function dropDatabase() {
        // drop database
        return _assets.db.dropDatabase().then(() => {
          return _assets.db.close();
        });
      });

      return _assets.db.dropDatabase();
    })
    .then(() => {

      var server = exports.createTeardownServer();

      server.on('request', fileServer({
        filesDir: FIXTURES_ROOT_PATH
      }));

      return new Bluebird((resolve, reject) => {
        server.listen(9000, resolve);
      });
    })
    .then(() => {

      // finally return assets
      return _assets;
    });
};

var TEARDOWN_CALLBACKS = [];

/**
 * Register a teardown function to be executed by the teardown
 * The function should return a promise
 */
exports.registerTeardown = function (teardown) {
  TEARDOWN_CALLBACKS.push(teardown);
};

/**
 * Executes all functions listed at TEARDOWN_CALLBACKS
 */
exports.teardown = function () {

  // disable mockery
  mockery.disable();

  return Promise.all(TEARDOWN_CALLBACKS.map((fn) => {
    return fn();
  }))
  .then(() => {
    TEARDOWN_CALLBACKS = [];
  });
};

exports.AFTEREACH_TIMEOUT = 0;