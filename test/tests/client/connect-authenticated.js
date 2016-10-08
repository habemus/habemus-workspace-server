// native dependencies
const path   = require('path');
const assert = require('assert');
const http   = require('http');

// third-party dependencies
const should = require('should');
const fse    = require('fs-extra');
const Bluebird = require('bluebird');

// own dependencies
const AuthenticatedClient = require('h-workspace-client/authenticated');
const hWorkspace = require('../../../server');

// auxiliary
const aux = require('../../aux');

describe('AuthenticatedClient#connect', function () {

  var ASSETS;

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
      return ASSETS.hWorkspace.controllers.workspace.create('someuser', 'project-1-id');
    })
    .then((workspace) => {
      ASSETS.workspace = workspace;
    });
  });

  afterEach(function () {
    return aux.teardown();
  });

  it('should reject if the authentication fails', function () {

    var client = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI
    });

    return client.connect('INVALID_TOKEN', 'project-1-code')
      .then(aux.errorExpected, function (err) {
        err.name.should.equal('AuthenticationError');

        setTimeout(function () {
          // make sure client is not connected anymore after an authentication error
          client.socket.connected.should.equal(false);
        }, 100);
      });
  });

  it('should successfully connect as an authenticated-client', function () {
    const workspaceRoot = ASSETS.tmpRootPath + '/' + ASSETS.workspace._id;

    // instantiate client
    var client = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI,
    });

    // connect to the server and authenticate
    return client.connect('VALID_TOKEN', 'project-1-code')
      .then(function () {
        
        return client.createFile('README.md', 'markdown contents');
      })
      .then(function () {
    
        fse.readFileSync(workspaceRoot + '/README.md', 'utf8')
          .should.equal('markdown contents');
      });
  });

});