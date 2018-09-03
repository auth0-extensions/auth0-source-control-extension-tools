const expect = require('expect');
const auth0 = require('../../src/auth0');

describe('#auth0', () => {
  it('exposes function for updating all email templates', () => {
    expect(auth0.updateAllEmailTemplates).toBeA(Function);
  });
});
