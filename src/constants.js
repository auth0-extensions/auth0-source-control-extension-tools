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

constants.PAGE_NAMES = [
  constants.PAGE_GUARDIAN_MULTIFACTOR + '.html',
  constants.PAGE_GUARDIAN_MULTIFACTOR + '.json',
  constants.PAGE_PASSWORD_RESET + '.html',
  constants.PAGE_PASSWORD_RESET + '.json',
  constants.PAGE_LOGIN + '.html',
  constants.PAGE_LOGIN + '.json'
];

constants.DATABASE_CONNECTIONS_DIRECTORY = 'database-connections';
constants.DATABASE_SCRIPTS = [
  'get_user',
  'create',
  'verify',
  'login',
  'change_password',
  'delete'
];

constants.CONCURRENT_CALLS = 5;
