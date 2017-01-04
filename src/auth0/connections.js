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
  var allowedScripts = null;
  progress.log('Processing connection ' + database.name);

  const connection = _.find(connections, { name: database.name });
  if (!connection) {
    return Promise.reject(
      new ValidationError('Unable to find connection named: ' + database.name)
    );
  }

  const options = connection.options || {};
  options.customScripts = {};

  const databaseScriptKeys = Object.keys(database.scripts);

  allowedScripts = (options.import_mode) ? constants.DATABASE_SCRIPTS_IMPORT : constants.DATABASE_SCRIPTS_NO_IMPORT;
  /* Check if change_email is included and if it is, allow get_users for non-import */
  if (!options.import_mode) {
    if (databaseScriptKeys.indexOf(constants.DATABASE_SCRIPTS_CHANGE_EMAIL) >= 0) {
      if (databaseScriptKeys.indexOf(constants.DATABASE_SCRIPTS_GET_USER) >= 0) {
        allowedScripts = constants.DATABASE_SCRIPTS;
      } else {
        throw new ValidationError('The ' + constants.DATABASE_SCRIPTS_CHANGE_EMAIL + ' script requires the ' + constants.DATABASE_SCRIPTS_GET_USER + ' script for ' + database.name + '.');
      }
    }
  }
  progress.log('Import User to Auth0 enabled: ' + options.import_mode + '. Allowed scripts: ' + JSON.stringify(allowedScripts, null, 2));

  // Set all custom scripts
  _(databaseScriptKeys).forEach(function(scriptName) {
    if (allowedScripts.indexOf(scriptName) < 0) {
      throw new ValidationError('The ' + scriptName + ' script is not allowed for ' + database.name + '.');
    }

    if (!database.scripts[scriptName].scriptFile || database.scripts[scriptName].scriptFile.length === 0) {
      throw new ValidationError('The ' + scriptName + ' script for ' + database.name + ' is empty.');
    }

    options.customScripts[scriptName] = database.scripts[scriptName].scriptFile;
  });

  progress.connectionsUpdated += 1;
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
    .then(function(connections) {
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
