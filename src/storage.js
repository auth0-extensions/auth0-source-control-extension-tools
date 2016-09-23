const _ = require('lodash');

/*
 * Append progress to deployments.
 */
module.exports = function(storage, progress) {
  return storage.read()
    .then(function(data) {
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
