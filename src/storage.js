const _ = require('lodash');

/*
 * Append progress to deployments.
 */
module.exports = function(storage, progress) {
  // Trimming the history to a maximum of 10 records and 490KB (keeping a 10KB buffer).
  function trimLogs(data) {
    var dataSize = JSON.stringify(data).length;
    while (dataSize >= 490000 || data.deployments.length > 10) {
      data.deployments = _.drop(data.deployments, data.deployments.length - 10);
      dataSize = JSON.stringify(data).length;
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
