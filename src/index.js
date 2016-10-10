const middlewares = require('./middlewares');
const constants = require('./constants');
const deploy = require('./deploy');
const utils = require('./utils');

module.exports.constants = constants;
module.exports.deploy = deploy;

module.exports.dashboardAdmins = middlewares.dashboardAdmins;
module.exports.requireUser = middlewares.requireUser;

module.exports.unifyDatabases = utils.unifyDatabases;
module.exports.unifyScripts = utils.unifyScripts;
