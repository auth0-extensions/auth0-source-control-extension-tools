const _ = require('lodash');
const Promise = require('bluebird');
const ValidationError = require('auth0-extension-tools').ValidationError;

const utils = require('../utils');
const constants = require('../constants');

const mapToName = function(rule) {
  return rule.name;
};

/*
 * Get all rules in all stages.
 */
const getRules = function(progress, client) {
  if (progress.rules) {
    return Promise.resolve(progress.rules);
  }

  return Promise.all(constants.RULES_STAGES.map(function(stage) {
    return client.rules.getAll({ stage: stage });
  }))
    .then(function(allRules) {
      progress.rules = _.chain(allRules)
        .flattenDeep()
        .union()
        .value();
      return progress.rules;
    });
};

/*
 * Delete a rule.
 */
const deleteRule = function(progress, client, rules, existingRule, excluded) {
  const ruleExists = _.keys(rules).indexOf(existingRule.name) > -1;
  if (ruleExists) {
    return Promise.resolve(true);
  }

  const isExcluded = excluded.indexOf(existingRule.name) >= 0;
  if (isExcluded) {
    progress.log('Skipping delete for manual rule: ' + existingRule.name + ' (' + existingRule.id + ')');
    return Promise.resolve(true);
  }

  progress.rulesDeleted += 1;
  progress.log('Deleting rule ' + existingRule.name + ' (' + existingRule.id + ')');
  return client.rules.delete({ id: existingRule.id });
};

/*
 * Delete all rules.
 */
const deleteRules = function(progress, client, rules, excluded) {
  progress.log('Deleting rules that no longer exist in the repository...');

  return getRules(progress, client)
    .then(function(existingRules) {
      progress.log(
        'Existing rules: ' + JSON.stringify(existingRules.map(
          function(rule) {
            return { id: rule.id, name: rule.name, stage: rule.stage, order: rule.order };
          }), null, 2));

      return Promise.map(
        existingRules,
        function(rule) {
          return deleteRule(progress, client, rules, rule, excluded);
        },
        { concurrency: constants.CONCURRENT_CALLS });
    });
};

/*
 * Update a single rule.
 */
const updateRule = function(progress, client, existingRules, ruleName, ruleData, excluded) {
  const isExcluded = excluded.indexOf(ruleName) >= 0;
  const metadata = (ruleData.metadata) ? utils.parseJsonFile(ruleName, ruleData.metadataFile) : { enabled: true };

  const payload = {
    name: ruleName,
    script: ruleData.scriptFile,
    enabled: true
  };

  progress.log('Processing rule ' + ruleName);

  // If a metadata file is provided, we'll apply these values to the rule.
  const applyMetadata = function() {
    if (metadata.enabled !== undefined) {
      payload.enabled = metadata.enabled;
    }

    if (metadata.order) {
      payload.order = metadata.order;
    }
  };

  const existingRule = _.find(existingRules, { name: ruleName });
  if (!existingRule) {
    payload.stage = 'login_success';
    payload.enabled = true;

    applyMetadata();

    progress.rulesCreated += 1;
    progress.log('Creating rule ' + ruleName + ': ' + JSON.stringify(payload, null, 2));

    return client.rules.create(payload);
  }

  if (isExcluded && payload.script) {
    payload.script = null;
    progress.log('Ignoring script payload for manual rule: ' + ruleName);
  }

  if (!payload.script) {
    payload.script = existingRule.script;
  }

  applyMetadata();

  // Update the rule.
  progress.rulesUpdated += 1;
  progress.log('Updating rule ' + ruleName + ' (' + existingRule.id + '):' + JSON.stringify(payload, null, 2));
  return client.rules.update({ id: existingRule.id }, payload);
};

/*
 * Update all rules.
 */
const updateRules = function(progress, client, rules, excluded) {
  const ruleNames = _.keys(rules);
  if (ruleNames.length === 0) {
    return Promise.resolve(true);
  }

  progress.log('Updating rules...');

  return getRules(progress, client)
    .then(function(existingRules) {
      progress.log(
        'Existing rules: ' + JSON.stringify(existingRules.map(
          function(rule) {
            return { id: rule.id, name: rule.name, stage: rule.stage, order: rule.order };
          }),
          null,
          2));
      return Promise.map(
        ruleNames,
        function(ruleName) {
          updateRule(progress, client, existingRules, ruleName, rules[ruleName], excluded);
        },
        { concurrency: constants.CONCURRENT_CALLS }
      );
    });
};

/*
 * Metadata cannot exist without rules unless the rule is excluded (manual rule);
 */
