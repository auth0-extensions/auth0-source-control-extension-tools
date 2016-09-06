const Promise = require('bluebird');


/*
 * Get current client id.
 */
const getClient = (progress, client) => {
  if (progress.client_id) return Promise.resolve(progress.client_id);

  return Promise.all(client.clients.getAll())
    .then(apps => {
      apps.map(app => {
        if (app.global === true) {
          progress.client_id = app.client_id;
        }

        return app;
      });

      return progress.client_id;
    });
};

/**
 * get current html template is enabled
 * @param currentFile
 * @param files
 * @returns {boolean}
 */
const getIsEnabled = (currentFile, files) => {
  let isEnabled = true;

  files.map(file => {
    if (file.name === currentFile.meta) {
      isEnabled = (typeof file.contents === 'object') ? file.contents.enabled : JSON.parse(file.contents).enabled;
    }

    return file;
  });

  return isEnabled;
};

module.exports.updatePasswordResetPage = (progress, client, data) => {
  const payload = {};

  data.map(file => {
    if (file.name === 'password_reset.html') {
      payload.change_password = {
        enabled: getIsEnabled(file, data),
        html: file.contents
      };
    }

    return file;
  });

  if (payload.change_password) {
    progress.log('Updating change password page...');

    return getClient(progress, client).then((clientId) => {
      client.tenant.tenant.patch({ client_id: clientId }, payload);
    });
  }

  return Promise.resolve(true);
};

module.exports.updateLoginPage = (progress, client, data) => {
  const payload = {};

  data.map(file => {
    if (file.name === 'login.html') {
      payload.custom_login_page = file.contents;
      payload.custom_login_page_on = getIsEnabled(file, data);
    }

    return file;
  });

  if (payload.custom_login_page) {
    progress.log('Updating login page...');

    return getClient(progress, client).then((clientId) => {
      client.clients.update({ client_id: clientId }, payload);
    });
  }

  return Promise.resolve(true);
};
