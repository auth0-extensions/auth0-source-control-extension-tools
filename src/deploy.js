import Auth0 from './auth0';
import log from './logger';

export default async function deploy(context, client, config) {
  log.info('Getting access token for ' + config('AUTH0_CLIENT_ID') + '/' + config('AUTH0_DOMAIN'));

  // Send all changes to Auth0.
  await context.init();

  const { assets } = context;

  const auth0 = new Auth0(client, assets, config);

  // Validate Assets
  await auth0.validate();

  // Process changes
  await auth0.processChanges();

  return auth0.handlers.reduce((accum, h) => {
    accum[h.type] = {
      deleted: h.deleted,
      created: h.created,
      updated: h.updated
    };
    return accum;
  }, {});
}
