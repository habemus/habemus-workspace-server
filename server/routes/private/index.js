// third-party
const express = require('express');

module.exports = function (app, options) {

  var privateApp = express();

  // expose app's properties
  privateApp.constants   = app.constants;
  privateApp.errors      = app.errors;
  privateApp.controllers = app.controllers;
  privateApp.middleware  = app.middleware;
  privateApp.services    = app.services;

  require('./workspace')(privateApp, options);

  // mount the private app onto the private route
  // and ensure authentication is run before any routes
  app.use('/_', 
    app.middleware.authenticatePrivate(options),
    privateApp
  );
};
