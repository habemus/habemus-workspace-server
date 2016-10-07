// native dependencies
const path   = require('path');
const assert = require('assert');
const http   = require('http');

// third-party dependencies
const should   = require('should');
const fse      = require('fs-extra');
const Bluebird = require('bluebird');
const mockery  = require('mockery');
const mockPrivateHProject = require('h-project-client/mock/private');

// own dependencies
const hWorkspace = require('../../../server');

// auxiliary
const aux = require('../../aux');

const PROJECT_MOCK_DATA = require('../../aux/h-project-mock-data');

describe('workspaceCtrl', function () {

  var ASSETS;
  var workspaceCtrl;

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
        data: PROJECT_MOCK_DATA,
      })
    );

    return aux.setup()
      .then((assets) => {
        ASSETS = assets;

        var server = aux.createTeardownServer();

        ASSETS.hWorkspace = hWorkspace(aux.genOptions());

        return ASSETS.hWorkspace.ready;
      })
      .then((hWorkspace) => {
        workspaceCtrl = hWorkspace.controllers.workspace;
      });
  });

  afterEach(function () {
    mockery.disable();

    return aux.teardown();
  });

  describe('#create(username, projectCode)', function () {

    it('should create a project and fetch its files', function () {
      var projectId = 'project-1-id';
      var username  = 'someuser';

      // ensure project path is empty
      fse.emptyDirSync(ASSETS.tmpRootPath);

      return workspaceCtrl.create(username, projectId)
        .then((workspace) => {
          workspace.projectId.should.equal(projectId);
          workspace.projectVersionCode.should.equal('v2');
          workspace._id.should.be.instanceof(String);

          var projectPath = ASSETS.tmpRootPath + '/' + workspace._id;

          // ensure files are available
          fse.statSync(projectPath).isDirectory().should.equal(true);
        })
        .catch((err) => {
          return Bluebird.reject(err);
        });
    });
    
    it('should ensure uniqueness of projectId', function () {
      var projectId = 'project-1-id';
      var username  = 'someuser';
      
      return workspaceCtrl.create(username, projectId)
        .then((workspace) => {
          return workspaceCtrl.create(username, projectId);
        })
        .then(aux.errorExpected, (err) => {
          err.name.should.equal('WorkspaceExists');
        });
    });

  });

  describe('#loadVersion(workspace, version)', function () {
    // TBD
  });

  describe('#isReady(workspace)', function () {

    it('should return true if the files of the workspace are in place', function () {
      var projectId = 'project-1-id';
      var username  = 'someuser';
      
      return workspaceCtrl.create(username, projectId)
        .then((workspace) => {
          return workspaceCtrl.isReady(workspace);
        })
        .then((isReady) => {
          isReady.should.eql(true);
        })
    });

    it('should return false in case the workspace files are not in place', function () {

      var workspace = new ASSETS.hWorkspace.services.mongoose.models.Workspace({
        projectId: 'project-1-id',
        ownerUsername: 'someuser',
      });

      return workspace.save()
        .then((workspace) => {
          return workspaceCtrl.isReady(workspace);
        })
        .then((isReady) => {
          isReady.should.eql(false);
        });
    });
  });

  describe('get', function () {
    beforeEach(function () {

      return Bluebird.all([
        workspaceCtrl.create('someuser', 'project-1-id'),
        workspaceCtrl.create('someuser', 'project-2-id')
      ])
      .then((workspaces) => {
        ASSETS.workspaces = workspaces;
      });
    });

    describe('#getById(workspaceId)', function () {

      it('should retrieve a workspace by its _id', function () {
        return workspaceCtrl.getById(ASSETS.workspaces[0]._id)
          .then((workspace) => {
            workspace.projectId.should.eql('project-1-id');
          });
      });

    });

    describe('#getByProjectId(projectId)', function () {

    });

    describe('#getByProjectCode(projectCode)', function () {

    });
  });

  describe('#delete(workspace)', function () {

  });
});