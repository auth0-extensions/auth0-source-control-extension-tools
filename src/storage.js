const _ = require('lodash');

/*
 * Append progress to deployments.
 */
module.exports = function(storage, progress) {
  return storage.read()
    .then(function(data) {
      progress.rules = _.map(progress.rules || [], function(rule) {
        // trimming big scripts
        if (rule.script.length > 500) {
          rule.script = rule.script.substr(0, 500) + '...';
        }

        return rule;
      });

      data.deployments = data.deployments || [];
      data.deployments.push(progress);
      if (data.deployments.length > 10) {
        data.deployments = _.drop(data.deployments, data.deployments.length - 10);
      }

      return data;
    })
    .then(function(data) {
      return storage.write(data);
    });
};
