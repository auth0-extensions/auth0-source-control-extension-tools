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

const unifyScripts = function(data, mappings) {
  const converted = {};
  _.forEach(data, function(item) {
    _.keys(item)
      .filter(function(key) { return key.endsWith('File'); })
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
