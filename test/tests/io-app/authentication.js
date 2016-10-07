// native dependencies
const assert = require('assert');

// third-party dependencies
const should = require('should');
const socketIOClient = require('socket.io-client');
const fse = require('fs-extra');
const Bluebird = require('bluebird');

// own dependencies
const hWorkspace = require('../../../server');

// auxiliary
const aux = require('../../auxiliary');

describe('server authentication', function () {

  var ASSETS;

  /**
   * Create resources for each of the tests as
   * these tests are very sensitive
   */
  beforeEach(function () {
    return aux.setup().then((assets) => {
      ASSETS = assets;

      var server = aux.createTeardownServer();

      ASSETS.hDev = hWorkspace(aux.genOptions({
        authTimeout: 5000,
      }));
      ASSETS.hDevURI = 'http://localhost:4000';

      return Bluebird.all([
        ASSETS.hDev.attach(server),
        new Bluebird((resolve, reject) => {
          server.listen(4000, resolve);
        }),
      ]);
    })
    .then(() => {
      // create a workspace
      ASSETS.projectApp.respondWith('/project/:identifier/versions|get', 'success');
      ASSETS.projectApp.respondWith('/project/:identifier/version/:versionId/signed-url|get', 'success');
      ASSETS.projectApp.respondWith('/auxiliary-routes/file-download|get', 'success');

      return ASSETS.hDev.controllers.workspace.create('TOKEN', {
        code: ASSETS.projectApp.mockResponseData.projectCode,
        projectId: ASSETS.projectApp.mockResponseData.projectId,
      });
    })
    .then((workspace) => {
      ASSETS.workspace = workspace;
    });
  });

  afterEach(function () {
    return aux.teardown();
  });

  it('basic manual authentication', function (done) {
    // project app authorizes
    ASSETS.projectApp.respondWith('/project/:identifier/verify-permissions|get', 'success');

    // ensure the project root exists
    const workspaceCode = ASSETS.workspace.code;

    var socket = socketIOClient(ASSETS.hDevURI);

    socket.on('connect', function () {
      socket.emit('authenticate', {
        role: 'authenticated-client',
        authToken: 'TOKEN',
        code: workspaceCode,
      });
    });

    socket.once('authenticated', function () {
      // disconnect client
      socket.disconnect();
      done();
    });

    socket.once('authentication-error', function (err) {
      done(err);
    });

    socket.once('error', done);
  });

  describe('authentication', function () {

    it('should require a token', function (done) {
      
      const workspaceCode = ASSETS.workspace.code;

      var socket = socketIOClient(ASSETS.hDevURI);

      socket.on('connect', function () {
        socket.emit('authenticate', {
          role: 'authenticated-client',
          // authToken: 'TOKEN',
          code: workspaceCode,
        });
      });

      socket.once('authenticated', function () {
        done(new Error('expected authentication error'));
      });

      socket.once('authentication-error', function (err) {
        err.name.should.equal('InvalidOption');
        err.option.should.equal('authToken');
        err.kind.should.equal('required');


        // disconnect client
        socket.disconnect();
        done();
      });
    });

    it('should require the `code`', function (done) {

      const workspaceCode = ASSETS.workspace.code;

      var socket = socketIOClient(ASSETS.hDevURI);

      socket.on('connect', function () {
        socket.emit('authenticate', {
          role: 'authenticated-client',
          authToken: 'TOKEN',
          // code: workspaceCode,
        });
      });

      socket.once('authenticated', function () {
        done(new Error('expected authentication error'));
      });

      socket.once('authentication-error', function (err) {
        err.name.should.equal('InvalidOption');
        err.option.should.equal('code');
        err.kind.should.equal('required');

        // disconnect client
        socket.disconnect();
        done();
      });
    });
    
    it('should fail if the projectApp does not authorize the token permissions', function (done) {
      ASSETS.projectApp.respondWith('/project/:identifier/verify-permissions|get', 'unauthorized');

      const workspaceCode = ASSETS.workspace.code;

      var socket = socketIOClient(ASSETS.hDevURI);

      socket.on('connect', function () {
        socket.emit('authenticate', {
          authToken: 'TOKEN',
          code: workspaceCode,
          role: 'authenticated-client',
        });
      });

      socket.once('authenticated', function () {
        done(new Error('error expected'));
      });

      socket.once('authentication-error', function (err) {
        err.name.should.equal('Unauthorized');

        // disconnect client
        socket.disconnect();
        done();
      });

      socket.once('error', done);
    });

    it('should not allow any `message` events before a successful authentication', function (done) {

      const workspaceCode = ASSETS.workspace.code;

      var socket = socketIOClient(ASSETS.hDevURI);

      socket.on('connect', function () {
        socket.emit('message', {
          any: 'data'
        });

        socket.once('authentication-error', function (err) {
          err.name.should.equal('Unauthorized');

          // check that the socket has been disconnected
          // due to the message passing before any successful 'authentication' process
          setTimeout(function () {
            socket.connected.should.equal(false);

            // disconnect client
            socket.disconnect();
            done();
          }, 100);
        });
      });
    });

    it('should disconnect clients that are not authenticated after `authTimeout` ms', function (done) {
      this.timeout(6000);

      var socket = socketIOClient(ASSETS.hDevURI);

      socket.on('connect', function () {

        socket.once('authentication-error', function (err) {
          err.name.should.equal('AuthenticationTimeout');

          // check that the socket has been disconnected
          // due to the message passing before any successful 'authentication' process
          setTimeout(function () {
            socket.connected.should.equal(false);

            // disconnect client
            socket.disconnect();
            done();
          }, 100);
        });
      });
    });
  });




});