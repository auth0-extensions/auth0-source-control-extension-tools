const _ = require('lodash');

/*
 * Append progress to deployments.
 */
module.exports = function(storage, progress) {
  // Trimming the history to a maximum of 10 records and 490KB (keeping a 10KB buffer).
  function trimLogs(data) {
    const maximumBytes = 490000;
    var dataSize = Buffer.from(JSON.stringify(data)).length;

    while (dataSize >= maximumBytes || data.deployments.length > 10) {
      data.deployments = _.drop(data.deployments, 1);
      dataSize = Buffer.from(JSON.stringify(data)).byteLength;
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
      data.deployments.push(progress);

      data = trimLogs(data);
      return data;
    })
    .then(function(data) {
      return storage.write(data);
    });
};
