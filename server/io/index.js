module.exports = function (app, options) {

  // set accepted origins
  app.io.origins(function (origin, cb) {

    var whitelisted = app.services.cors.isOriginWhitelisted(origin);

    if (!whitelisted) {
      console.warn('request from not-whitelisted origin %s', origin);
    }

    cb(null, whitelisted);
    
  });

  // setup connection handler
  require('./connection')(app, options);

  return app;
};