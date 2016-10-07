// native dependencies
const assert = require('assert');

// third-party dependencies
const should = require('should');
const fse = require('fs-extra');
const Bluebird = require('bluebird');

// own dependencies
const createAdminApp = require('../../../../server');
const HDevClient = require('../../../../client/authenticated');

// auxiliary
const aux = require('../../../auxiliary');

describe('event broadcasting', function () {

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
      ASSETS.projectApp.respondWith('/project/:identifier/verify-permissions|get', 'success');
      
      ASSETS.projectApp.respondWith('/project/:identifier/versions|get', 'success');
      ASSETS.projectApp.respondWith('/project/:identifier/version/:versionId/signed-url|get', 'success');
      ASSETS.projectApp.respondWith('/auxiliary-routes/file-download|get', 'success');

      // create a workspace
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

  it('if two clients are connected to the same hDev project, they should be capable of notifying events to each other', function (done) {

    const workspaceCode = ASSETS.workspace.code;
    
    const token = 'TOKEN';
    const permissionScopes = ['read', 'write', 'update', 'delete'];

    var client1 = new HDevClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI,
    });

    var client2 = new HDevClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI
    });

    var client3 = new HDevClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI
    });

    Promise.all([
      client1.connect(token, workspaceCode),
      client2.connect(token, workspaceCode),
      client3.connect(token, workspaceCode)
    ])
    .then(function () {

      var received1 = false;
      var received2 = false;
      var received3 = false;

      // let client2 listen to `test-event`
      client2.on('test-event', function (data) {
        data.test.should.equal('test-data-value');
        received2 = true;
      });

      client3.on('test-event', function (data) {
        data.test.should.equal('test-data-value');
        received3 = true;
      });

      client1.on('test-event', function (data) {
        // ensure the broadcaster does not receive its own event
        done(new Error('should not have received the event'));
      });

      client1.publish('test-event', {
        test: 'test-data-value'
      });

      setTimeout(function () {
        received1.should.equal(false);
        received2.should.equal(true);
        received3.should.equal(true);

        // disconnect all clients
        client1.disconnect();
        client2.disconnect();
        client3.disconnect();
        done();
      }, 500);
    })
    .catch((err) => {
      console.warn(err);

      done(err);
    });
  });
});