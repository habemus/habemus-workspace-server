// native dependencies
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

// third-party dependencies
const Bluebird   = require('bluebird');
const superagent = require('superagent');
const debug      = require('debug')('h-dev-project');
const rimraf     = require('rimraf');
const zipUtil    = require('zip-util');
const tmp        = require('tmp');
// TODO: implement bower install chroot version
const bower      = require('bower');

// promisify
Bluebird.promisifyAll(fs);
const rimrafAsync = Bluebird.promisify(rimraf);

const errors    = require('../../shared/errors');
const CONSTANTS = require('../../shared/constants');

// path to the bower install script
const BOWER_INSTALL_SCRIPT_PATH = path.join(__dirname, '../../scripts/bower-install');

module.exports = function (app, options) {

  /**
   * Token used to authenticate for private
   * h-project api requests
   * @type {String}
   */
  const H_PROJECT_TOKEN = options.hProjectToken;

  const Workspace = app.services.mongoose.models.Workspace;

  var workspaceCtrl = {};

  /**
   * Creates a workspace for the project.
   * Creates a database entry and loads the project's files.
   * Both files and database entry are associated to the project by
   * the project's _id attribute (not by the code) so that
   * modifications to the project do not have high impact on the dev server
   * 
   * @param  {String} username
   * @param  {String} projectId
   * @param  {Object} workspaceData
   * @return {Bluebird -> Workspace}
   */
  workspaceCtrl.create = function (username, projectId, workspaceData) {
    if (!username) {
      return Bluebird.reject(new errors.InvalidOption('username', 'required'));
    }

    if (!projectId) {
      return Bluebird.reject(new errors.InvalidOption('projectId', 'required'));
    }

    workspaceData = workspaceData || {};

    var workspace = new Workspace(workspaceData);

    workspace.set('ownerUsername', username);
    workspace.set('projectId', projectId);

    return workspace.save()
      .then((workspace) => {
        return workspaceCtrl.loadLatestVersion(workspace);
      })
      .catch((err) => {

        if (err.name === 'MongoError' && err.code === 11000) {
          // TODO: improvement research:
          // for now we infer that any 11000 error (duplicate key)
          // refers to username repetition
          // UPDATE: it seems there is no actual good solution
          // other than RegExp the error message.
          // For now, we'll run db checks to check what is the offending field
          // https://github.com/Automattic/mongoose/issues/2129
          // 
          // For now, we'll assume duplicate key error on creation will only
          // happen for projectId (it is the only one with unique index set)
          return Bluebird.reject(new errors.WorkspaceExists());
        } else {
          // upon any other errors, remove the workspace entirely
          if (workspace && workspace._id) {
            Workspace.findOneAndRemove({
              _id: workspace._id
            });

            var workspacePath = 
              app.services.workspacesRoot.prependTo(workspace._id);

            rimrafAsync(workspacePath).catch((err) => {
              console.warn(
                'error removing orphan workspace dir ',
                workspacePath
              );
            });
          }

          return Bluebird.reject(err);
        }
      });
  };

  /**
   * Loads the project's files given the workspace and the version
   * 
   * @param  {Workspace} workspace
   * @param  {Object} version
   *         - srcSignedURL
   * @return {Bluebird}
   */
  workspaceCtrl.loadVersion = function (workspace, version) {
    if (!(workspace instanceof Workspace)) {
      return Bluebird.reject(new errors.InvalidOption('workspace', 'required'));
    }

    if (!version) {
      return Bluebird.reject(new errors.InvalidOption('version', 'required'));
    }

    if (!version.srcSignedURL) {
      return Bluebird.reject(new errors.InvalidOption('version.srcSignedURL', 'required'));
    }

    // build the workspace's path
    var workspacePath = app.services.workspacesRoot.prependTo(workspace._id);

    var _workspace;

    // publish `workspace-update-started`
    app.services.redis.pub.publishAsync(
      CONSTANTS.WORKSPACE_EVENTS.UPDATE_STARTED,
      workspace._id.toString()
    );

    return rimrafAsync(workspacePath).then(() => {
      return zipUtil.zipDownload(
        version.srcSignedURL,
        workspacePath
      )
    })
    .then(() => {
      // save the versionCode to the workspace database entry
      workspace.projectVersionCode = version.code;

      return workspace.save();
    })
    .then((workspace) => {
      _workspace = workspace;
      // publish `workspace-update-finished`
      
      return app.services.redis.pub.publishAsync(
        CONSTANTS.WORKSPACE_EVENTS.UPDATE_FINISHED,
        workspace._id.toString()
      );
    })
    .then(() => {
      return _workspace;
    })
    .catch((err) => {
      app.services.redis.pub.publishAsync(
        CONSTANTS.WORKSPACE_EVENTS.UPDATE_FAILED
      );

      return Bluebird.reject(err);
    });
  };

  /**
   * Creates a projectVersion from the workspace's files
   * 
   * @param  {Workspace} workspace
   * @return {Bluebird -> ProjectVersion}
   */
  workspaceCtrl.createProjectVersion = function (workspace) {
    if (!(workspace instanceof Workspace)) {
      return Bluebird.reject(new errors.InvalidOption('workspace', 'required'));
    }

    var _tmpFile;

    return new Bluebird((resolve, reject) => {

      // build the workspace's path
      var workspacePath = app.services.workspacesRoot.prependTo(workspace._id);

      // TBD: eliminate the need for a temporary file.
      // we are having lots of trouble in creating a
      // write stream using request module.

      tmp.file((err, filePath, fd, cleanupCallback) => {
        var writeStream = fs.createWriteStream(filePath);
        zipUtil.zip(workspacePath + '/**/*')
          .pipe(writeStream)
          .on('error', reject)
          .on('finish', () => {
            resolve({
              path: filePath,
              cleanup: cleanupCallback
            });
          });
      });

    })
    .then((tmpFile) => {
      _tmpFile = tmpFile;

      return app.services.hProject.createVersion(
        H_PROJECT_TOKEN,
        workspace.projectId,
        tmpFile.path
      );
    })
    .then((version) => {
      _tmpFile.cleanup();

      // save the versionCode to the workspace database entry
      workspace.projectVersionCode = version.code;

      return workspace.save();
    });
  };

  /**
   * Loads the latest version of the workspace's project
   * into the workspace files
   * 
   * @param  {Workspace} workspace
   * @return {Bluebird -> Workspace}
   */
  workspaceCtrl.loadLatestVersion = function (workspace) {
    if (!(workspace instanceof Workspace)) {
      return Bluebird.reject(new errors.InvalidOption('workspace', 'required'));
    }

    // get the last version
    return app.services.hProject.getLatestVersion(
      H_PROJECT_TOKEN,
      workspace.projectId,
      {
        byCode: false,
        srcSignedURL: true
      }
    )
    .then((version) => {
      // load the version files into the workspace
      return workspaceCtrl.loadVersion(
        workspace,
        version
      );
    });
  };

  /**
   * Retrieves the workspace by _id.
   * 
   * @param  {String} workspaceId
   * @return {Bluebird -> Workspace}
   */
  workspaceCtrl.getById = function (workspaceId) {
    if (!workspaceId) {
      return Bluebird.reject(new errors.InvalidOption('workspaceId', 'required'));
    }

    return Workspace.findOne({ _id: workspaceId }).then((workspace) => {
      if (!workspace) {
        return Bluebird.reject(new errors.NotFound(workspaceId));
      }

      return workspace;
    });
  };

  /**
   * Retrieves the workspace by its projectId
   * 
   * @param  {String} projectId
   * @return {Bluebird -> workspace}
   */
  workspaceCtrl.getByProjectId = function (projectId) {
    if (!projectId) {
      return Bluebird.reject(new errors.InvalidOption('projectId', 'required'));
    }
    return Workspace.findOne({ projectId: projectId }).then((workspace) => {
      if (!workspace) {
        return Bluebird.reject(new errors.NotFound(projectId));
      }

      return workspace;
    });
  }

  /**
   * Retrieves a workspace given its corresponding project's code
   * 
   * @param  {String} projectCode
   * @return {Bluebird -> workspace}
   */
  workspaceCtrl.getByProjectCode = function (projectCode) {
    if (!projectCode) {
      return Bluebird.reject(new errors.InvalidOption('projectCode', 'required'));
    }

    return app.services.hProject.get(
      H_PROJECT_TOKEN,
      projectCode,
      {
        byCode: true
      }
    )
    .then((project) => {
      return workspaceCtrl.getByProjectId(project._id);
    })
    .catch((err) => {
      // we must handle this error manually as the `NotFound` error
      // is not from h-workspace but from h-project-client
      if (err.name === 'NotFound') {
        return Bluebird.reject(new errors.NotFound());
      } else {
        return Bluebird.reject(err);
      }
    });
  };

  /**
   * Verify whether the root directory for the required workspace
   * exists
   * @param  {Workspace} workspace
   * @return {Bluebird -> Boolean}
   */
  workspaceCtrl.isReady = function (workspace) {
    if (!(workspace instanceof Workspace)) {
      return Bluebird.reject(new errors.InvalidOption('workspace', 'required'));
    }

    // check that the workspace directory exists
    var workspacePath = app.services.workspacesRoot.prependTo(workspace._id);

    return fs.statAsync(workspacePath)
      .then((stat) => {

        return stat.isDirectory();

      })
      .catch((err) => {
        if (err.code === 'ENOENT') {
          return false;
        } else {
          throw err;
        }
      });
  };

  /**
   * Removes a workspace's files and db entry
   * 
   * @param  {Workspace} workspace
   * @return {Bluebird}
   */
  workspaceCtrl.delete = function (workspace) {
    if (!(workspace instanceof Workspace)) {
      return Bluebird.reject(new errors.InvalidOption('workspace', 'required'));
    }

    var workspacePath = app.services.workspacesRoot.prependTo(workspace._id);

    return rimrafAsync(workspacePath)
      .then(() => {
        return Workspace.findOneAndRemove({
          _id: workspace._id
        });
      });
  };
  
  /**
   * Installs bower dependencies of the given workspace
   * 
   * TODO: move into separate script to be run using chroot.
   * 
   * @param workspace
   */
  workspaceCtrl.bowerInstall = function (workspace, packages) {
    if (!(workspace instanceof Workspace)) {
      return Bluebird.reject(new errors.InvalidOption('workspace', 'required'));
    }
    
    packages = packages || [];
    
    var workspacePath = app.services.workspacesRoot.prependTo(workspace._id);
    
    // TODO: implement chroot version
    // var args = [
    //   BOWER_INSTALL_SCRIPT_PATH,
    //   '--fs-root', workspacePath,
    // ];
    
    // packages.forEach((pkg) => {
    //   args.push('--package');
    //   args.push(pkg);
    // });
    
    // return new Bluebird((resolve, reject) => {
    //   var proc = child_process.execFile('node', args, {
        
    //   });
      
    //   proc.on('error', reject);
      
    //   proc.stderr.pipe(process.stderr)
      
    //   proc.on('exit', function (code) {
    //     if (code !== 0) {
    //       reject(new Error('exited with code ' + code));
    //     } else {
    //       resolve();
    //     }
    //   });
      
    // });
    
    return new Bluebird((resolve, reject) => {
      
      var installOptions = {
        forceLatest: true,
      };
      
      var installConfig = {
        cwd: workspacePath,
        interactive: false,
      };
      
      bower.commands.install([], installOptions, installConfig)
        .on('error', reject)
        .on('end', resolve);
    });
  };
  
  return workspaceCtrl;
};
