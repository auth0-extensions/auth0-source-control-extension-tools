const expect = require('expect');
const tools = require('../src/index');

describe('#constants', () => {
  it('should be exposed', () => {
    expect(tools.constants.PAGE_NAMES).toExist();
    expect(tools.constants.RULES_STAGES).toInclude('login_success');
  });

  it('should have email template names', () => {
    expect(tools.constants.EMAIL_TEMPLATE_NAMES.length).toBeGreaterThan(0);
  });

  it('should have email template file names', () => {
    expect(tools.constants.EMAIL_TEMPLATE_FILENAMES).toContain('verify_email.html');
    expect(tools.constants.EMAIL_TEMPLATE_FILENAMES).toContain('verify_email.json');
  });

  it('should have email templates directory', () => {
    expect(tools.constants.EMAIL_TEMPLATES_DIRECTORY).toEqual('email-templates');
  });

  it('should have email providers directory', () => {
    expect(tools.constants.EMAIL_PROVIDERS_DIRECTORY).toEqual('email-providers');
  });

  it('should have name of default email provider', () => {
    expect(tools.constants.EMAIL_PROVIDER_NAME).toEqual('default');
  });

  it('should have file name of default email provider', () => {
    expect(tools.constants.EMAIL_PROVIDER_FILENAME).toEqual('default.json');
  });
});
