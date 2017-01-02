// native dependencies
const assert = require('assert');

// third-party dependencies
const should = require('should');
const socketIOClient = require('socket.io-client');
const fse = require('fs-extra');
const Bluebird = require('bluebird');

// own dependencies
const hWorkspace = require('../../../server');
const AuthenticatedClient = require('h-workspace-client/public/authenticated');

// auxiliary
const aux = require('../../aux');

describe('room-manager', function () {

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

      ASSETS.hWorkspace = hWorkspace(aux.genOptions());
      ASSETS.hWorkspaceURI = 'http://localhost:4000/public';

      return Bluebird.all([
        ASSETS.hWorkspace.attach(server),
        new Bluebird((resolve, reject) => {
          server.listen(4000, resolve);
        })
      ]);
    })
    .then(() => {
      // create a workspace
      return ASSETS.hWorkspace.controllers.workspace.create('username', 'project-1-id');
    })
    .then((workspace) => {
      ASSETS.workspace = workspace;
    });
  });

  afterEach(function () {
    return aux.teardown();
  });

  it('only one workspace room should be created for each workspace, no matter how many socket connections use it', function () {
    const projectRoot = ASSETS.tmpRootPath + '/' + ASSETS.workspace._id;

    const token = 'VALID_TOKEN';

    var client1 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI
    });

    var client2 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI
    });

    var client3 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI,
    });

    return Promise.all([
      client1.connect(token, 'project-1-code'),
      client2.connect(token, 'project-1-code'),
      client3.connect(token, 'project-1-code'),
    ])
    .then(() => {
      // there should be only one workspace room
      Object.keys(ASSETS.hWorkspace.io.roomManager.rooms)
        .length.should.equal(1);

      // the workspaceRoom should be an object
      var workspaceRoom = ASSETS.hWorkspace.io.roomManager.rooms[ASSETS.workspace._id];
      should(workspaceRoom).be.instanceof(Object);

      // and it should have 3 sockets connected to it
      return workspaceRoom.listLocalSockets();
    })
    .then((socketIds) => {
      socketIds.length.should.equal(3);
      socketIds.indexOf(client1.id).should.not.equal(-1);
      socketIds.indexOf(client2.id).should.not.equal(-1);
      socketIds.indexOf(client3.id).should.not.equal(-1);

      // disconnect all clients
      client1.disconnect();
      client2.disconnect();
      client3.disconnect();
    });
  });

  it('upon socket disconnection, the rooms should check if the workspaceRoom is still required and clean up if necessary', function () {

    const projectRoot = ASSETS.tmpRootPath + '/' + ASSETS.workspace._id;

    const token = 'VALID_TOKEN';
    const permissionScopes = ['read'];

    var client1 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI
    });

    var client2 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI
    });

    var client3 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI,
    });

    return Promise.all([
      client1.connect(token, 'project-1-code'),
      client2.connect(token, 'project-1-code'),
      client3.connect(token, 'project-1-code'),
    ])
    .then(() => {
      var workspaceRoom = ASSETS.hWorkspace.io.roomManager.rooms[ASSETS.workspace._id];

      should(workspaceRoom).be.instanceof(Object);

      // there should be only one workspaceRoom
      Object.keys(ASSETS.hWorkspace.io.roomManager.rooms)
        .length.should.equal(1);
      
      // disconnect one client
      client2.disconnect();

      return aux.wait(400);
    })
    .then(() => {
      // nothing should have happened to the rooms as there are still other
      // two clients connected to the project
      Object.keys(ASSETS.hWorkspace.io.roomManager.rooms)
        .length.should.equal(1);

      // disconnect all clients
      client1.disconnect();
      client3.disconnect();

      return aux.wait(400);
    })
    .then(() => {
      // the workspaceRoom should have been completely removed
      Object.keys(ASSETS.hWorkspace.io.roomManager.rooms)
        .length.should.equal(0);
    });
  });

  it('mass connection and disconnection', function () {
    const projectRoot = ASSETS.tmpRootPath + '/' + ASSETS.workspace._id;

    const token = 'VALID_TOKEN';
    const permissionScopes = ['read'];

    var client1 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI
    });

    var client2 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI
    });

    var client3 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI,
    });

    return Promise.all([
      client1.connect(token, 'project-1-code'),
      client2.connect(token, 'project-1-code'),
      client3.connect(token, 'project-1-code'),
    ])
    .then(() => {
      var workspaceRoom = ASSETS.hWorkspace.io.roomManager.rooms[ASSETS.workspace._id];

      should(workspaceRoom).be.instanceof(Object);

      // there should be only one resource pack
      Object.keys(ASSETS.hWorkspace.io.roomManager.rooms)
        .length.should.equal(1);
      
      // disconnect one client
      client2.disconnect();

      return aux.wait(400)
    })
    .then(() => {
      // nothing should have happened to the rooms as there are still other
      // two clients connected to the project
      Object.keys(ASSETS.hWorkspace.io.roomManager.rooms)
        .length.should.equal(1);

      // disconnect all clients
      client1.disconnect();
      client3.disconnect();

      return aux.wait(400);
    })
    .then(() => {
      // the resources should have been completely removed
      Object.keys(ASSETS.hWorkspace.io.roomManager.rooms)
        .length.should.equal(0);
    });
  });
});