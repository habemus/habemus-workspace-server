// third-party dependencies
// constants
const BEARER_TOKEN_RE = /^Bearer\s+(.+)/;

// exports a function that takes the app and some options and
// returns the middleware
module.exports = function (app, options) {

  /**
   * Private token used to authenticate h-website to h-account
   * @type {JWT}
   */
  const H_ACCOUNT_TOKEN = options.hAccountToken;

  const errors = app.errors;
  
  function parseToken(req) {
    var authorizationHeader = req.header('Authorization');

    if (!authorizationHeader) { return false; }

    var match = authorizationHeader.match(BEARER_TOKEN_RE);

    if (!match) {
      return false;
    } else {
      return match[1];
    } 
  }

  return function (req, res, next) {
    var token = parseToken(req);

    if (!token) {
      next(new errors.InvalidToken());
      return;
    }

    app.services.hAccount
      .decodeToken(H_ACCOUNT_TOKEN, token)
      .then((decoded) => {

        req.tokenData = decoded;

        next();
      })
      .catch((err) => {

        if (err.code === 'InvalidToken') {
          next(new errors.InvalidToken());
        } else {
          next(err);
        }
        
        return;
      });
  };
};
