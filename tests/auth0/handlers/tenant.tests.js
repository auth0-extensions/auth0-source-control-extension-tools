const { expect } = require('chai');
const tenant = require('../../../src/auth0/handlers/tenant');

describe('#tenant handler', () => {
  describe('#tenant validate', () => {
    it('should not allow pages in tenant config', async () => {
      const handler = new tenant.default({ client: {} });
      const stageFn = Object.getPrototypeOf(handler).validate;

      try {
        await stageFn.apply(handler, [ { tenant: { password_reset: 'page_body' } } ]);
      } catch (err) {
        expect(err).to.be.an('object');
        expect(err.message).to.include('Pages should be set separately');
      }
    });
  });

  describe('#tenant process', () => {
    it('should update tenant settings', async () => {
      const auth0 = {
        tenant: {
          updateSettings: (data) => {
            expect(data).to.be.an('object');
            expect(data.sandbox_version).to.equal('4');
            return Promise.resolve(data);
          }
        }
      };

      const handler = new tenant.default({ client: auth0 });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { tenant: { sandbox_version: '4' } } ]);
    });
  });
});
