const constants = {};

constants.RULES_DIRECTORY = 'rules';
constants.RULES_STAGES = [
  'login_success'
];

constants.DEFAULT_RULE_STAGE = constants.RULES_STAGES[0];  // eslint-disable-line

constants.RULES_CONFIGS_DIRECTORY = 'rules-configs';

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
  constants.DATABASE_SCRIPTS_GET_USER,
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

constants.EMAIL_TEMPLATES_DIRECTORY = 'emails';

constants.EMAIL_VERIFY = 'verify_email';
constants.EMAIL_RESET = 'reset_email';
constants.EMAIL_WELCOME = 'welcome_email';
constants.EMAIL_BLOCKED = 'blocked_account';
constants.EMAIL_STOLEN_CREDENTIALS = 'stolen_credentials';
constants.EMAIL_ENROLLMENT = 'enrollment_email';
constants.EMAIL_CHANGE_PASSWORD = 'change_password';
constants.EMAIL_PASSWORD_RESET = 'password_reset';
constants.EMAIL_MFA_OOB_CODE = 'mfa_oob_code';

constants.EMAIL_TEMPLATES_NAMES = [
  constants.EMAIL_VERIFY + '.json',
  constants.EMAIL_VERIFY + '.html',
  constants.EMAIL_RESET + '.json',
  constants.EMAIL_RESET + '.html',
  constants.EMAIL_WELCOME + '.json',
  constants.EMAIL_WELCOME + '.html',
  constants.EMAIL_BLOCKED + '.json',
  constants.EMAIL_BLOCKED + '.html',
  constants.EMAIL_STOLEN_CREDENTIALS + '.json',
  constants.EMAIL_STOLEN_CREDENTIALS + '.html',
  constants.EMAIL_ENROLLMENT + '.json',
  constants.EMAIL_ENROLLMENT + '.html',
  constants.EMAIL_CHANGE_PASSWORD + '.json',
  constants.EMAIL_CHANGE_PASSWORD + '.html',
  constants.EMAIL_PASSWORD_RESET + '.json',
  constants.EMAIL_PASSWORD_RESET + '.html',
  constants.EMAIL_MFA_OOB_CODE + '.json',
  constants.EMAIL_MFA_OOB_CODE + '.html'
];


constants.RESOURCE_SERVERS_DIRECTORY = 'resource-servers';
constants.RESOURCE_SERVERS_CLIENT_NAME = 'resourceServers';
constants.RESOURCE_SERVERS_MANAGEMENT_API_NAME = 'Auth0 Management API';
constants.RESOURCE_SERVERS_ID_NAME = 'id';

constants.CLIENTS_DIRECTORY = 'clients';
constants.CLIENTS_CLIENT_NAME = 'clients';
constants.CLIENTS_CLIENT_ID_NAME = 'client_id';

constants.CONNECTIONS_DIRECTORY = 'connections';
constants.CONNECTIONS_CLIENT_NAME = 'connections';
constants.CONNECTIONS_ID_NAME = 'id';

constants.CONCURRENT_CALLS = 5;

export default constants;
