const expect = require('expect');
const tools = require('../src/index');

describe('#constants', () => {
  it('should be exposed', () => {
    expect(tools.constants.PAGE_NAMES).toExist();
    expect(tools.constants.RULES_STAGES).toInclude('login_success');
  });
});
