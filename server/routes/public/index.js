// third-party
const express = require('express');

module.exports = function (app, options) {

  var publicApp = express();

  // expose app's properties
  publicApp.constants   = app.constants;
  publicApp.errors      = app.errors;
  publicApp.controllers = app.controllers;
  publicApp.middleware  = app.middleware;
  publicApp.services    = app.services;

  // setup cors middleware only onto public app
  // and before other routes
  var _cors = app.middleware.cors({
    corsWhitelist: options.corsWhitelist
  });
  publicApp.use(_cors);
  publicApp.options('*', _cors);

  require('./workspace')(publicApp, options);

  // mount the public app onto the public route
  app.use('/public', publicApp);
};
