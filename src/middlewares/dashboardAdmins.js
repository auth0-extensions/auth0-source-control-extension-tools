const url = require('url');
const auth0 = require('auth0-oauth2-express');
const config = require('auth0-extension-tools').config();

module.exports = () => {
  const options = {
    credentialsRequired: false,
    clientName: 'TFS Deployments',
    audience: () => `https://${config('AUTH0_DOMAIN')}/api/v2/`
  };

  const middleware = auth0(options);
  return (req, res, next) => {
    const protocol = 'https';
    const pathname = url.parse(req.originalUrl).pathname.replace(req.path, '');
    const baseUrl = url.format({
      protocol,
      host: req.get('host'),
      pathname
    });

    options.clientId = baseUrl;
    return middleware(req, res, next);
  };
};
