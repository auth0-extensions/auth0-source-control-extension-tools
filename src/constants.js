const constants = module.exports = { };
constants.RULES_DIRECTORY = 'rules';
constants.RULES_STAGES = [
  'login_success'
];
constants.DEFAULT_RULE_STAGE = constants.RULES_STAGES[0];

constants.PAGES_DIRECTORY = 'pages';
constants.PAGE_LOGIN = 'login';
constants.PAGE_PASSWORD_RESET = 'password_reset';
constants.PAGE_GUARDIAN_MULTIFACTOR = 'guardian_multifactor';
constants.PAGE_ERROR = 'error_page';

constants.PAGE_NAMES = [
  constants.PAGE_GUARDIAN_MULTIFACTOR + '.html',
  constants.PAGE_GUARDIAN_MULTIFACTOR + '.json',
  constants.PAGE_PASSWORD_RESET + '.html',
  constants.PAGE_PASSWORD_RESET + '.json',
  constants.PAGE_LOGIN + '.html',
  constants.PAGE_LOGIN + '.json',
  constants.PAGE_ERROR + '.html',
  constants.PAGE_ERROR + '.json'
];

constants.DATABASE_CONNECTIONS_DIRECTORY = 'database-connections';
constants.DATABASE_SCRIPTS_CHANGE_EMAIL = 'change_email';
constants.DATABASE_SCRIPTS_GET_USER = 'get_user';
constants.DATABASE_SCRIPTS = [
  constants.DATABASE_SCRIPTS_GET_USER,
  'create',
  'verify',
  'login',
  'change_password',
  'delete',
  constants.DATABASE_SCRIPTS_CHANGE_EMAIL
];
constants.DATABASE_SCRIPTS_NO_IMPORT = [
  'create',
  'verify',
  'login',
  'change_password',
  'delete'
];
constants.DATABASE_SCRIPTS_IMPORT = [
  constants.DATABASE_SCRIPTS_GET_USER,
  'login'
];

constants.RESOURCE_SERVERS_DIRECTORY = 'resource-servers';
constants.RESOURCE_SERVERS_CLIENT_NAME = 'resourceServers';
constants.RESOURCE_SERVERS_MANAGEMENT_API_NAME = 'Auth0 Management API';
constants.RESOURCE_SERVERS_ID_NAME = 'id';

constants.CLIENTS_DIRECTORY = 'clients';
constants.CLIENTS_CLIENT_NAME = 'clients';
constants.CLIENTS_CLIENT_ID_NAME = 'client_id';

constants.CONCURRENT_CALLS = 5;
