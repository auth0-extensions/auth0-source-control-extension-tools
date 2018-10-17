const { expect } = require('chai');
const clients = require('../../../src/auth0/handlers/clients');

const pool = {
  addEachTask: (data) => {
    if (data.data && data.data.length) {
      data.generator(data.data[0]);
    }
    return { promise: () => null };
  }
};

describe('#clients handler', () => {
  const config = function(key) {
    return config.data && config.data[key];
  };

  config.data = {
    AUTH0_CLIENT_ID: 'client_id',
    AUTH0_ALLOW_CLIENT_DELETE: true
  };

  describe('#clients validate', () => {
    it('should not allow same names', async () => {
      const handler = new clients.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'someClient'
        },
        {
          name: 'someClient'
        }
      ];

      try {
        await stageFn.apply(handler, [ { clients: data } ]);
      } catch (err) {
        expect(err).to.be.an('object');
        expect(err.message).to.include('Names must be unique');
      }
    });

    it('should pass validation', async () => {
      const handler = new clients.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'someClient'
        }
      ];

      await stageFn.apply(handler, [ { clients: data } ]);
    });
  });

  describe('#clients process', () => {
    it('should create client', async () => {
      const auth0 = {
        clients: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('someClient');
            return Promise.resolve(data);
          },
          update: () => Promise.resolve([]),
          delete: () => Promise.resolve([]),
          getAll: () => []
        },
        pool
      };

      const handler = new clients.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { clients: [ { name: 'someClient' } ] } ]);
    });

    it('should get clients', async () => {
      const auth0 = {
        clients: {
          getAll: () => [
            { name: 'test client', client_id: 'FMfcgxvzLDvPsgpRFKkLVrnKqGgkHhQV' },
            { name: 'deploy client', client_id: 'client_id' }
          ]
        },
        pool
      };

      const handler = new clients.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal([ { name: 'test client', client_id: 'FMfcgxvzLDvPsgpRFKkLVrnKqGgkHhQV' } ]);
    });

    it('should update client', async () => {
      const auth0 = {
        clients: {
          create: (data) => {
            expect(data).to.be.an('array');
            expect(data.length).to.equal(0);
            return Promise.resolve(data);
          },
          update: (params, data) => {
            expect(params).to.be.an('object');
            expect(params.client_id).to.equal('client1');
            expect(data).to.be.an('object');
            expect(data.description).to.equal('new description');

            return Promise.resolve(data);
          },
          delete: () => Promise.resolve([]),
          getAll: () => [ { client_id: 'client1', name: 'someClient' } ]
        },
        pool
      };

      const handler = new clients.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { clients: [ { name: 'someClient', description: 'new description' } ] } ]);
    });

    it('should delete client and create another one instead', async () => {
      const auth0 = {
        clients: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('someClient');
            return Promise.resolve(data);
          },
          update: () => Promise.resolve([]),
          delete: (params) => {
            expect(params).to.be.an('object');
            expect(params.client_id).to.equal('client1');
            return Promise.resolve([]);
          },
          getAll: () => [ { client_id: 'client1', name: 'existingClient' } ]

        },
        pool
      };

      const handler = new clients.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { clients: [ { name: 'someClient' } ] } ]);
    });

    it('should not remove client if it is not allowed by config', async () => {
      config.data.AUTH0_ALLOW_CLIENT_DELETE = false;
      const auth0 = {
        clients: {
          create: () => Promise.resolve([]),
          update: () => Promise.resolve([]),
          delete: (params) => {
            expect(params).to.be.an('undefined');
            return Promise.resolve([]);
          },
          getAll: () => [ { client_id: 'client1', name: 'existingClient' } ]
        },
        pool
      };

      const handler = new clients.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { clients: [ { name: 'newClient' } ] } ]);
    });
  });
});

