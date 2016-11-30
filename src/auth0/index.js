const rules = require('./rules');
const pages = require('./pages');
const connections = require('./connections');
const clients = require('./clients');

module.exports = {
  /* Connection and database operations */
  validateDatabases: connections.validateDatabases,
  updateDatabases: connections.updateDatabases,

  /* Rule operations */
  validateRules: rules.validateRules,
  deleteRules: rules.deleteRules,
  updateRules: rules.updateRules,

  /* Client operations */
  validateClients: clients.validateClients,
  updateClients: clients.updateClients,

  /* Page operations */
  updatePages: pages.updatePages,
  updateErrorPage: pages.updateErrorPage,
  updatePasswordResetPage: pages.updatePasswordResetPage,
  updateLoginPage: pages.updateLoginPage,
  updateGuardianMultifactorPage: pages.updateGuardianMultifactorPage
};
