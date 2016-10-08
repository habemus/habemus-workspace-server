// native
const url = require('url');

// third-party dependencies
const mongoose = require('mongoose');
const uuid     = require('uuid');

// constants
const Schema = mongoose.Schema;

const errors = require('../../shared/errors');

/**
 * Schema that defines a Workspace
 * @type {Schema}
 */
var workspaceSchema = new Schema({

  _id: {
    type: String,
    default: uuid.v4,
  },

  /**
   * Username of the owner of this workspace
   * @type {Object}
   */
  ownerUsername: {
    type: String,
    required: true,
  },
  
  /**
   * Identifier of the project this workspace refers to.
   * It must be unique: one workspace per project
   *
   * We opted to use projectId as to make it easier to allow
   * projectCode switching. The id is immutable.
   */
  projectId: {
    type: String,
    required: true,
    unique: true,
  },

  /**
   * Code of the project's version the workspace is at
   * @type {Object}
   */
  projectVersionCode: {
    type: String,
  },
});

/**
 * Define an unique index that ensures the uniqueness
 * of ownerUsername + projectId accross workspaces
 */
// workspaceSchema.index({
//   ownerUsername: true,
//   projectId: true
// }, {
//   unique: true
// });

// takes the connection and options and returns the model
module.exports = function (conn, app, options) {
  
  var Workspace = conn.model('Workspace', workspaceSchema);

  return Workspace;
};