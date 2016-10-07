// native dependencies
const path   = require('path');
const assert = require('assert');
const http   = require('http');

// third-party dependencies
const should = require('should');
const fse    = require('fs-extra');
const Bluebird = require('bluebird');
const mockery = require('mockery');
const mockPrivateHProject = require('h-project-client/mock/private');

// own dependencies
const AuthenticatedClient = require('h-workspace-client/authenticated');
const hWorkspace = require('../../../server');

// auxiliary
const aux = require('../../aux');

describe('AuthenticatedClient#connect', function () {

  var ASSETS;

  beforeEach(function () {

    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    // mock h-project/client/private
    mockery.registerMock(
      'h-project-client/private',
      mockPrivateHProject({
        data: require('../../aux/h-project-mock-data'),
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

    return aux.setup().then((assets) => {
      ASSETS = assets;

      var server = aux.createTeardownServer();

      ASSETS.hWorkspace = hWorkspace(aux.genOptions());
      ASSETS.hWorkspaceURI = 'http://localhost:4000';

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
    mockery.disable();

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