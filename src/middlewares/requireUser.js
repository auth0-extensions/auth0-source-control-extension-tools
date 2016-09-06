const UnauthorizedError = require('auth0-extension-tools').UnauthorizedError;

module.exports = (req, res, next) => {
  if (!req.user) {
    return next(UnauthorizedError('Authentication required for this endpoint.'));
  }

  return next();
};
