const rules = require('./rules');
const pages = require('./pages');
const connections = require('./connections');
const clients = require('./clients');
const ruleConfigs = require('./ruleConfigs');
const resourceServers = require('./resourceServers');
const emailTemplates = require('./emailTemplates');
const emailProviders = require('./emailProviders');

module.exports = {
  /* Connection and database operations */
  validateDatabases: connections.validateDatabases,
  updateDatabases: connections.updateDatabases,

  /* Rule operations */
  validateRules: rules.validateRules,
  deleteRules: rules.deleteRules,
  updateRules: rules.updateRules,

  /* Rule Configs operations */
  updateRuleConfigs: ruleConfigs.updateRuleConfigs,

  /* Client operations */
  validateClients: clients.validateClients,
  updateClients: clients.updateClients,

  /* ResourceServer operations */
  validateResourceServers: resourceServers.validateResourceServers,
  updateResourceServers: resourceServers.updateResourceServers,

  /* Page operations */
  updatePages: pages.updatePages,
  updateErrorPage: pages.updateErrorPage,
  updatePasswordResetPage: pages.updatePasswordResetPage,
  updateLoginPage: pages.updateLoginPage,
  updateGuardianMultifactorPage: pages.updateGuardianMultifactorPage,

  /* Email template operations */
  updateAllEmailTemplates: emailTemplates.updateAllEmailTemplates,

  /* Email provider operations */
  updateEmailProvider: emailProviders.updateEmailProvider
};
