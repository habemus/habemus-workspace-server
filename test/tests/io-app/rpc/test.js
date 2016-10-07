// native dependencies
const assert = require('assert');

// third-party dependencies
const should = require('should');
const fse = require('fs-extra');
const Bluebird = require('bluebird');

// own dependencies
const createAdminApp = require('../../../../server');
const AuthenticatedClient = require('../../../../client/authenticated');

// auxiliary
const aux = require('../../../auxiliary');

describe('rpc', function () {

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

  it('if two clients are connected to the same hDev project, they should be capable of executing rpc methods on each other', function (done) {
    ASSETS.projectApp.respondWith('/project/:identifier/verify-permissions|get', 'success');
    ASSETS.projectApp.respondWith('/project/:identifier|get', 'success');

    const workspaceCode = ASSETS.workspace.code;
    const projectRoot = ASSETS.tmpRootPath + '/' + ASSETS.workspace._id;

    const token = 'TOKEN';
    const permissionScopes = ['read', 'write', 'update', 'delete'];

    var client1 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI,
    });

    var client2 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hDevURI
    });

    var client3 = new AuthenticatedClient({
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

      // expose methods on client2
      client2.expose('hello', function (arg1) {
        received2 = true;

        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve('hello ' + arg1 + ' from 2');
          }, 500);
        });
      });

      // expose methods on client3
      client3.expose('hello', function (arg1) {
        received3 = true;

        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve('hello ' + arg1 + ' from 3');
          });
        });
      });

      // execute the hello method on client3
      client1.exec(client3.id, 'hello', ['1'])
        .then(function (result) {
          result.should.equal('hello 1 from 3');
          received1.should.equal(false);
          received2.should.equal(false);
          received3.should.equal(true);

          // disconnect all clients
          client1.disconnect();
          client2.disconnect();
          client3.disconnect();
          done();
        })
        .catch(done);
    })
    .catch((err) => {
      console.warn(err);

      return Bluebird.reject(err);
    });
  });
});