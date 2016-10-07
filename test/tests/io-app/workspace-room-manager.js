// native dependencies
const assert = require('assert');

// third-party dependencies
const should = require('should');
const socketIOClient = require('socket.io-client');
const fse = require('fs-extra');
const Bluebird = require('bluebird');

// own dependencies
const createAdminApp = require('../../../server');
const AuthenticatedClient = require('../../../client/authenticated');

// auxiliary
const aux = require('../../auxiliary');

describe('workspaceRoomManager', function () {

  var ASSETS;

  /**
   * Create resources for each of the tests as
   * these tests are very sensitive
   */
  beforeEach(function () {
    return aux.setup().then((assets) => {
      ASSETS = assets;

      var server = aux.createTeardownServer();

      ASSETS.hDev = createAdminApp(aux.genOptions());
      ASSETS.hDevURI = 'http://localhost:4000';

      return Bluebird.all([
        ASSETS.hDev.attach(server),
        new Bluebird((resolve, reject) => {
          server.listen(4000, resolve);
        })
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

  it('only one workspace room should be created for each workspace, no matter how many socket connections use it', function () {
    ASSETS.projectApp.respondWith('/project/:identifier/verify-permissions|get', 'success');
    ASSETS.projectApp.respondWith('/project/:identifier|get', 'success');

    const workspaceCode = ASSETS.workspace.code;
    const projectRoot = ASSETS.tmpRootPath + '/' + ASSETS.workspace._id;

    const token = 'TOKEN';

    var client1 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI
    });

    var client2 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI
    });

    var client3 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI,
    });

    return Promise.all([
      client1.connect(token, workspaceCode),
      client2.connect(token, workspaceCode),
      client3.connect(token, workspaceCode),
    ])
    .then(() => {
      // there should be only one workspace room
      Object.keys(ASSETS.hDev.services.workspaceRoomManager.workspaceRooms)
        .length.should.equal(1);

      // the workspaceRoom should be an object
      var workspaceRoom = ASSETS.hDev.services
        .workspaceRoomManager.workspaceRooms[ASSETS.workspace.code];
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

  it('upon socket disconnection, the workspaceRoomManager should check if the workspaceRoom is still required and clean up if necessary', function () {
    ASSETS.projectApp.respondWith('/project/:identifier/verify-permissions|get', 'success');
    ASSETS.projectApp.respondWith('/project/:identifier|get', 'success');

    const workspaceCode = ASSETS.workspace.code;
    const projectRoot = ASSETS.tmpRootPath + '/' + ASSETS.workspace._id;

    const token = 'TOKEN';
    const permissionScopes = ['read'];

    var client1 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI
    });

    var client2 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI
    });

    var client3 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI,
    });

    return Promise.all([
      client1.connect(token, workspaceCode),
      client2.connect(token, workspaceCode),
      client3.connect(token, workspaceCode),
    ])
    .then(() => {
      var workspaceRoom = ASSETS.hDev.services
        .workspaceRoomManager.workspaceRooms[ASSETS.workspace._id];

      should(workspaceRoom).be.instanceof(Object);

      // there should be only one workspaceRoom
      Object.keys(ASSETS.hDev.services.workspaceRoomManager.workspaceRooms)
        .length.should.equal(1);
      
      // disconnect one client
      client2.disconnect();

      return aux.wait(400);
    })
    .then(() => {
      // nothing should have happened to the workspaceRooms as there are still other
      // two clients connected to the project
      Object.keys(ASSETS.hDev.services.workspaceRoomManager.workspaceRooms)
        .length.should.equal(1);

      // disconnect all clients
      client1.disconnect();
      client3.disconnect();

      return aux.wait(400);
    })
    .then(() => {
      // the workspaceRoom should have been completely removed
      Object.keys(ASSETS.hDev.services.workspaceRoomManager.workspaceRooms)
        .length.should.equal(0);
    });
  });

  it('mass connection and disconnection', function () {
    ASSETS.projectApp.respondWith('/project/:identifier/verify-permissions|get', 'success');
    ASSETS.projectApp.respondWith('/project/:identifier|get', 'success');

    const workspaceCode = ASSETS.workspace.code;
    const projectRoot = ASSETS.tmpRootPath + '/' + ASSETS.workspace._id;

    const token = 'TOKEN';
    const permissionScopes = ['read'];

    var client1 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI
    });

    var client2 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI
    });

    var client3 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI,
    });

    return Promise.all([
      client1.connect(token, workspaceCode),
      client2.connect(token, workspaceCode),
      client3.connect(token, workspaceCode),
    ])
    .then(() => {
      var workspaceRoom = ASSETS.hDev.services
        .workspaceRoomManager.workspaceRooms[ASSETS.workspace._id];

      should(workspaceRoom).be.instanceof(Object);

      // there should be only one resource pack
      Object.keys(ASSETS.hDev.services.workspaceRoomManager.workspaceRooms)
        .length.should.equal(1);
      
      // disconnect one client
      client2.disconnect();

      return aux.wait(400)
    })
    .then(() => {
      // nothing should have happened to the rooms as there are still other
      // two clients connected to the project
      Object.keys(ASSETS.hDev.services.workspaceRoomManager.workspaceRooms)
        .length.should.equal(1);

      // disconnect all clients
      client1.disconnect();
      client3.disconnect();

      return aux.wait(400);
    })
    .then(() => {
      // the resources should have been completely removed
      Object.keys(ASSETS.hDev.services.workspaceRoomManager.workspaceRooms)
        .length.should.equal(0);
    });
  });
});