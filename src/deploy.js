const logger = require('./logger');
const auth0 = require('./auth0');
const pushToSlack = require('./slack');
const appendProgress = require('./storage');

const trackProgress = function(progressData) {
  const logs = [];
  const log = function(message) {
    logs.push({ date: new Date(), message: message });
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
    logs: logs,
    log: log
  };
};

module.exports = function(progressData, context, client, storage, config, slackTemplate) {
  const progress = trackProgress(progressData);
  progress.log('Getting access token for ' + config('AUTH0_CLIENT_ID') + '/' + config('AUTH0_DOMAIN'));

  // Send all changes to Auth0.
  return context.init()
    .then(function() {
      var assets = JSON.stringify({
        rules: context.rules,
        pages: context.pages,
        databases: context.databases
      });
      progress.log('Assets: ' + assets, null, 2);
    })
    .then(function() {
      return storage.read();
    })
    .then(function(data) {
      context.excluded_rules = data.excluded_rules || [];
    })
    .then(function() {
      return auth0.updatePages(progress, client, context.pages);
    })
    .then(function() {
      return auth0.validateDatabases(progress, client, context.databases);
    })
    .then(function() {
      return auth0.validateRules(progress, client, context.rules, context.excluded_rules);
    })
    .then(function() {
      return auth0.updateDatabases(progress, client, context.databases);
    })
    .then(function() {
      return auth0.deleteRules(progress, client, context.rules, context.excluded_rules);
    })
    .then(function() {
      return auth0.updateRules(progress, client, context.rules, context.excluded_rules);
    })
    .then(function() {
      return progress.log('Done.');
    })
    .then(function() {
      return pushToSlack(progress, slackTemplate, config('WT_URL') + '/login', config('SLACK_INCOMING_WEBHOOK_URL'));
    })
    .then(function() {
      return appendProgress(storage, progress);
    })
    .then(function() {
      return {
        connections: {
          updated: progress.connectionsUpdated
        },
        rules: {
          created: progress.rulesCreated,
          updated: progress.rulesUpdated,
          deleted: progress.rulesDeleted
        }
      };
    })
    .catch(function(err) {
      // Log error and persist.
      progress.error = err;
      progress.log('Error: ' + err.message);
      progress.log('StackTrace: ' + err.stack);

      // Final attempt to push to slack.
      pushToSlack(progress, slackTemplate, config('WT_URL') + '/login', config('SLACK_INCOMING_WEBHOOK_URL'))
        .then(function() {
          appendProgress(storage, progress);
        })
        .catch(function() {
          appendProgress(storage, progress);
        });

      // Continue.
      throw err;
    });
};
