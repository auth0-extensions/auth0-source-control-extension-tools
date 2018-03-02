const _ = require('lodash');

/*
 * Append progress to deployments.
 */
module.exports = function(storage, progress) {
  function exceedsMaximumBytes(data) {
    const maximumBytes = 490000;

    var innerData = JSON.stringify(data);
    var outterData = {
      etag: 100000000,
      data: innerData
    };

    var dataSize = Buffer.from(JSON.stringify(outterData)).length;

    return dataSize >= maximumBytes;
  }

  // Trimming the history to a maximum of 10 records and 490KB (keeping a 10KB buffer).
  function trimLogs(data) {
    while (exceedsMaximumBytes(data) || data.deployments.length > 10) {
      data.deployments = _.drop(data.deployments, 1);
    }

    return data;
  }

  return storage.read()
    .then(function(data) {
      progress.rules = _.map(progress.rules || [], function(rule) {
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

      data = trimLogs(data);
      return data;
    })
    .then(function(data) {
      return storage.write(data);
    });
};
