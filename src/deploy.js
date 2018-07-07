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

    const auth0 = new Auth0(client, assets, tracking, config);

    // Validate Assets
    await auth0.validate();

    // Process changes
    await auth0.processChanges();

    // TODO: What does this do
    // before refactor
    // appendProgress(storage, progress);

    tracking.log('Done.');

    // TODO: Sort this
    return {
      connections: {
        updated: tracking.connectionsUpdated
      },
      clients: tracking.configurables.clients,
      resourceServers: tracking.configurables.resourceServers,
      rules: {
        created: tracking.rulesCreated,
        updated: tracking.rulesUpdated,
        deleted: tracking.rulesDeleted
      }
    };
  } catch (err) {
    // Log error and persist.
    tracking.error = err;
    tracking.log('Error: ' + err.message);
    tracking.log('StackTrace: ' + err.stack);

    // Final attempt to push to slack.
    pushToSlack(tracking, slackTemplate, config('WT_URL') + '/login', config('SLACK_INCOMING_WEBHOOK_URL'))
      .then(function() {
        appendProgress(storage, tracking);
      })
      .catch(function() {
        appendProgress(storage, tracking);
      });

    // Continue.
    throw err;
  }
}
