const _ = require('lodash');
const Promise = require('bluebird');

const constants = require('../constants');
const configurables = require('./configurables');
const apiCall = require('./apiCall');

/*
 * Get all connections
 */
const getConnections = function(progress, client) {
  if (progress.connections) {
    return Promise.resolve(progress.connections);
  }

  /* Grab all connections */
  return Promise.all(apiCall(client, client.connections.getAll))
    .then(function(allConnections) {
      progress.connections = _.chain(allConnections)
        .flattenDeep()
        .union()
        .value();
      return progress.connections;
    });
};

/**
 * Update Connections
 * @param progress the progress object
 * @client the Auth0 client for the management API
 * @return Promise for creating new and updating existing connections
 */
const updateConnections = function(progress, client) {
  return configurables.update(constants.CONNECTIONS_CLIENT_NAME, progress, client);
};

/*
 * Validate connections before touching anything.
 *
 * Failure States => Ensure we are not touching the deploy client
 *
 * Side-effects => progress should include the set of connections that already exist with this name
 *              => progress should include the set of connections that need to be created
 *
 */
const validateConnections = function(progress, client, connections) {
  const connectionNames = _.keys(connections);
  if (connectionNames.length === 0) {
    return Promise.resolve(true);
  }

  progress.log('Validating connections...');

  return getConnections(progress, client)
    .then(function(existingConnections) {
      return configurables.validate(constants.CONNECTIONS_CLIENT_NAME, progress, client, connections, existingConnections, [ ], constants.CONNECTIONS_ID_NAME);
    });
};

module.exports = {
  getConnections: getConnections,
  updateConnections: updateConnections,
  validateConnections: validateConnections
};