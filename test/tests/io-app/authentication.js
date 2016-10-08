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
const aux = require('../../aux');

describe('server authentication', function () {

  var ASSETS;

  /**
   * Create resources for each of the tests as
   * these tests are very sensitive
   */
  beforeEach(function () {

    aux.enableHMocks();

    return aux.setup().then((assets) => {
      ASSETS = assets;

      var server = aux.createTeardownServer();

      ASSETS.hWorkspace = hWorkspace(aux.genOptions({
        authTimeout: 5000,
      }));
      ASSETS.hWorkspaceURI = 'http://localhost:4000';

      return Bluebird.all([
        ASSETS.hWorkspace.attach(server),
        new Bluebird((resolve, reject) => {
          server.listen(4000, resolve);
        }),
      ]);
    })
    .then(() => {
      // create a workspace
      return ASSETS.hWorkspace.controllers.workspace.create('someuser', 'project-1-id');
    })
    .then((workspace) => {
      ASSETS.workspace = workspace;
    });
  });

  afterEach(function () {
    return aux.teardown();
  });

  it('basic manual authentication', function (done) {
    var socket = socketIOClient(ASSETS.hWorkspaceURI, {
      path: '/public/socket.io',
    });

    socket.on('connect', function () {
      socket.emit('authenticate', {
        role: 'authenticated-client',
        authToken: 'VALID_TOKEN',
        code: 'project-1-code',
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

      var socket = socketIOClient(ASSETS.hWorkspaceURI, {
        path: '/public/socket.io',
      });

      socket.on('connect', function () {
        socket.emit('authenticate', {
          role: 'authenticated-client',
          // authToken: 'TOKEN',
          code: 'project-1-code',
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

      var socket = socketIOClient(ASSETS.hWorkspaceURI, {
        path: '/public/socket.io',
      });

      socket.on('connect', function () {
        socket.emit('authenticate', {
          role: 'authenticated-client',
          authToken: 'TOKEN',
          // code: 'project-1-code',
        });
      });

      socket.once('authenticated', function () {
        done(new Error('expected authentication error'));
      });

      socket.once('authentication-error', function (err) {
        err.name.should.equal('InvalidOption');
        err.option.should.equal('projectCode');
        err.kind.should.equal('required');

        // disconnect client
        socket.disconnect();
        done();
      });
    });
    
    it.skip('should fail if the projectApp does not authorize the token permissions', function (done) {
      var socket = socketIOClient(ASSETS.hWorkspaceURI, {
        path: '/public/socket.io',
      });

      socket.on('connect', function () {
        socket.emit('authenticate', {
          authToken: 'TOKEN',
          code: 'project-1-code',
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

      var socket = socketIOClient(ASSETS.hWorkspaceURI, {
        path: '/public/socket.io',
      });

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

      var socket = socketIOClient(ASSETS.hWorkspaceURI, {
        path: '/public/socket.io',
      });

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