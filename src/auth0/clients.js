const _ = require('lodash');
const Promise = require('bluebird');
const ValidationError = require('auth0-extension-tools').ValidationError;

const utils = require('../utils');

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

const updateExistingClient = function(progress, client, clientName, clientConfig, existingClient) {
  /* Get entire client config */
  clientConfig = utils.parseJsonFile(clientName, clientConfig.configFile, progress.mappings);
  clientConfig.name = clientName;

  /* Filter out things that haven't changed */
  const changedConfigKeys = _(clientConfig)
    .keys()
    .filter(function(key) {
      return clientConfig[key] !== existingClient[key];
    })
    .value();

  if (changedConfigKeys.length > 0) {
    /* Make a new object with just the changed attributes */
    const changedConfig = _.zipObject(changedConfigKeys, _.map(changedConfigKeys, function(key) { return clientConfig[key]; }));
    progress.clientsUpdated += 1;
    progress.log('Updating client ' + clientName + ': ' + JSON.stringify(changedConfig));
    return client.clients.update({ client_id: existingClient.client_id }, changedConfig);
  }

  progress.log('Skipping update of client ' + clientName + ', because no changes were found.');
  return Promise.resolve(existingClient);
};


/**
 * Update existing clients
 * @param progress the progress object
 * @client the Auth0 client for the management API
 * @return Promise for updating the existing clients
 */
const updateExistingClients = function(progress, client) {
  // Check if there is anything to do here
  if (progress.updateClients && Object.keys(progress.updateClients).length > 0) {
    progress.log('Updating clients...');

    /* First process clients we need to add */
    return Promise.map(Object.keys(progress.updateClients),
      function(clientName) {
        return updateExistingClient(progress, client, clientName, progress.updateClients[clientName].config, progress.updateClients[clientName].existing);
      }
    );
  }

  // No updateClients, so must not be any work here, just resolve happily
  return Promise.resolve();
};

/**
 * Create an individual client
 * @param progress state object
 * @param client ManagementClient
 * @param clientName The name of the client to create
 * @param clientConfig The JSON configuration of the client
 * @returns {clientConfig} The created client
 */
const createClient = function(progress, client, clientName, clientConfig) {
  /* process client */
  clientConfig = utils.parseJsonFile(clientName, clientConfig.configFile, progress.mappings);
  clientConfig.name = clientName;
  progress.clientsCreated += 1;
  progress.log('Creating client ' + clientName + ': ' + JSON.stringify(clientConfig));
  return client.clients.create(clientConfig);
};

/**
 * Create new clients
 * @param progress the progress object
 * @client the Auth0 client for the management API
 * @return Promise for creating new clients
 */
const createClients = function(progress, client) {
  // Check if there is anything to do here
  if (progress.addClients && Object.keys(progress.addClients).length > 0) {
    progress.log('Creating clients...');

    /* First process clients we need to add */
    return Promise.map(Object.keys(progress.addClients),
      function(clientName) {
        return createClient(progress, client, clientName, progress.addClients[clientName]);
      }
    );
  }

  // No addClients, so must not be any work here, just resolve happily
  return Promise.resolve();
};

/**
 * Update clients
 * @param progress the progress object
 * @client the Auth0 client for the management API
 * @return Promise for creating new and updating existing clients
 */
const updateClients = function(progress, client) {
  return createClients(progress, client)
    .then(() => updateExistingClients(progress, client));
};

/**
 * Split the clients into buckets for adding, updating, and deleting
 */
const splitClients = function(progress, clients, existingClients) {
  /* Here split into different containers for type of client action */
  const clientNames = _(clients).keys();
  const existingClientNames = _.map(existingClients, 'name');

  // Now grab the different buckets of names
  const toAddClientNames = _(clientNames).filter(function(name) {
    return existingClientNames.indexOf(name) < 0;
  }).value();
  const toDeleteClientNames = _(existingClientNames).filter(function(name) {
    return clientNames.indexOf(name) < 0;
  }).value();
  const toUpdateClientNames = _(clientNames).filter(function(name) {
    return existingClientNames.indexOf(name) >= 0;
  }).value();

  progress.log('Adding ' + toAddClientNames.length + ' client(s) and Updating ' + toUpdateClientNames.length +
    ' client(s).  If implemented would be Deleting ' + toDeleteClientNames.length + ' client(s)');

  /*
  Create set of clients that we need to add with the config information
   */
  progress.addClients = _.zipObject(toAddClientNames,
    _.map(toAddClientNames, function(name) {
      return clients[name];
    }));

  /*
  Just need the list of names we need to delete
   */
  progress.deleteClients = toDeleteClientNames;

  /*
  Need both the config and existing information for clients we need to update
   */
  progress.updateClients = _.zipObject(toUpdateClientNames,
    _.map(toUpdateClientNames, function(name) {
      return {
        existing: _.find(existingClients, [ 'name', name ]),
        config: clients[name]
      };
    }));

  return existingClients;
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

  /* Check that the clients are formed well */
  const invalidClients = _(clients)
    .keys()
    .filter(function(clientName) {
      return !clients[clientName].configFile;
    })
    .value();

  if (invalidClients.length) {
    return Promise.reject(
      new ValidationError('The following clients have no config file: ' + invalidClients.join())
    );
  }

  /* Also make sure client name either matches or is not in the script */
  const invalidNames = _(clients)
    .keys()
    .filter(function(clientName) {
      /* Parse configFile */
      const config = utils.parseJsonFile(clientName, clients[clientName].configFile, progress.mappings);
      return config.name && config.name !== clientName;
    })
    .value();

  if (invalidNames.length) {
    return Promise.reject(
      new ValidationError('The following clients have key names that do not match the configured name in the configFile: ' + invalidNames.join())
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
          return splitClients(progress, clients, existingClientsFiltered);
        });
    });
};

module.exports = {
  getClients: getClients,
  updateClients: updateClients,
  validateClients: validateClients
};
