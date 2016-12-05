const _ = require('lodash');
const ValidationError = require('auth0-extension-tools').ValidationError;

const keywordReplace = function(input, mappings) {
  if (mappings && Object.keys(mappings).length > 0) {
    Object.keys(mappings).forEach(function(key) {
      const re = new RegExp('@@' + key + '@@', 'g');
      input = input.replace(re, JSON.stringify(mappings[key]));
    });
  }
  return input;
};

const unifyFileMetaPairs = function(data, mainFileAttrName, metaFileAttrName, mappings) {
  const converted = {};
  _.forEach(data, function(item) {
    if (typeof item[metaFileAttrName] === 'object') {
      item[metaFileAttrName] = JSON.stringify(item[metaFileAttrName]);
    }
    /* Meta file should always be JSON and therefore already parsed */

    if (typeof item[mainFileAttrName] === 'object') {
      item[mainFileAttrName] = JSON.stringify(item[mainFileAttrName]);
    } else if (item[mainFileAttrName]) {
      item[mainFileAttrName] = keywordReplace(item[mainFileAttrName], mappings);
    }

    converted[item.name] = item;
  });

  return converted;
};

const unifyConfigs = function(data) {
  /* These are both JSON files that shouldn't need to be re-mapped */
  return unifyFileMetaPairs(data, 'configFile', 'metadataFile');
};

const unifyScripts = function(data, mappings) {
  return unifyFileMetaPairs(data, 'scriptFile', 'metadataFile', mappings);
};

module.exports.parseJsonFile = function(fileName, contents, mappings) {
  try {
    /* if mappings is defined, replace contents before parsing */
    return JSON.parse(keywordReplace(contents, mappings));
  } catch (e) {
    throw new ValidationError('Error parsing JSON from metadata file: ' + fileName + ', because: ' +
     JSON.stringify(e) + ', contents: ' + contents);
  }
};

module.exports.unifyDatabases = function(data, mappings) {
  const converted = [];
  _.forEach(data, function(item) {
    const connection = {
      name: item.name,
      scripts: unifyScripts(item.scripts, mappings)
    };

    converted.push(connection);
  });

  return converted;
};

module.exports.unifyScripts = unifyScripts;
module.exports.unifyConfigs = unifyConfigs;
