const Promise = require('bluebird');
const request = require('request-promise');


const createPayload = function(progress, template, extensionUrl) {
  const msg = {
    username: 'auth0-deployments',
    icon_emoji: ':rocket:',
    attachments: []
  };

  const defaultTemplate = {
    fallback: 'Source-control to Auth0 Deployment ',
    text: 'Source-control to Auth0 Deployment ',
    fields: [
      { title: 'Repository', value: progress.repository, short: true },
      { title: 'Branch', value: progress.branch, short: true },
      { title: 'ID', value: progress.id, short: true },
      { title: 'Commit', value: progress.sha, short: true }
    ],
    error_field: { title: 'Error', value: (progress.error) ? progress.error.message : null, short: false }
  };

  template = template || {};

  const details = `(<${extensionUrl}|Details>)`;

  const fields = template.fields || defaultTemplate.fields;

  if (progress.error) {
    fields.push(template.error_field || defaultTemplate.error_field);

    msg.attachments.push({
      color: '#F35A00',
      fallback: `${template.fallback || defaultTemplate.fallback} failed: ${progress.error.message}`,
      text: `${template.text || defaultTemplate.text} failed ${details}`,
      fields: template.fields || defaultTemplate.fields
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
      fallback: template.fallback || defaultTemplate.fallback,
      text: `${template.fallback || defaultTemplate.fallback} ${details}`,
      fields
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
  return request({ uri: hook, method: 'POST', form: { payload: JSON.stringify(msg) } });
};
