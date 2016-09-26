const _ = require('lodash');
const ValidationError = require('auth0-extension-tools').ValidationError;

const unifyScripts = function(data) {
  const converted = {};
  _.forEach(data, function(item) {
    if (typeof item.metadataFile === 'object') {
      item.metadataFile = JSON.stringify(item.metadataFile);
    }

    if (typeof item.scriptFile === 'object') {
      item.scriptFile = JSON.stringify(item.scriptFile);
    }

    converted[item.name] = item;
  });

  return converted;
};

module.exports.parseJsonFile = function(fileName, contents) {
  try {
    return JSON.parse(contents);
  } catch (e) {
    throw new ValidationError('Error parsing JSON from metadata file: ' + fileName);
  }
};

module.exports.unifyDatabases = function(data) {
  const converted = [];
  _.forEach(data, function(item) {
    const connection = {
      name: item.name,
      scripts: unifyScripts(item.scripts)
    };

    converted.push(connection);
  });

  return converted;
};

module.exports.unifyScripts = unifyScripts;
