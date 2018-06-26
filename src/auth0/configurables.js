const _ = require('lodash');
const Promise = require('bluebird');
const ValidationError = require('auth0-extension-tools').ValidationError;

const utils = require('../utils');
const apiCall = require('./apiCall');

/**
 * Process the metadata
 * @param progress the state object
 * @param client the management api client
 * @param metaDataFunction the function to use for processing the metadata, if undefined will skip processing
 * @param unit The existing unit.  Metadata is processed against an existing unit
 * @param config The configuration that contains the metadata, if no metadata is defined, the method will be called with undefined metadata
 */
const processMetaData = function(progress, client, metaDataFunction, unit, unitConfig) {
  /* Make sure we have a function to call */
  if (metaDataFunction) {
    if (unitConfig.metadataFile) {
      /* Process the metadata if there is some defined */
      const metaBody = utils.parseJsonFile(unit.name, unitConfig.metadataFile, progress.mappings);
      return metaDataFunction(progress, client, unit, metaBody);
    }

    /* No metadata defined, call with undefined metadata */
    return metaDataFunction(progress, client, unit);
  }

  /* No meta data, so just return false and the existing unit */
  return Promise.resolve(false);
};

/**
 * Update the existing unit
 * @param type The type of unit
 * @param progress the state object
 * @param client the management api client
 * @param unitName the name of this particular unit
 * @param unitConfig the configuration for this particular unit
 * @param existingUnit the existing unit that was in the DB
 * @param metaDataFunction a function that can process the metadata if provided
 * @returns {*}
 */
const updateExistingUnit = function(type, progress, client, unitName, unitConfig, existingUnit, metaDataFunction) {
  /* Get entire config */
  const unitBody = utils.parseJsonFile(unitName, unitConfig.configFile, progress.mappings);
  unitBody.name = unitName;

  /* Filter out things that haven't changed */
  const changedConfigKeys = _(unitBody)
    .keys()
    .filter(function(key) {
      return JSON.stringify(unitBody[key]) !== JSON.stringify(existingUnit[key]);
    })
    .value();

  if (changedConfigKeys.length > 0) {
    /* Make a new object with just the changed attributes */
    const changedConfig = _.zipObject(changedConfigKeys, _.map(changedConfigKeys, function(key) { return unitBody[key]; }));
    progress.configurables[type].updated += 1;
    progress.log('Updating ' + type + ' ' + unitName + ': ' + JSON.stringify(changedConfig));
    const params = {};
    params[progress.configurables[type].idName] = existingUnit[progress.configurables[type].idName];
    return apiCall(client, client[type].update, [ params, changedConfig ])
      .then(function(unit) {
        return processMetaData(progress, client, metaDataFunction, unit, unitConfig)
          .then(function(changed) {
            if (changed) {
              progress.log('Updated metadata for ' + type + ', ' + unitName);
            }
            return Promise.resolve(unit);
          });
      });
  }


  /* Configuration did not change, try to process the metadata */
  return processMetaData(progress, client, metaDataFunction, existingUnit, unitConfig)
    .then(function(changed) {
      if (changed) {
        progress.log('Updated just the metadata for ' + type + ', ' + unitName);
        progress.configurables[type].updated += 1;
      } else {
        progress.log('Skipping update of ' + type + ' ' + unitName + ', because no changes were found.');
      }
      return Promise.resolve(existingUnit);
    });
};


/**
 * Update existing clients
 * @param progress the progress object
 * @client the Auth0 client for the management API
 * @return Promise for updating the existing clients
 */
const updateExistingUnits = function(type, progress, client, metaDataFunction) {
  // Check if there is anything to do here
  if (type in progress.configurables &&
    progress.configurables[type].updates &&
    Object.keys(progress.configurables[type].updates).length > 0) {
    progress.log('Updating ' + type + '...');

    /* First process clients we need to add */
    return Promise.map(Object.keys(progress.configurables[type].updates),
      function(unitName) {
        return updateExistingUnit(
          type,
          progress,
          client,
          unitName,
          progress.configurables[type].updates[unitName].config,
          progress.configurables[type].updates[unitName].existing,
          metaDataFunction
        );
      }
    );
  }

  // No updateClients, so must not be any work here, just resolve happily
  return Promise.resolve();
};

/**
 * Create an individual unit
 * @param progress state object
 * @param client ManagementClient
 * @param unitName The name of the unit to create
 * @param unitConfig The JSON configuration of the unit
 * @returns {unitConfig} The created unit
 */
const createUnit = function(type, progress, client, unitName, unitConfig, metaDataFunction) {
  /* process unit */
  const unitBody = utils.parseJsonFile(unitName, unitConfig.configFile, progress.mappings);
  unitBody.name = unitName;
  progress.configurables[type].created += 1;
  progress.log('Creating ' + type + ' ' + unitName + ': ' + JSON.stringify(unitBody));
  return client[type].create(unitBody)
    .then(function(unit) {
      return processMetaData(progress, client, metaDataFunction, unit, unitConfig)
        .then(function(changed) {
          if (changed) {
            progress.log('Processed metadata for ' + type + ', ' + unitName);
          }

          Promise.resolve(unit);
        });
    });
};

/**
 * Create new units
 * @param progress the progress object
 * @client the Auth0 client for the management API
 * @return Promise for creating new units
 */
