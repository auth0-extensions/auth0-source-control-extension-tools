const _ = require('lodash');

/*
 * Append progress to deployments.
 */
module.exports = (storage, progress) =>
  storage.read()
    .then(data => {
      data.deployments = data.deployments || [];
      data.deployments.push(progress);
      if (data.deployments.length > 10) {
        data.deployments = _.drop(data.deployments, data.deployments.length - 10);
      }
      return data;
    })
    .then(data => storage.write(data));
