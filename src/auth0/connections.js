const _ = require('lodash');
const Promise = require('bluebird');
const ValidationError = require('auth0-extension-tools').ValidationError;

const constants = require('../constants');

/*
 * Get database connections.
 */
const getDatabaseConnections = function(progress, client, databases) {
  if (progress.connections) {
    return Promise.resolve(progress.connections);
  }

  const databaseNames = databases.map(function(database) {
    return database.name;
  });

  return client.connections.getAll({ strategy: 'auth0' })
    .then(function(connections) {
      progress.connections = connections.filter(function(connection) {
        return databaseNames.indexOf(connection.name) > -1;
      });
      return progress.connections;
    });
};

/*
 * Update a database.
 */
const updateDatabase = function(progress, client, connections, database) {
  progress.log('Processing connection ' + database.name);

  const connection = _.find(connections, { name: database.name });
  if (!connection) {
    return Promise.reject(
      new ValidationError('Unable to find connection named: ' + database.name)
    );
  }

  const options = connection.options || {};
  options.customScripts = {};

  // Set all custom scripts
  _.keys(database.scripts).forEach(function(scriptName) {
    if (!database.scripts[scriptName].scriptFile || database.scripts[scriptName].scriptFile.length === 0) {
      throw new ValidationError('The ' + scriptName + ' script for ' + database.name + ' is empty.');
    }
    options.customScripts[scriptName] = database.scripts[scriptName].scriptFile;
  });

  progress.connectionsUpdated++;
  progress.log('Updating database ' + connection.id + ': ' + JSON.stringify(options, null, 2));
  return client.connections.update({ id: connection.id }, { options: options });
};

/*
 * Update all databases.
 */
const updateDatabases = function(progress, client, databases) {
  if (databases.length === 0) {
    return Promise.resolve(true);
  }

  return getDatabaseConnections(progress, client, databases)
    .then(function(connections) {
      return Promise.map(databases,
        function(database) { return updateDatabase(progress, client, connections, database); },
        { concurrency: constants.CONCURRENT_CALLS }
      );
    });
};

/*
 * Validates that all databases included in the repository exist in the tenant.
 */
const validateDatabases = function(progress, client, databases) {
  if (databases.length === 0) {
    return Promise.resolve(true);
  }

  progress.log('Validating that configured databases exist in Auth0...');

  return getDatabaseConnections(progress, client, databases)
    .then(connections => {
      const missingDatabases = _.difference(
        _.map(databases, function(db) { return db.name; }),
        _.map(connections, function(conn) { return conn.name; }));

      if (missingDatabases.length > 0) {
        return Promise.reject(
          new ValidationError('The following databases do not exist in the Auth0 tenant: ' + missingDatabases)
        );
      }

      return true;
    });
};

module.exports = {
  getDatabaseConnections: getDatabaseConnections,
  updateDatabase: updateDatabase,
  updateDatabases: updateDatabases,
  validateDatabases: validateDatabases
};
