const { expect } = require('chai');
const guardianPolicies = require('../../../src/auth0/handlers/guardianPolicies');

describe('#guardianPolicies handler', () => {
  describe('#getType', () => {
    it('should support older version of auth0 client', async () => {
      const auth0 = {
        guardian: {
          // omitting getPolicies()
        }
      };

      const handler = new guardianPolicies.default({ client: auth0 });
      const data = await handler.getType();
      expect(data).to.deep.equal(null);
    });

    it('should get guardian policies', async () => {
      const auth0 = {
        guardian: {
          getPolicies: () => ([ 'all-applications' ])
        }
      };

      const handler = new guardianPolicies.default({ client: auth0 });
      const data = await handler.getType();
      expect(data).to.deep.equal([ 'all-applications' ]);
    });
  });

  describe('#processChanges', () => {
    it('should update guardian policies settings', async () => {
      const auth0 = {
        guardian: {
          updatePolicies: (params, data) => {
            expect(data).to.be.an('array');
            expect(data[0]).to.equal('all-applications');
            return Promise.resolve(data);
          }
        }
      };

      const handler = new guardianPolicies.default({ client: auth0 });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [
        { guardianPolicies: [ 'all-applications' ] }
      ]);
    });

    it('should skip processing if assets are empty', async () => {
      const auth0 = {
        guardian: {
          updatePolicies: () => {
            const err = new Error('updatePolicies() should not have been called');
            return Promise.reject(err);
          }
        }
      };

      const handler = new guardianPolicies.default({ client: auth0 });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [
        { guardianPolicies: null }
      ]);
    });
  });
});
