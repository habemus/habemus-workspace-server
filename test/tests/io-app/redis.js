// // native dependencies
// const assert = require('assert');

// // third-party dependencies
// const should = require('should');
// const socketIOClient = require('socket.io-client');
// const fse = require('fs-extra');
// const Bluebird = require('bluebird');
// const ms = require('ms');

// // own dependencies
// const createAdminApp = require('../../../server');
// const HDevClient = require('../../../client');

// // auxiliary
// const aux = require('../../auxiliary');

// const SCOPES = ['read', 'write', 'update', 'delete'];

// describe('redis sandbox', function () {

//   var ASSETS;

//   /**
//    * Create resources for each of the tests as
//    * these tests are very sensitive
//    */
//   beforeEach(function () {
//     return aux.setup().then((assets) => {
//       ASSETS = assets;

//       var server = aux.createTeardownServer();

//       ASSETS.hDev = createAdminApp(aux.genOptions({
//         authTimeout: 5000,
//       }));
//       ASSETS.hDevURI = 'http://localhost:4000';

//       return Bluebird.all([
//         ASSETS.hDev.attach(server),
//         new Bluebird((resolve, reject) => {
//           server.listen(4000, resolve);
//         }),
//       ]);
//     })
//     .then(() => {
//       // create a workspace
//       ASSETS.projectApp.respondWith('/project/:projectCode/versions|get', 'success');
//       ASSETS.projectApp.respondWith('/project/:projectCode/version/:versionId/signed-url|get', 'success');
//       ASSETS.projectApp.respondWith('/auxiliary-routes/file-download|get', 'success');

//       return ASSETS.hDev.controllers.workspace.create('TOKEN', {
//         code: ASSETS.projectApp.mockResponseData.projectCode,
//         _id: ASSETS.projectApp.mockResponseData.projectId,
//       });
//     })
//     .then((workspace) => {
//       ASSETS.workspace = workspace;
//     });
//   });

//   afterEach(function () {
//     return aux.teardown();
//   });

//   it('works', function () {

//     this.timeout(ms('11min'));

//     // project app authorizes
//     ASSETS.projectApp.respondWith('/project/:projectCode/verify-permissions|get', 'success');
//     ASSETS.projectApp.respondWith('/project/:projectCode|get', 'success');

//     // get the projectCode from the mock projectApp
//     const projectCode = ASSETS.projectApp.mockResponseData.projectCode;
    
//     var client = new HDevClient({
//       apiVersion: '0.0.0',
//       serverURI: ASSETS.hDevURI
//     });
    
//     return client.connect('TOKEN', projectCode, SCOPES)
//       .then(() => {
//         console.log('connected');

//         return aux.wait(ms('10min'));
//       });
//   });


// });