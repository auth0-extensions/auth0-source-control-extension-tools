const _ = require('lodash');
const ValidationError = require('auth0-extension-tools').ValidationError;

const unifyFileMetaPairs = function(data, mainFileAttrName, metaFileAttrName) {
  const converted = {};
  _.forEach(data, function(item) {
    if (typeof item[metaFileAttrName] === 'object') {
      item[metaFileAttrName] = JSON.stringify(item[metaFileAttrName]);
    }

    if (typeof item[mainFileAttrName] === 'object') {
      item[mainFileAttrName] = JSON.stringify(item[mainFileAttrName]);
    }

    converted[item.name] = item;
  });

  return converted;
};

const unifyConfigs = function(data) {
  return unifyFileMetaPairs(data, 'configFile', 'metadataFile');
};

const unifyScripts = function(data) {
  return unifyFileMetaPairs(data, 'scriptFile', 'metadataFile');
};

module.exports.parseJsonFile = function(fileName, contents) {
  try {
    return JSON.parse(contents);
  } catch (e) {
    throw new ValidationError('Error parsing JSON from metadata file: ' + fileName + ', because: ' +
     JSON.stringify(e) + ', contents: ' + contents);
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
module.exports.unifyConfigs = unifyConfigs;
