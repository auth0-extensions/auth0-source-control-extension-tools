const { expect } = require('chai');
const clientGrants = require('../../../src/auth0/handlers/clientGrants');

const pool = {
  addEachTask: (data) => {
    if (data.data && data.data.length) {
      data.generator(data.data[0]);
    }
    return { promise: () => null };
  }
};

describe('#clientGrants handler', () => {
  const config = function(key) {
    return config.data && config.data[key];
  };

  config.data = {
    AUTH0_CLIENT_ID: 'client_id',
    AUTH0_ALLOW_DELETE: true
  };

  describe('#clientGrants validate', () => {
    it('should not allow same names', async () => {
      const handler = new clientGrants.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'someClientGrant'
        },
        {
          name: 'someClientGrant'
        }
      ];

      try {
        await stageFn.apply(handler, [ { clientGrants: data } ]);
      } catch (err) {
        expect(err).to.be.an('object');
        expect(err.message).to.include('Names must be unique');
      }
    });

    it('should pass validation', async () => {
      const handler = new clientGrants.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'someClientGrant'
        }
      ];

      await stageFn.apply(handler, [ { clientGrants: data } ]);
    });
  });

  describe('#clientGrants process', () => {
    it('should create client grants', async () => {
      const auth0 = {
        clientGrants: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('someClientGrant');
            return Promise.resolve(data);
          },
          update: () => Promise.resolve([]),
          delete: () => Promise.resolve([]),
          getAll: () => []
        },
        clients: {
          getAll: () => []
        },
        pool
      };

      const handler = new clientGrants.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = [
        {
          name: 'someClientGrant'
        }
      ];

      await stageFn.apply(handler, [ { clientGrants: data } ]);
    });

    it('should get client grants', async () => {
      const clientId = 'rFeR6vyzQcDEgSUsASPeF4tXr3xbZhxE';
      const clientGrant = {
        audience: 'https://test.auth0.com/api/v2/',
        client_id: clientId,
        id: 'cgr_0TLisL4eNHzhSR6j',
        scope: [
          'read:logs'
        ]
      };
      const auth0 = {
        clientGrants: {
          getAll: () => [ clientGrant ]
        },
        clients: {
          getAll: () => [
            { name: 'test client', client_id: clientId }
          ]
        },
        pool
      };

      const handler = new clientGrants.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal([ clientGrant ]);
    });

    it('should convert client_name to client_id', async () => {
      const auth0 = {
        clientGrants: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('someClientGrant');
            expect(data.client_id).to.equal('client_id');
            return Promise.resolve(data);
          },
          update: () => Promise.resolve([]),
          delete: () => Promise.resolve([]),
          getAll: () => []
        },
        clients: {
          getAll: () => [ { client_id: 'client_id', name: 'client_name' } ]
        },
        pool
      };

      const handler = new clientGrants.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = [
        {
          name: 'someClientGrant',
          client_id: 'client_name'
        }
      ];

      await stageFn.apply(handler, [ { clientGrants: data } ]);
    });

    it('should update client grant', async () => {
      const auth0 = {
        clientGrants: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data).to.equal({});
            return Promise.resolve(data);
          },
          update: (params, data) => {
            expect(params).to.be.an('object');
            expect(params.id).to.equal('cg1');
            expect(data).to.be.an('object');
            expect(data.scope).to.be.an('array');
            expect(data.scope[0]).to.equal('read:messages');

            return Promise.resolve(data);
          },
          delete: () => Promise.resolve([]),
          getAll: () => [ { id: 'cg1', client_id: 'client1', audience: 'audience' } ]
        },
        clients: {
          getAll: () => []
        },
        pool
      };

      const handler = new clientGrants.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = [
        {
          client_id: 'client1',
          audience: 'audience',
          scope: [ 'read:messages' ]
        }
      ];

      await stageFn.apply(handler, [ { clientGrants: data } ]);
    });

    it('should delete client grant and create another one instead', async () => {
      const auth0 = {
        clientGrants: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('someClientGrant');
            expect(data.client_id).to.equal('client2');
            return Promise.resolve(data);
          },
          update: () => Promise.resolve([]),
          delete: (params) => {
            expect(params).to.be.an('object');
            expect(params.id).to.equal('cg1');

            return Promise.resolve([]);
          },
          getAll: () => [ { id: 'cg1', client_id: 'client1', audience: 'audience1' } ]
        },
        clients: {
          getAll: () => []
        },
        pool
      };

      const handler = new clientGrants.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = [
        {
          name: 'someClientGrant',
          client_id: 'client2',
          audience: 'audience2'
        }
      ];

      await stageFn.apply(handler, [ { clientGrants: data } ]);
    });

    it('should delete all client grants', async () => {
      let removed = false;
      const auth0 = {
        clientGrants: {
          create: () => Promise.resolve([]),
          update: () => Promise.resolve([]),
          delete: (params) => {
            expect(params).to.be.an('object');
            expect(params.id).to.equal('cg1');
            removed = true;
            return Promise.resolve([]);
          },
          getAll: () => [ { id: 'cg1', client_id: 'client1', audience: 'audience1' } ]
        },
        clients: {
          getAll: () => []
        },
        pool
      };

      const handler = new clientGrants.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { clientGrants: [] } ]);
      expect(removed).to.equal(true);
    });
  });
});
