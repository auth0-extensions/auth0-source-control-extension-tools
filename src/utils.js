const _ = require('lodash');
const crypto = require('crypto');
const ValidationError = require('auth0-extension-tools').ValidationError;
const ArgumentError = require('auth0-extension-tools').ArgumentError;

const keywordReplace = function(input, mappings) {
  if (mappings && Object.keys(mappings).length > 0) {
    Object.keys(mappings).forEach(function(key) {
      const re = new RegExp('##' + key + '##', 'g');
      input = input.replace(re, mappings[key]);
    });

    Object.keys(mappings).forEach(function(key) {
      const re = new RegExp('@@' + key + '@@', 'g');
      input = input.replace(re, JSON.stringify(mappings[key]));
    });
  }
  return input;
};

const unifyScripts = function(data, mappings) {
  const converted = {};
  _.forEach(data, function(item) {
    _.keys(item)
      .filter(function(key) {
        return key.endsWith('File');
      })
      .forEach(function(key) {
        /* foreach attribute that ends in file, do a keyword replacement, or stringify it */
        if (typeof item[key] === 'object') {
          item[key] = JSON.stringify(item[key]);
        } else if (item[key]) {
          item[key] = keywordReplace(item[key], mappings);
        }
      });

    converted[item.name] = item;
  });

  return converted;
};

const generateChecksum = function(data) {
  if (typeof data !== 'string') {
    throw new ArgumentError('Must provide data as a string.');
  }

  const checksum = crypto.createHash('sha256').update(data).digest('hex');
  return checksum;
};

module.exports.parseJsonFile = function(fileName, contents, mappings) {
  var json = contents;
  try {
    /* if mappings is defined, replace contents before parsing */
    json = keywordReplace(contents, mappings);
    return JSON.parse(json);
  } catch (e) {
    throw new ValidationError('Error parsing JSON from metadata file: ' + fileName + ', because: ' + e.message + ', contents: ' + contents + ', post-replace: ' + json);
  }
};

module.exports.checksumReplacer = function(exclusions) {
  exclusions = exclusions || [];
  if (typeof exclusions === 'string') {
    exclusions = [ exclusions ];
  }

  return function(key, value) {
    if (exclusions.indexOf(key) > -1 && typeof value === 'string') {
      const checksum = generateChecksum(value);
      return checksum;
    }

    return value;
  };
};

module.exports.unifyDatabases = function(data, mappings) {
  const converted = [];
  _.forEach(data, function(item) {
    const connection = {
      name: item.name,
      scripts: unifyScripts(item.scripts, mappings)
    };

    if (item.configurationFile) {
      connection.configuration = module.exports.parseJsonFile(item.configurationFileName,
        item.configurationFile, mappings);
    }

    converted.push(connection);
  });

  return converted;
};

module.exports.unifyScripts = unifyScripts;
