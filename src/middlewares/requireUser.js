const UnauthorizedError = require('auth0-extension-tools').UnauthorizedError;

module.exports = function(domain) {
  return function(req, res, next) {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required for this endpoint.'));
    }

    if (!req.user.aud || req.user.aud.indexOf('https://' + domain + '/api/v2/') === -1) {
      return next(new UnauthorizedError('Invalid token. Audience does not match: ' + domain));
    }

    return next();
  };
};
