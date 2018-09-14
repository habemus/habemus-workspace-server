// native dependencies
const path   = require('path');
const assert = require('assert');
const http   = require('http');

// third-party dependencies
const should = require('should');
const fse    = require('fs-extra');
const Bluebird = require('bluebird');

// own dependencies
const AnonymousClient     = require('habemus-workspace-client/public/anonymous');
const AuthenticatedClient = require('habemus-workspace-client/public/authenticated');
const hWorkspace = require('../../../server');

// auxiliary
const aux = require('../../aux');

describe('AnonymousClient#connect (anonymous)', function () {

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

  it('should fail to connect as an anonymous-client to a workspace that has no authenticated clients connected to it', function () {

    var anonymousClient = new AnonymousClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI,
    });

    return anonymousClient.connect('project-1-code')
      .then(aux.errorExpected, function (err) {
        err.name.should.equal('AuthenticationError');
      });
  });

  it('should successfully connect as an anonymous-client', function () {

    const workspaceRoot = ASSETS.tmpRootPath + '/' + ASSETS.workspace._id;

    // anonymous clients can only connect to workspaces that
    // already exist and are open. Workspaces can only be opened
    // by authenticated clients, thus we must first connect an authenticated-client

    var authenticatedClient = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI,
    });

    var anonymousClient = new AnonymousClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI,
    });

    // connect an authenticated client
    return authenticatedClient.connect('VALID_TOKEN', 'project-1-code')
      .then(() => {
        console.log('authenticated-client connected');
        
        return anonymousClient.connect('project-1-code');
      })
      .then(function () {
        console.log('anonymous-client connected');
      });
  });
  

  it.skip('anonymous-clients should not have access to h-fs methods', function () {

    const workspaceRoot = ASSETS.tmpRootPath + '/' + ASSETS.workspace._id;

    // anonymous clients can only connect to workspaces that
    // already exist and are open. Workspaces can only be opened
    // by authenticated clients, thus we must first connect an authenticated-client

    var authenticatedClient = new AuthenticatedClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI,
    });

    var anonymousClient = new AnonymousClient({
      apiVersion: '0.0.0',
      serverURI: ASSETS.hWorkspaceURI,
    });

    // connect an authenticated client
    return authenticatedClient.connect('TOKEN', 'project-1-code')
      .then(() => {
        console.log('authenticated-client connected');
        
        return anonymousClient.connect(ASSETS.workspace.code);
      })
      // .then(function () {
      //   console.log('anonymous-client connected');

      //   return anonymousClient.createFile('test', 'test-contents');
      // })
      // .then(aux.errorExpected, function (err) {
      //   console.log('ERROR', err);
      // });
  });

});