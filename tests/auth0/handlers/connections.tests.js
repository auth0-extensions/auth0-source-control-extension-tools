const { expect } = require('chai');
const connections = require('../../../src/auth0/handlers/connections');

const pool = {
  addEachTask: (data) => {
    if (data.data && data.data.length) {
      data.generator(data.data[0]);
    }
    return { promise: () => null };
  }
};

describe('#connections handler', () => {
  const config = function(key) {
    return config.data && config.data[key];
  };

  config.data = {
    AUTH0_CLIENT_ID: 'client_id',
    AUTH0_ALLOW_CONNECTION_DELETE: true
  };

  describe('#connections validate', () => {
    it('should not allow same names', async () => {
      const handler = new connections.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'someConnection'
        },
        {
          name: 'someConnection'
        }
      ];

      try {
        await stageFn.apply(handler, [ { connections: data } ]);
      } catch (err) {
        expect(err).to.be.an('object');
        expect(err.message).to.include('Names must be unique');
      }
    });

    it('should pass validation', async () => {
      const handler = new connections.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'someConnection'
        }
      ];

      await stageFn.apply(handler, [ { connections: data } ]);
    });
  });

  describe('#connections process', () => {
    it('should create connection', async () => {
      const auth0 = {
        connections: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('someConnection');
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

      const handler = new connections.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { connections: [ { name: 'someConnection' } ] } ]);
    });

    it('should get connections', async () => {
      const clientId = 'rFeR6vyzQcDEgSUsASPeF4tXr3xbZhxE';

      const auth0 = {
        connections: {
          getAll: () => [
            { strategy: 'github', name: 'github', enabled_clients: [ clientId ] },
            { strategy: 'auth0', name: 'db-should-be-ignored', enabled_clients: [] }
          ]
        },
        clients: {
          getAll: () => [
            { name: 'test client', client_id: clientId }
          ]
        },
        pool
      };

      const handler = new connections.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal([ { strategy: 'github', name: 'github', enabled_clients: [ 'test client' ] } ]);
    });

    it('should update connection', async () => {
      const auth0 = {
        connections: {
          create: (data) => {
            expect(data).to.be.an('undefined');
            return Promise.resolve(data);
          },
          update: (params, data) => {
            expect(params).to.be.an('object');
            expect(params.id).to.equal('con1');
            expect(data).to.be.an('object');
            expect(data.options).to.be.an('object');
            expect(data.options.passwordPolicy).to.equal('testPolicy');

            return Promise.resolve({ ...params, ...data });
          },
          delete: () => Promise.resolve([]),
          getAll: () => [ { name: 'someConnection', id: 'con1', strategy: 'custom' } ]
        },
        clients: {
          getAll: () => []
        },
        pool
      };

      const handler = new connections.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = [
        {
          name: 'someConnection',
          strategy: 'custom',
          options: { passwordPolicy: 'testPolicy' }
        }
      ];

      await stageFn.apply(handler, [ { connections: data } ]);
    });

    it('should delete connection and create another one instead', async () => {
      const auth0 = {
        connections: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('someConnection');
            return Promise.resolve(data);
          },
          update: () => Promise.resolve([]),
          delete: (params) => {
            expect(params).to.be.an('object');
            expect(params.id).to.equal('con1');

            return Promise.resolve([]);
          },
          getAll: () => [ { id: 'con1', name: 'existingConnection', strategy: 'custom' } ]
        },
        clients: {
          getAll: () => []
        },
        pool
      };

      const handler = new connections.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = [
        {
          name: 'someConnection',
          strategy: 'custom'
        }
      ];

      await stageFn.apply(handler, [ { connections: data } ]);
    });

    it('should not remove if it is not allowed by config', async () => {
      config.data.AUTH0_ALLOW_CONNECTION_DELETE = false;
      const auth0 = {
        connections: {
          create: data => Promise.resolve(data),
          update: () => Promise.resolve([]),
          delete: (params) => {
            expect(params).to.be.an('undefined');
            return Promise.resolve([]);
          },
          getAll: () => [ { id: 'con1', name: 'existingConnection', strategy: 'custom' } ]
        },
        clients: {
          getAll: () => []
        },
        pool
      };

      const handler = new connections.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = [
        {
          name: 'someConnection',
          strategy: 'custom'
        }
      ];

      await stageFn.apply(handler, [ { connections: data } ]);
    });
  });
});
