const util = require('util');

const HWorkspaceError = require('./base');

function WorkspaceExists(message) {
  HWorkspaceError.call(this, message);
}
util.inherits(WorkspaceExists, HWorkspaceError);
WorkspaceExists.prototype.name = 'WorkspaceExists';

function NotFound(message) {
  HWorkspaceError.call(this, message);
}
util.inherits(NotFound, HWorkspaceError);
NotFound.prototype.name = 'NotFound';

exports.WorkspaceExists = WorkspaceExists;
exports.NotFound = NotFound;