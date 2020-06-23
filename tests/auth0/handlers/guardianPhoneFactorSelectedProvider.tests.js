const { expect } = require('chai');
const guardianPhoneFactorSelectedProvider = require('../../../src/auth0/handlers/guardianPhoneFactorSelectedProvider');

describe('#guardianPhoneFactorSelectedProvider handler', () => {
  describe('#getType', () => {
    it('should support older version of auth0 client', async () => {
      const auth0 = {
        guardian: {
          // omitting getPhoneFactorSelectedProvider()
        }
      };

      const handler = new guardianPhoneFactorSelectedProvider.default({ client: auth0 });
      const data = await handler.getType();
      expect(data).to.deep.equal(null);
    });

    it('should get guardian phone factor selected provider', async () => {
      const auth0 = {
        guardian: {
          getPhoneFactorSelectedProvider: () => ({ provider: 'twilio' })
        }
      };

      const handler = new guardianPhoneFactorSelectedProvider.default({ client: auth0 });
      const data = await handler.getType();
      expect(data).to.deep.equal({ provider: 'twilio' });
    });
  });

  describe('#processChanges', () => {
    it('should update guardian phone factor selected provider', async () => {
      const auth0 = {
        guardian: {
          updatePhoneFactorSelectedProvider: (params, data) => {
            expect(data).to.eql({ provider: 'twilio' });
            return Promise.resolve(data);
          }
        }
      };

      const handler = new guardianPhoneFactorSelectedProvider.default({ client: auth0 });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [
        { guardianPhoneFactorSelectedProvider: { provider: 'twilio' } }
      ]);
    });

    it('should skip processing if assets are empty', async () => {
      const auth0 = {
        guardian: {
          updatePhoneFactorSelectedProvider: () => {
            const err = new Error('updatePhoneFactorSelectedProvider() should not have been called');
            return Promise.reject(err);
          }
        }
      };

      const handler = new guardianPhoneFactorSelectedProvider.default({ client: auth0 });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [
        { guardianPhoneFactorSelectedProvider: null }
      ]);
    });
  });
});
