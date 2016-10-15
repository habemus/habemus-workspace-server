// native dependencies
const assert = require('assert');

// third-party dependencies
const should = require('should');
const fse = require('fs-extra');
const Bluebird = require('bluebird');

// own dependencies
const createAdminApp = require('../../../server');
const AuthenticatedClient = require('h-workspace-client/public/authenticated');

// auxiliary
const aux = require('../../aux');

describe('rpc', function () {

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

      ASSETS.hWorkspace = createAdminApp(aux.genOptions());
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
      return ASSETS.hWorkspace.controllers.workspace.create('someuser', 'project-1-id');
    })
    .then((workspace) => {
      ASSETS.workspace = workspace;
    });
  });

  afterEach(function () {
    return aux.teardown();
  });

  it('if two clients are connected to the same hDev project, they should be capable of executing rpc methods on each other', function (done) {

    const projectRoot = ASSETS.tmpRootPath + '/' + ASSETS.workspace._id;

    const token = 'VALID_TOKEN';
    const permissionScopes = ['read', 'write', 'update', 'delete'];

    var client1 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI,
    });

    var client2 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI
    });

    var client3 = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI
    });

    Promise.all([
      client1.connect(token, 'project-1-code'),
      client2.connect(token, 'project-1-code'),
      client3.connect(token, 'project-1-code')
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