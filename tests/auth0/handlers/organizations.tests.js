const { expect } = require('chai');
const organizations = require('../../../src/auth0/handlers/organizations');

const pool = {
  addEachTask: (data) => {
    if (data.data && data.data.length) {
      data.generator(data.data[0]);
    }
    return { promise: () => null };
  }
};

const sampleOrg = {
  id: '123',
  name: 'acme',
  display_name: 'Acme Inc'
};

const sampleConnection = {
  connection_id: 'con_123', assign_membership_on_login: true
};
const sampleConnection2 = {
  connection_id: 'con_456', assign_membership_on_login: false
};


describe('#organizations handler', () => {
  const config = function(key) {
    return config.data && config.data[key];
  };

  config.data = {
    AUTH0_ALLOW_DELETE: true
  };

  describe('#organizations validate', () => {
    it('should not allow same id', async () => {
      const handler = new organizations.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          id: '123',
          name: 'Acme'
        },
        {
          id: '123',
          name: 'Contoso'
        }
      ];

      try {
        await stageFn.apply(handler, [ { organizations: data } ]);
      } catch (err) {
        expect(err).to.be.an('object');
        expect(err.message).to.include('Only one rule must be defined for the same order number in a stage.');
      }
    });

    it('should not allow same names', async () => {
      const handler = new organizations.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'Acme'
        },
        {
          name: 'Acme'
        }
      ];

      try {
        await stageFn.apply(handler, [ { organizations: data } ]);
      } catch (err) {
        expect(err).to.be.an('object');
        expect(err.message).to.include('Names must be unique');
      }
    });

    it('should pass validation', async () => {
      const handler = new organizations.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'Acme'
        }
      ];

      await stageFn.apply(handler, [ { organizations: data } ]);
    });
  });

  describe('#organizations process', () => {
    it('should return empty if no organization asset', async () => {
      const auth0 = {
        organizations: {
        },
        pool
      };

      const handler = new organizations.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const response = await stageFn.apply(handler, [ { } ]);
      expect(response).to.equal(undefined);
    });

    it('should create organization', async () => {
      const auth0 = {
        organizations: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('acme');
            expect(data.display_name).to.equal('Acme');
            expect(data.connections).to.equal(undefined);
            data.id = 'fake';
            return Promise.resolve(data);
          },
          update: () => Promise.resolve([]),
          delete: () => Promise.resolve([]),
          getAll: () => Promise.resolve({ organizations: [], total: 0, limit: 50 }),
          addEnabledConnection: (org, connection) => {
            expect(org.id).to.equal('fake');
            expect(connection).to.be.an('object');
            expect(connection.connection_id).to.equal('123');
            expect(connection.assign_membership_on_login).to.equal(true);
            return Promise.resolve(connection);
          }
        },
        pool
      };

      const handler = new organizations.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      await stageFn.apply(handler, [
        {
          organizations: [
            {
              name: 'acme',
              display_name: 'Acme',
              connections: [
                {
                  connection_id: '123',
                  assign_membership_on_login: true
                }
              ]
            }
          ]
        }
      ]);
    });

    it('should get organizations', async () => {
      const auth0 = {
        organizations: {
          getAll: () => Promise.resolve({
            organizations: [
              sampleOrg
            ],
            total: 1,
            limit: 50
          }),
          connections: {
            get: () => [
              sampleConnection
            ]
          }
        },
        pool
      };

      const handler = new organizations.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal([ Object.assign({}, sampleOrg, { connections: [ sampleConnection ] }) ]);
    });

    it('should get all organizations', async () => {
      const organizationsPage1 = Array.from({ length: 50 }, (v, i) => ({ name: 'acme' + i, display_name: 'Acme ' + i }));
      const organizationsPage2 = Array.from({ length: 40 }, (v, i) => ({ name: 'acme' + (i + 50), display_name: 'Acme ' + (i + 50) }));

      const auth0 = {
        organizations: {
          getAll: data => Promise.resolve({
            organizations: data.page ? organizationsPage2 : organizationsPage1,
            total: 90,
            limit: 50
          }),
          connections: {
            get: () => Promise.resolve({})
          }
        },
        pool
      };

      const handler = new organizations.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.have.length(90);
    });

    it('should return an empty array for old versions of the sdk', async () => {
      const auth0 = {
        pool
      };

      const handler = new organizations.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal([]);
    });

    it('should return an empty array for 501 status code', async () => {
      const auth0 = {
        organizations: {
          getAll: () => {
            const error = new Error('Feature is not yet implemented');
            error.statusCode = 501;
            throw error;
          }
        },
        pool
      };

      const handler = new organizations.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal([]);
    });

    it('should return an empty array for 404 status code', async () => {
      const auth0 = {
        organizations: {
          getAll: () => {
            const error = new Error('Not found');
            error.statusCode = 404;
            throw error;
          }
        },
        pool
      };

      const handler = new organizations.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal([]);
    });

    it('should throw an error for all other failed requests', async () => {
      const auth0 = {
        organizations: {
          getAll: () => {
            const error = new Error('Bad request');
            error.statusCode = 500;
            throw error;
          }
        },
        pool
      };

      const handler = new organizations.default({ client: auth0, config });
      try {
        await handler.getType();
      } catch (error) {
        expect(error).to.be.an.instanceOf(Error);
      }
    });

    it('should call getAll once', async () => {
      let shouldThrow = false;
      const auth0 = {
        organizations: {
          getAll: () => {
            if (!shouldThrow) {
              return {
                organizations: [ sampleOrg ],
                total: 1,
                limit: 50
              };
            }

            throw new Error('Unexpected');
          },
          connections: {
            get: () => Promise.resolve([])
          }
        },
        pool
      };

      const handler = new organizations.default({ client: auth0, config });
      let data = await handler.getType();
      expect(data).to.deep.equal([ sampleOrg ]);

      shouldThrow = true;
      data = await handler.getType();
      expect(data).to.deep.equal([ sampleOrg ]);
    });

    it('should update organizations', async () => {
      const auth0 = {
        organizations: {
          create: () => Promise.resolve([]),
          update: (params, data) => {
            expect(params).to.be.an('object');
            expect(params.id).to.equal('123');
            expect(data.display_name).to.equal('Acme 2');
            return Promise.resolve(data);
          },
          delete: () => Promise.resolve([]),
          getAll: () => Promise.resolve({
            organizations: [
              sampleOrg
            ],
            total: 1,
            limit: 50
          }),
          connections: {
            get: () => [
              sampleConnection,
              sampleConnection2
            ]
          },
          addEnabledConnection: (params, data) => {
            expect(params).to.be.an('object');
            expect(params.id).to.equal('123');
            expect(data).to.be.an('object');
            expect(data.connection_id).to.equal('con_789');
            expect(data.assign_membership_on_login).to.equal(false);
            return Promise.resolve(data);
          },
          removeEnabledConnection: (params) => {
            expect(params).to.be.an('object');
            expect(params.id).to.equal('123');
            expect(params.connection_id).to.equal(sampleConnection2.connection_id);
            return Promise.resolve();
          },
          updateEnabledConnection: (params, data) => {
            expect(params).to.be.an('object');
            expect(params.id).to.equal('123');
            expect(params.connection_id).to.equal(sampleConnection.connection_id);
            expect(data).to.be.an('object');
            expect(data.assign_membership_on_login).to.equal(false);
            return Promise.resolve(data);
          }
        },
        pool
      };

      const handler = new organizations.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [
        {
          organizations: [
            {
              id: '123',
              name: 'acme',
              display_name: 'Acme 2',
              connections: [
                { connection_id: 'con_123', assign_membership_on_login: false },
                { connection_id: 'con_789', assign_membership_on_login: false }
              ]
            }
          ]
        }
      ]);
    });

    it('should delete organizations', async () => {
      const auth0 = {
        organizations: {
          create: () => Promise.resolve([]),
          update: () => Promise.resolve([]),
          delete: (data) => {
            expect(data).to.be.an('object');
            expect(data.id).to.equal(sampleOrg.id);
            return Promise.resolve(data);
          },
          getAll: () => Promise.resolve({
            organizations: [
              sampleOrg
            ],
            total: 1,
            limit: 50
          }),
          connections: {
            get: () => []
          }
        },
        pool
      };
      const handler = new organizations.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      await stageFn.apply(handler, [ { organizations: [ {} ] } ]);
    });
  });
});
