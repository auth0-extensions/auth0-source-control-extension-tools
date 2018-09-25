const { expect } = require('chai');
const pages = require('../../../src/auth0/handlers/pages');

describe('#pages handler', () => {
  describe('#pages process', () => {
    it('should update login page', async () => {
      const auth0 = {
        clients: {
          update: (params, data) => {
            expect(params).to.be.an('object');
            expect(data).to.be.an('object');
            expect(params.client_id).to.equal('global1');
            expect(data.custom_login_page).to.equal('login_body');
            expect(data.custom_login_page_on).to.equal(true);
            return Promise.resolve(data);
          },
          getAll: () => [ { client_id: 'global1' } ]
        }
      };

      const handler = new pages.default({ client: auth0 });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { pages: [ { name: 'login', html: 'login_body', enabled: true } ] } ]);
    });

    it('should update password_reset page', async () => {
      const auth0 = {
        tenant: {
          updateSettings: (data) => {
            expect(data).to.be.an('object');
            expect(data.change_password).to.be.an('object');
            expect(data.change_password.html).to.equal('password_reset_body');
            expect(data.change_password.enabled).to.equal(false);
            return Promise.resolve(data);
          }
        }
      };

      const handler = new pages.default({ client: auth0 });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { pages: [ { name: 'password_reset', html: 'password_reset_body', enabled: false } ] } ]);
    });
  });
});
