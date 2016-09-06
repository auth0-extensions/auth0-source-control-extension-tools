const config = require('auth0-extension-tools').config();
const logger = require('./logger');
const auth0 = require('./auth0');
const pushToSlack = require('./slack');
const appendProgress = require('./storage');


const trackProgress = (progressData) => {
  const logs = [];
  const log = (message) => {
    logs.push({ date: new Date(), message });
    logger.debug(message);
  };

  return {
    id: progressData.id,
    user: progressData.user,
    sha: progressData.sha,
    branch: progressData.branch,
    repository: progressData.repository,
    date: new Date(),
    connectionsUpdated: 0,
    rulesCreated: 0,
    rulesUpdated: 0,
    rulesDeleted: 0,
    error: null,
    logs,
    log
  };
};

module.exports = (progressData, context, client, storage) => {
  const progress = trackProgress(progressData);

  progress.log(`Assets: ${JSON.stringify({ rules: context.rules, pages: context.pages, databases: context.databases }, null, 2)}`);
  progress.log(`Getting access token for ${config('AUTH0_CLIENT_ID')}/${config('AUTH0_DOMAIN')}`);

  // Send all changes to Auth0.
  storage.read()
    .then(data => {
      context.excluded_rules = data.excluded_rules || [];
    })
    .then(() => auth0.updatePasswordResetPage(progress, client, context.pages))
    .then(() => auth0.updateLoginPage(progress, client, context.pages))
    .then(() => auth0.validateDatabases(progress, client, context.databases))
    .then(() => auth0.validateRules(progress, client, context.rules, context.excluded_rules))
    .then(() => auth0.updateDatabases(progress, client, context.databases))
    .then(() => auth0.deleteRules(progress, client, context.rules, context.excluded_rules))
    .then(() => auth0.updateRules(progress, client, context.rules))
    .then(() => progress.log('Done.'))
    .then(() => appendProgress(storage, progress))
    .then(() => pushToSlack(progress, `${config('WT_URL')}/login`))
    .then(() => ({
      connections: {
        updated: progress.connectionsUpdated
      },
      rules: {
        created: progress.rulesCreated,
        updated: progress.rulesUpdated,
        deleted: progress.rulesDeleted
      }
    }))
    .catch(err => {
      // Log error and persist.
      progress.error = err;
      progress.log(`Error: ${err.message}`);
      progress.log(`StackTrace: ${err.stack}`);
      appendProgress(storage, progress);

      // Final attempt to push to slack.
      pushToSlack(progress, `${config('WT_URL')}/login`);

      // Continue.
      throw err;
    });
};
