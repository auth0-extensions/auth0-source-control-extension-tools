const request = require('superagent');

function createPayload(progress, template, extensionUrl) {
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

  const { fields } = defaultTemplate;

  if (progress.error) {
    fields.push(defaultTemplate.error_field);

    msg.attachments.push({
      color: '#F35A00',
      fallback: defaultTemplate.fallback + ' failed: ' + progress.error.message,
      text: defaultTemplate.text + ' failed: ' + details,
      fields: defaultTemplate.fields
    });
  } else {
    Object.entries(progress.data).forEach(([ type, data ]) => {
      if (data.deleted) {
        fields.push({ title: `${type} Deleted`, value: data.deleted, short: true });
      }
      if (data.created) {
        fields.push({ title: `${type} Created`, value: data.created, short: true });
      }
      if (data.updated) {
        fields.push({ title: `${type} Updated`, value: data.updated, short: true });
      }
    });

    msg.attachments.push({
      color: '#7CD197',
      fallback: defaultTemplate.fallback,
      text: defaultTemplate.fallback + ' ' + details,
      fields: fields
    });
  }

  return msg;
}

export default async function(progress, template, extensionUrl, hook) {
  progress.log('Sending progress to Slack.');

  const msg = createPayload(progress, template, extensionUrl);
  try {
    await request.post(hook).send(msg).set('Accept', 'application/json');
  } catch (err) {
    progress.log(`Error sending to Slack: ${err}`);
  }
}
