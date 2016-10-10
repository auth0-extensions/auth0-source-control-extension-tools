const rules = require('./rules');
const pages = require('./pages');
const connections = require('./connections');

module.exports = {
  /* Connection and database operations */
  validateDatabases: connections.validateDatabases,
  updateDatabases: connections.updateDatabases,

  /* Rule operations */
  validateRules: rules.validateRules,
  deleteRules: rules.deleteRules,
  updateRules: rules.updateRules,

  /* Page operations */
  updatePages: pages.updatePages,
  updateErrorPage: pages.updateErrorPage,
  updatePasswordResetPage: pages.updatePasswordResetPage,
  updateLoginPage: pages.updateLoginPage,
  updateGuardianMultifactorPage: pages.updateGuardianMultifactorPage
};
