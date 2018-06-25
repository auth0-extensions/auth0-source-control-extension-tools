const expect = require('expect');
const tools = require('../src/index');

describe('#constants', () => {
  it('should be exposed', () => {
    expect(tools.constants.PAGE_NAMES).toExist();
    expect(tools.constants.RULES_STAGES).toInclude('login_success');
  });

  it('should have email template names', () => {
    expect(tools.constants.EMAIL_TEMPLATES.length).toBeGreaterThan(0);
  });
});
