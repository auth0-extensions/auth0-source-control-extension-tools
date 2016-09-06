const constants = module.exports = { };
constants.RULES_DIRECTORY = 'rules';
constants.RULES_STAGES = [
  'login_success',
  'login_failure',
  'pre_authorize',
  'user_registration',
  'user_blocked'
];
constants.DEFAULT_RULE_STAGE = constants.RULES_STAGES[0];

constants.PAGES_DIRECTORY = 'pages';
constants.PAGE_NAMES = [
  'password_reset.html',
  'password_reset.json',
  'login.html',
  'login.json'
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
