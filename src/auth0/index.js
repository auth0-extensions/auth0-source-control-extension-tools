const rules = require('./rules');
const pages = require('./pages');
const databaseConnections = require('./databaseConnections');
const clients = require('./clients');
const resourceServers = require('./resourceServers');
const connections = require('./connections');

module.exports = {
  /* Connection and database operations */
  validateDatabases: databaseConnections.validateDatabases,
  updateDatabases: databaseConnections.updateDatabases,

  /* Rule operations */
  validateRules: rules.validateRules,
  deleteRules: rules.deleteRules,
  updateRules: rules.updateRules,

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

  /* Connection operations */
  validateConnections: connections.validateConnections,
  updateConnections: connections.updateConnections
};
