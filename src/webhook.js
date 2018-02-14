const Promise = require('bluebird');
const request = require('superagent');

const createPayload = function(data) {
  // we may want to trim/remap/whatever data before sending
  return data;
};

module.exports = function(progress, hook) {
  if (!hook) {
    return Promise.resolve();
  }

  progress.log('Sending progress to ' + hook);

  const msg = createPayload(progress);
  return new Promise(function(resolve) {
    request
      .post(hook)
      .send(msg)
      .set('Accept', 'application/json')
      .end(function(err, res) {
        if (err && err.status === 401) {
          progress.log('Error sending to ' + hook + ': ' + err.status);
        } else if (err && res && res.body) {
          progress.log('Error sending to ' + hook + ': ' + err.status + ' - ' + res.body);
        } else if (err) {
          progress.log('Error sending to ' + hook + ': ' + err.status + ' - ' + err.message);
        }

        return resolve();
      });
  });
};
