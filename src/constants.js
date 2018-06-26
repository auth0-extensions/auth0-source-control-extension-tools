const constants = module.exports = { }; // eslint-disable-line no-multi-assign

const _ = require('lodash');

constants.RULES_DIRECTORY = 'rules';
constants.RULES_STAGES = [
  'login_success'
];
constants.DEFAULT_RULE_STAGE = constants.RULES_STAGES[0];

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

constants.RESOURCE_SERVERS_DIRECTORY = 'resource-servers';
constants.RESOURCE_SERVERS_CLIENT_NAME = 'resourceServers';
constants.RESOURCE_SERVERS_MANAGEMENT_API_NAME = 'Auth0 Management API';
constants.RESOURCE_SERVERS_ID_NAME = 'id';

constants.CLIENTS_DIRECTORY = 'clients';
constants.CLIENTS_CLIENT_NAME = 'clients';
constants.CLIENTS_CLIENT_ID_NAME = 'client_id';

constants.CONCURRENT_CALLS = 5;

constants.EMAIL_TEMPLATE_VERIFY_EMAIL = 'verify_email';
constants.EMAIL_TEMPLATE_RESET_EMAIL = 'reset_email';
constants.EMAIL_TEMPLATE_WELCOME_EMAIL = 'welcome_email';
constants.EMAIL_TEMPLATE_BLOCKED_ACCOUNT = 'blocked_account';
constants.EMAIL_TEMPLATE_STOLEN_CREDENTIALS = 'stolen_credentials';
constants.EMAIL_TEMPLATE_ENROLLMENT_EMAIL = 'enrollment_email';
constants.EMAIL_TEMPLATE_CHANGE_PASSWORD = 'change_password';
constants.EMAIL_TEMPLATE_PASSWORD_RESET = 'password_reset';
constants.EMAIL_TEMPLATE_MFA_OOB_CODE = 'mfa_oob_code';

constants.EMAIL_TEMPLATE_NAMES = [
  constants.EMAIL_TEMPLATE_VERIFY_EMAIL,
  constants.EMAIL_TEMPLATE_RESET_EMAIL,
  constants.EMAIL_TEMPLATE_WELCOME_EMAIL,
  constants.EMAIL_TEMPLATE_BLOCKED_ACCOUNT,
  constants.EMAIL_TEMPLATE_STOLEN_CREDENTIALS,
  constants.EMAIL_TEMPLATE_ENROLLMENT_EMAIL,
  constants.EMAIL_TEMPLATE_CHANGE_PASSWORD,
  constants.EMAIL_TEMPLATE_PASSWORD_RESET,
  constants.EMAIL_TEMPLATE_MFA_OOB_CODE
];

constants.EMAIL_TEMPLATE_FILENAMES = _.flatMap(constants.EMAIL_TEMPLATE_NAMES, name => [ name + '.html', name + '.json' ]);

constants.EMAIL_TEMPLATES_DIRECTORY = 'email-templates';

constants.EMAIL_PROVIDER_NAME = 'default';
constants.EMAIL_PROVIDER_FILENAME = constants.EMAIL_PROVIDER_NAME + '.json';
constants.EMAIL_PROVIDERS_DIRECTORY = 'email-providers';
