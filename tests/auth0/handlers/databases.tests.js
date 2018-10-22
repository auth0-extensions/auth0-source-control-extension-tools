const { expect } = require('chai');
const databases = require('../../../src/auth0/handlers/databases');

const pool = {
  addEachTask: (data) => {
    if (data.data && data.data.length) {
      data.generator(data.data[0]);
    }
    return { promise: () => null };
  }
};

describe('#databases handler', () => {
  const config = function(key) {
    return config.data && config.data[key];
  };

  config.data = {
    AUTH0_CLIENT_ID: 'client_id',
    AUTH0_ALLOW_CONNECTION_DELETE: true
  };

  describe('#databases validate', () => {
    it('should not allow same names', async () => {
      const handler = new databases.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'someDatabase'
        },
        {
          name: 'someDatabase'
        }
      ];

      try {
        await stageFn.apply(handler, [ { databases: data } ]);
      } catch (err) {
        expect(err).to.be.an('object');
        expect(err.message).to.include('Names must be unique');
      }
    });

    it('should pass validation', async () => {
      const handler = new databases.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;

      await stageFn.apply(handler, [ { databases: [ { name: 'someDatabase' } ] } ]);
    });
  });

  describe('#databases process', () => {
    it('should create database', async () => {
      const auth0 = {
        connections: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('someDatabase');
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

      const handler = new databases.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { databases: [ { name: 'someDatabase' } ] } ]);
    });

    it('should get databases', async () => {
      const clientId = 'rFeR6vyzQcDEgSUsASPeF4tXr3xbZhxE';
      const auth0 = {
        connections: {
          getAll: () => [
            { strategy: 'auth0', name: 'db', enabled_clients: [ clientId ] }
          ]
        },
        clients: {
          getAll: () => [
            { name: 'test client', client_id: clientId }
          ]
        },
        pool
      };

      const handler = new databases.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal([ { strategy: 'auth0', name: 'db', enabled_clients: [ clientId ] } ]);
    });

    it('should update database', async () => {
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
          getAll: () => [ { name: 'someDatabase', id: 'con1', strategy: 'auth0' } ]
        },
        clients: {
          getAll: () => []
        },
        pool
      };

      const handler = new databases.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = [
        {
          name: 'someDatabase',
          strategy: 'auth0',
          options: { passwordPolicy: 'testPolicy' }
        }
      ];

      await stageFn.apply(handler, [ { databases: data } ]);
    });

    it('should delete database and create another one instead', async () => {
      const auth0 = {
        connections: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('someDatabase');
            return Promise.resolve(data);
          },
          update: () => Promise.resolve([]),
          delete: (params) => {
            expect(params).to.be.an('object');
            expect(params.id).to.equal('con1');

            return Promise.resolve([]);
          },
          getAll: () => [ { id: 'con1', name: 'existingConnection', strategy: 'auth0' } ]
        },
        clients: {
          getAll: () => []
        },
        pool
      };

      const handler = new databases.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = [
        {
          name: 'someDatabase',
          strategy: 'custom'
        }
      ];

      await stageFn.apply(handler, [ { databases: data } ]);
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
          getAll: () => [ { id: 'con1', name: 'existingConnection', strategy: 'auth0' } ]
        },
        clients: {
          getAll: () => []
        },
        pool
      };

      const handler = new databases.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = [
        {
          name: 'someDatabase',
          strategy: 'custom'
        }
      ];

      await stageFn.apply(handler, [ { databases: data } ]);
    });
  });
});
