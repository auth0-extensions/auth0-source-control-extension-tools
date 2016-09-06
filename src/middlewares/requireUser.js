const tools = require('auth0-extension-tools');

module.exports = (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required for this endpoint.'));
  }

  return next();
};
