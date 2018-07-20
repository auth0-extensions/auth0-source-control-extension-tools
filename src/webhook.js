const request = require('superagent');

const createPayload = function(data) {
  // we may want to trim/remap/whatever data before sending
  return data;
};

export default async function(progress, hook) {
  progress.log('Sending progress to ' + hook);
  const msg = createPayload(progress);
  await request
    .post(hook)
    .send(msg)
    .set('Accept', 'application/json')
    .end((err, res) => {
      if (err && err.status === 401) {
        progress.log('Error sending to ' + hook + ': ' + err.status);
      } else if (err && res && res.body) {
        progress.log('Error sending to ' + hook + ': ' + err.status + ' - ' + res.body);
      } else if (err) {
        progress.log('Error sending to ' + hook + ': ' + err.status + ' - ' + err.message);
      }
    });
}
