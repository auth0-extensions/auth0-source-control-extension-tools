/*
 * Append progress to deployments.
 */

export default async function(storage, progress) {
  const exceedsMaximumBytes = (data) => {
    const maximumBytes = 490000;
    const innerData = JSON.stringify(data);
    const outterData = {
      etag: 100000000,
      data: innerData
    };

    const dataSize = Buffer.from(JSON.stringify(outterData)).length;

    return dataSize >= maximumBytes;
  };

  // Trimming the history to a maximum of 10 records and 490KB (keeping a 10KB buffer).
  const trimLogs = (data) => {
    while (exceedsMaximumBytes(data) || data.deployments.length > 10) {
      data.deployments = _.drop(data.deployments, 1);
    }
    return data;
  };

  let data = await storage.read();

  progress.rules = progress.rules.map((rule) => {
    // trimming big scripts
    if (rule.script.length > 500) {
      rule.script = rule.script.substr(0, 500) + '...';
    }
    return rule;
  });

  // Adding new historical record for latest deployment.
  data.deployments = data.deployments || [];
  if (exceedsMaximumBytes(progress)) {
    progress = {
      id: progress.id,
      user: progress.user,
      branch: progress.branch,
      repository: progress.repository,
      date: progress.date,
      connectionsUpdated: progress.connectionsUpdated,
      rulesCreated: progress.rulesCreated,
      rulesUpdated: progress.rulesUpdated,
      rulesDeleted: progress.rulesDeleted,
      error: progress.error,
      sha: progress.sha,
      logs: [ {
        date: '2018-02-23T19:45:01.965Z',
        message: 'This log entry has exceeded the maximum allowed size and data has been redacted to reduce the total size.'
      } ]
    };
  }

  data.deployments.push(progress);
  data = await trimLogs(data);
  return storage.write(data);
}