const validateRulesExistence = function(progress, client, rules, excluded) {
  const invalidRules = _(rules)
    .keys()
    .filter(function(ruleName) {
      return excluded.indexOf(ruleName) < 0 && rules[ruleName].metadata && !rules[ruleName].script;
    })
    .value();

  if (invalidRules.length) {
    return Promise.reject(
      new ValidationError('The following rules have metadata files, but have no script files: ' + invalidRules.join())
    );
  }

  return Promise.resolve(true);
};

/*
 * Detect stage errors.
 */
const validateRulesStages = function(progress, client, rules, existingRules) {
  // Invalid stages.
  const invalidStages = _(rules)
    .keys()
    .filter(function(ruleName) {
      if (!rules[ruleName].metadata) {
        return false;
      }

      const metadata = utils.parseJsonFile(ruleName, rules[ruleName].metadataFile);
      return metadata.stage && constants.RULES_STAGES.indexOf(metadata.stage) < 0;
    })
    .value();
  if (invalidStages.length) {
    return Promise.reject(
      new ValidationError('The following rules have invalid stages set in their metadata files: ' + invalidStages.join() +
        '. Go to https://auth0.com/docs/api/management/v2#!/Rules/post_rules to find the valid stage names.'));
  }

  // Rules that changed state
  const changeStages = _(rules)
    .keys()
    .filter(function(ruleName) {
      if (!rules[ruleName].metadata) {
        return false;
      }

      const metadata = utils.parseJsonFile(ruleName, rules[ruleName].metadataFile);
      return metadata.stage
        && _.some(
          existingRules,
          function(existing) {
            return existing.name === ruleName && existing.stage !== metadata.stage;
          });
    })
    .value();

  if (changeStages.length) {
    return Promise.reject(
      new ValidationError(
        'The following rules changed stage which is not allowed: ' + changeStages.join() +
        '. Rename the rules to recreate them and avoid this error.'
      )
    );
  }

  return existingRules;
};

/*
 * Do not allow rules with the same order.
 */
const validateRulesOrder = function(progress, client, rules, existingRules) {
  const rulesWithOrder = _(rules)
    .keys()
    .filter(function(ruleName) {
      if (!rules[ruleName].metadata) {
        return false;
      }

      const metadata = utils.parseJsonFile(ruleName, rules[ruleName].metadataFile);
      return metadata.order;
    })
    .map(function(ruleName) {
      const metadata = utils.parseJsonFile(ruleName, rules[ruleName].metadataFile);
      return {
        name: ruleName,
        stage: metadata.stage || constants.DEFAULT_RULE_STAGE,
        order: metadata.order
      };
    })
    .value();

  // Rules with the same order number
  const duplicatedStageOrder = _(rulesWithOrder)
    .countBy(function(rule) {
      return 'Stage:' + rule.stage + '|Order:' + rule.order;
    })
    .omitBy(function(count) {
      return count < 2;
    })
    .keys()
    .value();
  if (duplicatedStageOrder.length > 0) {
    return Promise.reject(
      new ValidationError('There are multiple rules for the following stage-order combinations [' + duplicatedStageOrder.join() + ']. ' +
        'Only one rule must be defined for the same order number in a stage.'
      )
    );
  }

  // Rules with same order than existing rules
  const rulesRepeatingOrder = _(rulesWithOrder)
    .filter(function(rule) {
      return _.some(existingRules, function(existing) {
        return existing.name !== rule.name && existing.stage === rule.stage && existing.order === rule.order && !_.find(rulesWithOrder, { name: existing.name });
      });
    })
    .map(mapToName)
    .value();
  if (rulesRepeatingOrder.length > 0) {
    return Promise.reject(
      new ValidationError('The following rules have the same order number that other existing rule: ' + rulesRepeatingOrder.join() +
        '. Updating them may cause a failure in deployment, use different order numbers to ensure a succesful deployment'
      )
    );
  }

  return existingRules;
};

/*
 * Validate rules before touching anything.
 */
const validateRules = function(progress, client, rules, excluded) {
  const ruleNames = _.keys(rules);
  if (ruleNames.length === 0) {
    return Promise.resolve(true);
  }

  progress.log('Validating rules...');

  return getRules(progress, client)
    .then(function(existingRules) {
      return validateRulesExistence(progress, client, rules, excluded)
        .then(function() {
          return validateRulesStages(progress, client, rules, existingRules);
        })
        .then(function() {
          return validateRulesOrder(progress, client, rules, existingRules);
        })
        .then(function() {
          return existingRules;
        });
    });
};

module.exports = {
  getRules: getRules,
  updateRules: updateRules,
  deleteRules: deleteRules,
  validateRules: validateRules
};
