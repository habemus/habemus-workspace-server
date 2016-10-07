/**
 * Evaluates a middleware option against the request object.
 * In case the option value is a function,
 * returns the result of the invocation of the function.
 * Otherwise, simply return the option itself.
 * 
 * @param  {*} opt
 * @param  {Express Req} req
 * @return {*}
 */
exports.evalOpt = function (opt, req) {
  return (typeof opt === 'function') ? opt(req) : opt;
};
