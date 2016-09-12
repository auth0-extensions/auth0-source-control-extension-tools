const ValidationError = require('auth0-extension-tools').ValidationError;

module.exports.parseJsonFile = function(fileName, contents) {
  try {
    return JSON.parse(contents);
  } catch (e) {
    throw new ValidationError('Error parsing JSON from metadata file: ' + fileName);
  }
};
