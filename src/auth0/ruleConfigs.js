const _ = require('lodash');
const Promise = require('bluebird');
const request = require('superagent');

const constants = require('../constants');
const apiCall = require('./apiCall');

const updateRuleConfig = function(progress, token, domain, key, value) {
  const url = 'https://' + domain + '/api/v2/rules-configs/' + key;
  const data = { value: value };

  return new Promise(function(resolve, reject) {
    request
      .put(url)
      .set('accept', 'json')
      .set('Authorization', `Bearer ${token}`)
      .send(data)
      .end((err, res) => {
        if (err) {
          return reject(err);
        }

        progress.log('Rule Config "' + key + '" updated.');

        return resolve(res && res.body);
      })
  });

};

// Update rule configs
const updateRuleConfigs = function(progress, client, ruleConfigs, domain) {
  const keys = _.keys(ruleConfigs);
  if (keys.length === 0) {
    return Promise.resolve(true);
  }

  progress.log('Updating rule configs...');

  return client.getAccessTokenCached()
    .then(function(token) {
      return Promise.map(
        keys,
        function(key) {
          return apiCall(this, updateRuleConfig, [ progress, token, domain, key, ruleConfigs[key] ]);
        },
        { concurrency: constants.CONCURRENT_CALLS }
      );
    });
};

module.exports = {
  updateRuleConfigs: updateRuleConfigs
};
