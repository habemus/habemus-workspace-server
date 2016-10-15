// native dependencies
const assert = require('assert');

// third-party dependencies
const should = require('should');
const fse = require('fs-extra');
const Bluebird = require('bluebird');

// own dependencies
const hWorkspace = require('../../../server');
const AuthenticatedClient = require('h-workspace-client/public/authenticated');

// auxiliary
const aux = require('../../aux');

describe('event broadcasting', function () {

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
      return ASSETS.hWorkspace.controllers.workspace.create('someuser', 'project-1-id');
    })
    .then((workspace) => {
      ASSETS.workspace = workspace;
    });
  });

  afterEach(function () {
    return aux.teardown();
  });

  it('if two clients are connected to the same hDev project, they should be capable of notifying events to each other', function (done) {
    
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