const _ = require('lodash');
const Promise = require('bluebird');
const ValidationError = require('auth0-extension-tools').ValidationError;

const constants = require('../constants');
const configurables = require('./configurables');
const apiCall = require('./apiCall');
const multipartRequest = require('./multipartRequest');

/*
 * Get all non-global clients
 */
const getClients = function(progress, client) {
  if (progress.clients) {
    return Promise.resolve(progress.clients);
  }

  /* Grab all non-global clients */
  return Promise.all(multipartRequest(client, 'clients', { global: false }))
    .then(function(allClients) {
      progress.clients = _.chain(allClients)
        .flattenDeep()
        .union()
        .value();
      return progress.clients;
    });
};

/**
 * Add the client grants if they have changed
 *
 * @param progress the state object
 * @param client the management client
 * @param unit the existing client
 * @param metaData the client grant information
 */
const processClientGrants = function(progress, client, existingClient, metaData) {
  /* Make sure grants have been specified, if not, simply return */
  if (metaData && metaData.grants) {
    const grantPromises = [];
    _.keys(metaData.grants).forEach(function(audience) {
      /* Foreach audience, set the client grants */
      const filter = { audience: audience };
      grantPromises.push(apiCall(client, client.clientGrants.getAll, [ filter ])
        .then(function(clientGrantsForAudience) {
          /* First check if we have actually found something */
          var clientGrants = _.filter(clientGrantsForAudience, function(grant) {
            return grant.client_id === existingClient.client_id;
          });
          if (clientGrants.length >= 1) {
            if (clientGrants.length > 1) {
              /* Shouldn't be able to get here */
              progress.log('Strangely found too many client grants for ' + existingClient.name + ', audience: ' + audience);
            }

            /* Check if the scopes have changed */
            if (JSON.stringify(clientGrants[0].scope) !== JSON.stringify(metaData.grants[audience])) {
              /* Scopes have changed, run an update */
              const updatePayload = { scope: metaData.grants[audience] };
              return apiCall(client, client.clientGrants.update, [ { id: clientGrants[0].id }, updatePayload ])
                .then(function() {
                  return true;
                });
            }

            /* No changes, just return that we didn't have to change anything */
            return Promise.resolve(false);
          }

          /* Didn't find one, so let's just create it */
          const createPayload = {
            client_id: existingClient.client_id,
            audience: audience,
            scope: metaData.grants[audience]
          };
          return apiCall(client, client.clientGrants.create, [ createPayload ])
            .then(function() {
              return true;
            });
        }));
    });

    /* Resolve all of the promises and return true if any of them were true */
    return Promise.all(grantPromises)
      .then(function(results) {
        return results.indexOf(true) >= 0;
      });
  }

  /* return that no changes were made */
  return Promise.resolve(false);
};

/**
 * Update clients
 * @param progress the progress object
 * @client the Auth0 client for the management API
 * @return Promise for creating new and updating existing clients
 */
const updateClients = function(progress, client) {
  return configurables.update(constants.CLIENTS_CLIENT_NAME, progress, client, processClientGrants);
};

/**
 * Make sure the management client exists and is filtered out, also make sure we have configFile defined for everything
 * @param clients the list of clients to add or update
 * @param managementClient the name of the management client
 * @param existingClients the list of clients that already have been added
 * @returns {Promise.<*>}
 */
const validateClientsExistence = function(progress, clients, managementClient, existingClients) {
  var existingClientsFiltered = existingClients;
  /* Make sure management client is valid */
  if (managementClient) {
    const priorSize = existingClientsFiltered.length;
    existingClientsFiltered = _.filter(existingClients,
      function(client) {
        return client.client_id !== managementClient;
      });

    if (priorSize === existingClientsFiltered.length) {
      const existingClientNames = _.map(existingClients, 'client_id');
      return Promise.reject(
        new ValidationError('Did not find ' + managementClient + ', in list of existing client IDs: ' + existingClientNames.join())
      );
    }
  } else {
    return Promise.reject(
      new ValidationError('When specifying clients, you must specify which client is the management client for the deploy application.')
    );
  }

  return Promise.resolve(existingClientsFiltered);
};

/*
 * Validate clients before touching anything.
 *
 * Failure States => Ensure we are not touching the deploy client
 *
 * Side-effects => progress should include the set of clients that already exist with this name
 *              => progress should include the set of clients that need to be created
 *
 */
const validateClients = function(progress, client, clients, managementClient) {
  const clientNames = _.keys(clients);
  if (clientNames.length === 0) {
    return Promise.resolve(true);
  }

  progress.log('Validating clients...');

  return getClients(progress, client)
    .then(function(existingClients) {
      return validateClientsExistence(progress, clients, managementClient, existingClients)
        .then(function(existingClientsFiltered) {
          return configurables.validate(constants.CLIENTS_CLIENT_NAME, progress, client, clients, existingClientsFiltered, [ ], constants.CLIENTS_CLIENT_ID_NAME);
        });
    });
};

module.exports = {
  getClients: getClients,
  updateClients: updateClients,
  validateClients: validateClients
};
