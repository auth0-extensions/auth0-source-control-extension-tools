const _ = require('lodash');
const Promise = require('bluebird');
const ValidationError = require('auth0-extension-tools').ValidationError;

const constants = require('../constants');
const configurables = require('./configurables');
const apiCall = require('./apiCall');

/*
 * Get all non-global resourceServers
 */
const getResourceServers = function(progress, client) {
  if (progress.resourceServers) {
    return Promise.resolve(progress.resourceServers);
  }

  /* Grab all non-global resourceServers */
  return Promise.all(apiCall(client, client.resourceServers.getAll, [ { is_system: false } ]))
    .then(function(allResourceServers) {
      progress.resourceServers = _.chain(allResourceServers)
        .flattenDeep()
        .union()
        .value();
      return progress.resourceServers;
    });
};

/**
 * Update resourceServers
 * @param progress the progress object
 * @client the Auth0 client for the management API
 * @return Promise for creating new and updating existing resourceServers
 */
const updateResourceServers = function(progress, client) {
  return configurables.update(constants.RESOURCE_SERVERS_CLIENT_NAME, progress, client);
};

/**
 * Make sure they are not trying to update the Management API
 * @param progress the deploy state object
 * @param resourceServers the list of resourceServers to add or update
 * @returns {Promise.<*>}
 */
const validateResourceServersExistence = function(progress, resourceServers) {
  /* Make sure they are not trying to update the Management API */
  if (_.keys(resourceServers).indexOf(constants.RESOURCE_SERVERS_MANAGEMENT_API_NAME) >= 0) {
    return Promise.reject(
      new ValidationError('You can not configure the ' + constants.RESOURCE_SERVERS_MANAGEMENT_API_NAME + '.')
    );
  }

  return Promise.resolve();
};

/*
 * Validate resourceServers before touching anything.
 *
 * Failure States => Ensure we are not touching the deploy client
 *
 * Side-effects => progress should include the set of resourceServers that already exist with this name
 *              => progress should include the set of resourceServers that need to be created
 *
 */
const validateResourceServers = function(progress, client, resourceServers) {
  const clientNames = _.keys(resourceServers);
  if (clientNames.length === 0) {
    return Promise.resolve(true);
  }

  progress.log('Validating resourceServers...');

  return getResourceServers(progress, client)
    .then(function(existingResourceServers) {
      return validateResourceServersExistence(progress, resourceServers)
        .then(function() {
          return configurables.validate(constants.RESOURCE_SERVERS_CLIENT_NAME, progress, client,
            resourceServers, existingResourceServers, [ ], constants.RESOURCE_SERVERS_ID_NAME);
        });
    });
};

module.exports = {
  getResourceServers: getResourceServers,
  updateResourceServers: updateResourceServers,
  validateResourceServers: validateResourceServers
};
