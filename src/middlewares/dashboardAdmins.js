const url = require('url');
const auth0 = require('auth0-oauth2-express');

module.exports = function(domain, clientName, rootTenantAuthority) {
  if (!domain) throw new Error('Domain is required');
  if (!clientName) throw new Error('clientName is required');

  const options = {
    credentialsRequired: false,
    clientName,
    audience: function() {
      return 'https://' + domain + '/api/v2/';
    },
    rootTenantAuthority
  };

  const middleware = auth0(options);
  return function(req, res, next) {
    const protocol = 'https';
    const pathname = url.parse(req.originalUrl).pathname.replace(req.path, '');
    const baseUrl = url.format({
      protocol: protocol,
      host: req.get('host'),
      pathname: pathname
    });

    options.clientId = baseUrl;
    return middleware(req, res, next);
  };
};