const createUnits = function(type, progress, client, metaDataFunction) {
  // Check if there is anything to do here
  if (type in progress.configurables &&
    progress.configurables[type].adds &&
    Object.keys(progress.configurables[type].adds).length > 0) {
    progress.log('Creating ' + type + '...');

    /* First process units we need to add */
    return Promise.map(Object.keys(progress.configurables[type].adds),
      function(unitName) {
        return createUnit(type, progress, client, unitName, progress.configurables[type].adds[unitName], metaDataFunction);
      }
    );
  }

  // No units to add, so must not be any work here, just resolve happily
  return Promise.resolve();
};

/**
 * Update units
 * @param type the type of object we are updating
 * @param progress the progress object
 * @param client the Auth0 client for the management API
 * @param metaDataFunction function to call when processing metaData, it must return a promise and takes a metaData object
 * @return Promise for creating new and updating existing units
 */
const update = function(type, progress, client, metaDataFunction) {
  return createUnits(type, progress, client, metaDataFunction)
    .then(function() {
      return updateExistingUnits(type, progress, client, metaDataFunction);
    });
};

/**
 * Split the units into buckets for adding, updating, and deleting
 */
const splitUnits = function(type, progress, units, existingUnits, excludedUnits) {
  /* Here split into different containers for type of unit action */
  const unitNames = _(units).keys();
  const existingUnitNames = _.map(existingUnits, 'name');
  const excludedUnitIds = _.map(excludedUnits, progress.configurables[type].idName);
  const existingNameToId = _.zipObject(existingUnitNames, _.map(existingUnits, function(unit) {
    return unit[progress.configurables[type].idName];
  }));

  // Now grab the different buckets of names
  const toAddUnitNames = _(unitNames).filter(function(name) {
    return existingUnitNames.indexOf(name) < 0;
  }).value();
  const toDeleteUnitNames = _(existingUnitNames).filter(function(name) {
    /* Find the name and make sure it wasn't in the excluded list */
    return unitNames.indexOf(name) < 0 && (!excludedUnitIds || excludedUnitIds.indexOf(existingNameToId[name]));
  }).value();
  const toUpdateUnitNames = _(unitNames).filter(function(name) {
    return existingUnitNames.indexOf(name) >= 0;
  }).value();

  progress.log('Adding ' + toAddUnitNames.length + ' ' + type + ' and Updating ' + toUpdateUnitNames.length + ' ' +
    type + '. If implemented would be Deleting ' + toDeleteUnitNames.length + ' ' + type + '.');

  /*
  Create set of units that we need to add with the config information
   */
  progress.configurables[type].adds = _.zipObject(toAddUnitNames,
    _.map(toAddUnitNames, function(name) {
      return units[name];
    }));

  /*
  Just need the list of names we need to delete
   */
  progress.configurables[type].deletes = toDeleteUnitNames;

  /*
  Need both the config and existing information for units we need to update
   */
  progress.configurables[type].updates = _.zipObject(toUpdateUnitNames,
    _.map(toUpdateUnitNames, function(name) {
      return {
        existing: _.find(existingUnits, [ 'name', name ]),
        config: units[name]
      };
    }));

  return existingUnits;
};

/**
 * make sure we have configFile defined for everything
 * @param units the list of units to add or update
 * @param existingUnits the list of units that already have been added
 * @returns {Promise.<*>}
 */
const validateUnitsExistence = function(type, progress, units, existingUnits) {
  var existingUnitsFiltered = existingUnits;

  /* Check that the units are formed well */
  const invalidUnits = _(units)
    .keys()
    .filter(function(unitName) {
      return !units[unitName].configFile;
    })
    .value();

  if (invalidUnits.length) {
    return Promise.reject(
      new ValidationError('The following ' + type + ' have no config file: ' + invalidUnits.join())
    );
  }

  /* Also make sure unit name either matches or is not in the script */
  const invalidNames = _(units)
    .keys()
    .filter(function(unitName) {
      /* Parse configFile */
      const config = utils.parseJsonFile(unitName, units[unitName].configFile, progress.mappings);
      return config.name && config.name !== unitName;
    })
    .value();

  if (invalidNames.length) {
    return Promise.reject(
      new ValidationError('The following ' + type + ' have key names that do not match the configured name in the configFile: ' + invalidNames.join())
    );
  }

  if (existingUnits && existingUnits.length > 0 && !(progress.configurables[type].idName in existingUnits[0])) {
    return Promise.reject(
      new ValidationError('Attempted to use ' + progress.configurables[type].idName + ' for idName for ' + type + ' but did not find that attribute in the existing ' + type + '.')
    );
  }

  return Promise.resolve(existingUnitsFiltered);
};

/*
 * Validate units before touching anything.
 *
 * Failure States => Ensure names match and configFile is defined
 *
 * Side-effects => progress should include the set of units that already exist with this name
 *              => progress should include the set of units that need to be created
 *
 */
const validate = function(type, progress, client, units, existingUnits, excludedUnits, idName) {
  const unitNames = _.keys(units);
  if (unitNames.length === 0) {
    return Promise.resolve(true);
  }

  progress.log('Validating ' + type + '...');

  progress.configurables[type].idName = idName || 'id';

  return validateUnitsExistence(type, progress, units, existingUnits)
    .then(function(existingUnitsFiltered) {
      return splitUnits(type, progress, units, existingUnitsFiltered, excludedUnits);
    });
};

module.exports = {
  update: update,
  validate: validate
};
