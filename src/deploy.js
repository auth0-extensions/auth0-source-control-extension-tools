import Auth0 from './auth0';
import pushToSlack from './slack';
import sendWebhook from './webhook';
import appendProgress from './storage';
import progress from './progress';

export default async function deploy(progressData, context, client, storage, config, slackTemplate) {
  const tracking = progress(progressData);
  tracking.mappings = config('AUTH0_KEYWORD_REPLACE_MAPPINGS');
  tracking.log('Getting access token for ' + config('AUTH0_CLIENT_ID') + '/' + config('AUTH0_DOMAIN'));

  // Send all changes to Auth0.
  try {
    await context.init(tracking);

    const data = await storage.read();

    const assets = {
      ...context.assets,
      excluded_rules: data.excluded_rules || []
    };

    // Todo: do we need to do this?
    tracking.log('Assets: ' + assets, null, 2);

    const auth0 = new Auth0(client, assets, tracking, config);

    // Validate Assets
    await auth0.validate();

    // Process changes
    await auth0.processChanges();
    tracking.log('Done.');

    tracking.data = auth0.handlers.reduce((accum, h) => {
      accum[h.type] = {
        deleted: h.deleted,
        created: h.created,
        updated: h.updated
      };
      return accum;
    }, {});

    // Send message to slack
    if (config('SLACK_INCOMING_WEBHOOK_URL')) {
      await pushToSlack(tracking, slackTemplate, `${config('WT_URL')}/login`, config('SLACK_INCOMING_WEBHOOK_URL'));
    }

    // Call custom Webhook URL
    if (config('CUSTOM_WEBHOOK_URL')) {
      await sendWebhook(tracking, config('CUSTOM_WEBHOOK_URL'));
    }

    // Append progress to storage
    // await appendProgress(data, storage, tracking);

    return tracking.data;
  } catch (err) {
    // Log error and persist.
    tracking.error = err;
    tracking.log('Error: ' + err.message);
    tracking.log('StackTrace: ' + err.stack);

    // Final attempt to push to slack.
    if (config('SLACK_INCOMING_WEBHOOK_URL')) {
      await pushToSlack(tracking, slackTemplate, config('WT_URL') + '/login', config('SLACK_INCOMING_WEBHOOK_URL'));
    }

    await appendProgress(storage, tracking);

    // Continue.
    throw err;
  }
}
