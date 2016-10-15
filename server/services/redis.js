const redis    = require('redis');
const Bluebird = require('bluebird');

Bluebird.promisifyAll(redis.RedisClient.prototype);
Bluebird.promisifyAll(redis.Multi.prototype);

function _createRedisClient(redisURI) {
  return new Bluebird((resolve, reject) => {
    var redisClient = redis.createClient(redisURI);

    redisClient.once('ready', _resolve);
    redisClient.once('error', _reject);

    function off () {
      redisClient.removeListener('ready', _resolve);
      redisClient.removeListener('error', _reject);
    }

    function _resolve () {
      off();
      resolve(redisClient);
    }

    function _reject (err) {
      off();
      reject(err);
    }
  })
};

module.exports = function (app, options) {

  var redisService = {};

  /**
   * Redis requires using separate connections for publishers
   * and subscribers.
   *
   * http://stackoverflow.com/questions/22668244/should-i-use-separate-connections-for-pub-and-sub-with-redis
   */
  return Bluebird.all([
    _createRedisClient(options.redisURI),
    _createRedisClient(options.redisURI),
  ])
  .then((clients) => {

    redisService.pub = clients[0];
    redisService.sub = clients[1];

    // TODO: handle afterward errors
    return redisService;
  });
};
