const Promise = require('bluebird');

const utils = require('../utils');
const constants = require('../constants');
const apiCall = require('./apiCall');

/**
 * Get an email provider object from the files object.
 * Currently always gets the one named 'default', as there can only be
 * a single email provider.
 */
const getEmailProviderObject = function(files, mappings) {
  const file = files[constants.EMAIL_PROVIDER_NAME];
  if (!file) {
    return null;
  }

  return utils.parseJsonFile(file.name, file.configFile, mappings);
};

const updateEmailProvider = function(progress, client, files) {
  const payload = getEmailProviderObject(files, progress.mappings);
  if (!payload) {
    return Promise.resolve(true);
  }

  progress.log('Updating email provider...');
  return apiCall(client, client.emailProvider.update, [ {}, payload ]).then(() => true);
};

module.exports = {
  getEmailProviderObject: getEmailProviderObject,
  updateEmailProvider: updateEmailProvider
};
