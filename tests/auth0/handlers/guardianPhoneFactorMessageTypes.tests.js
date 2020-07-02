const { expect } = require('chai');
const guardianPhoneFactorMessageTypes = require('../../../src/auth0/handlers/guardianPhoneFactorMessageTypes');

describe('#guardianPhoneFactorMessageTypes handler', () => {
  describe('#getType', () => {
    it('should support older version of auth0 client', async () => {
      const auth0 = {
        guardian: {
          // omitting getPhoneFactorMessageTypes()
        }
      };

      const handler = new guardianPhoneFactorMessageTypes.default({ client: auth0 });
      const data = await handler.getType();
      expect(data).to.deep.equal(null);
    });

    it('should get guardian phone factor message types', async () => {
      const auth0 = {
        guardian: {
          getPhoneFactorMessageTypes: () => ({ message_types: [ 'sms', 'voice' ] })
        }
      };

      const handler = new guardianPhoneFactorMessageTypes.default({ client: auth0 });
      const data = await handler.getType();
      expect(data).to.deep.equal({ message_types: [ 'sms', 'voice' ] });
    });
  });

  describe('#processChanges', () => {
    it('should update guardian phone factor message types', async () => {
      const auth0 = {
        guardian: {
          updatePhoneFactorMessageTypes: (params, data) => {
            expect(data).to.eql({ message_types: [ 'sms', 'voice' ] });
            return Promise.resolve(data);
          }
        }
      };

      const handler = new guardianPhoneFactorMessageTypes.default({ client: auth0 });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [
        { guardianPhoneFactorMessageTypes: { message_types: [ 'sms', 'voice' ] } }
      ]);
    });

    it('should skip processing if assets are empty', async () => {
      const auth0 = {
        guardian: {
          updatePhoneFactorMessageTypes: () => {
            const err = new Error('updatePhoneFactorMessageTypes() should not have been called');
            return Promise.reject(err);
          }
        }
      };

      const handler = new guardianPhoneFactorMessageTypes.default({ client: auth0 });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [
        { guardianPhoneFactorMessageTypes: null }
      ]);
    });
  });
});
