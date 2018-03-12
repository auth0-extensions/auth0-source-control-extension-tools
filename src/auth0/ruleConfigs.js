const _ = require('lodash');
const Promise = require('bluebird');
const request = require('superagent');
const managementApi = require('auth0-extension-tools').managementApi;

const constants = require('../constants');
const apiCall = require('./apiCall');

const updateRuleConfig = function(progress, token, domain, ruleConfig) {
  const data = { value: ruleConfig.configFile };
  const key = ruleConfig.name;
  const url = 'https://' + domain + '/api/v2/rules-configs/' + key;

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
const updateRuleConfigs = function(progress, ruleConfigs, config) {
  const keys = _.keys(ruleConfigs);
  if (keys.length === 0) {
    return Promise.resolve(true);
  }

  progress.log('Updating rule configs...');

  return managementApi.getAccessTokenCached(config('AUTH0_DOMAIN'), config('AUTH0_CLIENT_ID'), config('AUTH0_CLIENT_SECRET'))
    .then(function(token) {
      return Promise.map(
        keys,
        function(key) {
          return apiCall(this, updateRuleConfig, [ progress, token, config('AUTH0_DOMAIN'), ruleConfigs[key] ]);
        },
        { concurrency: constants.CONCURRENT_CALLS }
      );
    });
};

module.exports = {
  updateRuleConfigs: updateRuleConfigs
};
