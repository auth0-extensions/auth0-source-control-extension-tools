const Promise = require('bluebird');
const request = require('request-promise');


const createPayload = function(progress, template, extensionUrl) {
  template = template || {};

  const msg = {
    username: 'auth0-deployments',
    icon_emoji: ':rocket:',
    attachments: []
  };

  const defaultTemplate = {
    fallback: template.fallback || 'Source-control to Auth0 Deployment',
    text: template.text || 'Source-control to Auth0 Deployment',
    fields: [
      { title: template.repository || 'Repository', value: progress.repository, short: true },
      { title: template.branch || 'Branch', value: progress.branch, short: true },
      { title: template.id || 'ID', value: progress.id, short: true },
      { title: template.sha || 'Commit', value: progress.sha, short: true }
    ],
    error_field: { title: template.error || 'Error', value: (progress.error) ? progress.error.message : null, short: false }
  };

  const details = '(<' + extensionUrl + '|Details>)';

  const fields = defaultTemplate.fields;

  if (progress.error) {
    fields.push(defaultTemplate.error_field);

    msg.attachments.push({
      color: '#F35A00',
      fallback: defaultTemplate.fallback + ' failed: ' + progress.error.message,
      text: defaultTemplate.text + ' failed: ' + details,
      fields: defaultTemplate.fields
    });
  } else {
    if (progress.connectionsUpdated) {
      fields.push({ title: 'Connections Updated', value: progress.connectionsUpdated, short: true });
    }
    if (progress.rulesCreated) {
      fields.push({ title: 'Rules Created', value: progress.rulesCreated, short: true });
    }
    if (progress.rulesUpdated) {
      fields.push({ title: 'Rules Updated', value: progress.rulesUpdated, short: true });
    }
    if (progress.rulesDeleted) {
      fields.push({ title: 'Rules Deleted', value: progress.rulesDeleted, short: true });
    }

    msg.attachments.push({
      color: '#7CD197',
      fallback: defaultTemplate.fallback,
      text: defaultTemplate.fallback + ' ' + details,
      fields: fields
    });
  }

  return msg;
};

module.exports = function(progress, template, extensionUrl, hook) {
  if (!hook) {
    return Promise.resolve();
  }

  progress.log('Sending progress to Slack.');

  const msg = createPayload(progress, template, extensionUrl);
  return request({ uri: hook, method: 'POST', form: { payload: JSON.stringify(msg) } })
    .catch(function(err) {
      progress.log('Sending to Slack error:');
      progress.log(err.message);
    });
};
