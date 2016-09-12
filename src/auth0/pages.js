const _ = require('lodash');
const Promise = require('bluebird');

const utils = require('../utils');
const constants = require('../constants');

const pages = module.exports = { };

/*
 * Get global client.
 */
pages.getGlobalClientId = function(progress, auth0) {
  if (progress.globalClientId) {
    return Promise.resolve(progress.globalClientId);
  }

  return Promise.all(auth0.clients.getAll())
    .then(function(apps) {
      const globalClient = _.find(apps, { global: true });
      progress.globalClientId = globalClient.client_id;
      return progress.globalClientId;
    });
};

/*
 * Get the page by its name.
 *
 */
pages.getPage = function(files, pageName) {
  const file = files[pageName];
  if (!file) {
    return null;
  }

  const page = {
    html: file.htmlFile,
    enabled: true
  };

  if (file.metadata) {
    const metadata = utils.parseJsonFile(pageName, file.metadataFile);
    page.enabled = metadata.enabled;
  }

  return page;
};

/*
 * Update the password reset page.
 */
pages.updatePasswordResetPage = function(progress, client, files) {
  const page = pages.getPage(files, constants.PAGE_PASSWORD_RESET);
  if (!page) {
    return Promise.resolve(true);
  }

  progress.log('Updating change password page...');
  return client.updateTenantSettings({
    change_password: page
  });
};

/*
 * Update the guardian mfa page.
 */
pages.updateGuardianMultifactorPage = function(progress, client, files) {
  const page = pages.getPage(files, constants.PAGE_GUARDIAN_MULTIFACTOR);
  if (!page) {
    return Promise.resolve(true);
  }

  progress.log('Updating guardian multifactor page...');
  return client.updateTenantSettings({
    guardian_mfa_page: page
  });
};

/*
 * Update the custom login page.
 */
pages.updateLoginPage = function(progress, auth0, files) {
  const page = pages.getPage(files, constants.PAGE_LOGIN);
  if (!page) {
    return Promise.resolve(true);
  }

  progress.log('Updating login page...');
  return pages.getGlobalClientId(progress, auth0).then(
    function(clientId) {
      return auth0.clients.update({ client_id: clientId }, {
        custom_login_page: page.html,
        custom_login_page_on: page.enabled
      });
    }
  );
};
