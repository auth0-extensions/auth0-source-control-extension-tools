const _ = require('lodash');
const Promise = require('bluebird');
const ValidationError = require('auth0-extension-tools').ValidationError;

const constants = require('../constants');
const configurables = require('./configurables');

/*
 * Get all non-global clients
 */
const getClients = function(progress, client) {
  if (progress.clients) {
    return Promise.resolve(progress.clients);
  }

  /* Grab all non-global clients */
  return Promise.all(client.clients.getAll({ global: false }))
    .then(function(allClients) {
      progress.clients = _.chain(allClients)
        .flattenDeep()
        .union()
        .value();
      return progress.clients;
    });
};

/**
 * Update clients
 * @param progress the progress object
 * @client the Auth0 client for the management API
 * @return Promise for creating new and updating existing clients
 */
const updateClients = function(progress, client) {
  return configurables.update(constants.CLIENTS_CLIENT_NAME, progress, client);
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
