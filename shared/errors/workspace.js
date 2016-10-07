const util = require('util');

const HDevError = require('./base');

function WorkspaceExists(message) {
  HDevError.call(this, message);
}
util.inherits(WorkspaceExists, HDevError);
WorkspaceExists.prototype.name = 'WorkspaceExists';

function NotFound(message) {
  HDevError.call(this, message);
}
util.inherits(NotFound, HDevError);
NotFound.prototype.name = 'NotFound';

exports.WorkspaceExists = WorkspaceExists;
exports.NotFound = NotFound;