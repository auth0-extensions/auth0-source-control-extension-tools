const { expect } = require('chai');
const roles = require('../../../src/auth0/handlers/roles');

const pool = {
  addEachTask: (data) => {
    if (data.data && data.data.length) {
      data.generator(data.data[0]);
    }
    return { promise: () => null };
  }
};

describe('#roles handler', () => {
  const config = function(key) {
    return config.data && config.data[key];
  };

  config.data = {
    AUTH0_CLIENT_ID: 'client_id',
    AUTH0_ALLOW_DELETE: true
  };

  describe('#roles validate', () => {
    it('should not allow same names', async () => {
      const handler = new roles.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'myRole'
        },
        {
          name: 'myRole'
        }
      ];

      try {
        await stageFn.apply(handler, [ { roles: data } ]);
      } catch (err) {
        expect(err).to.be.an('object');
        expect(err.message).to.include('Names must be unique');
      }
    });

    it('should pass validation', async () => {
      const handler = new roles.default({ client: {}, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'myRole'
        }
      ];

      await stageFn.apply(handler, [ { roles: data } ]);
    });
  });

  describe('#roles process', () => {
    it('should create role', async () => {
      const auth0 = {
        roles: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('myRole');
            expect(data.description).to.equal('myDescription');
            return Promise.resolve(data);
          },
          update: () => Promise.resolve([]),
          delete: () => Promise.resolve([]),
          getAll: () => [],
          get: () => ({ name: 'myRole', id: 'myRoleId', description: 'myDescription' }),
          permissions: {
            get: () => [
              { permission_name: 'Create:cal_entry', resource_server_identifier: 'organise' }
            ],
            create: (params, data) => {
              expect(params).to.be.an('object');
              expect(params.id).to.equal('myRoleId');
              expect(data).to.be.an('object');
              expect(data.permissions).to.not.equal(null);
              expect(data.permissions).to.be.an('Array');
              return Promise.resolve(data.permissions);
            },
            update: Promise.resolve([])
          }
        },
        pool
      };
      const handler = new roles.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      await stageFn.apply(handler, [
        {
          roles: [
            {
              name: 'myRole',
              id: 'myRoleId',
              description: 'myDescription',
              permissions: []
            }
          ]
        }
      ]);
    });

    it('should get roles', async () => {
      const auth0 = {
        roles: {
          getAll: () => [
            { name: 'myRole', id: 'myRoleId', description: 'myDescription' }
          ],
          get: () => ({ name: 'myRole', id: 'myRoleId', description: 'myDescription' }),
          permissions: {
            get: () => [
              { permission_name: 'Create:cal_entry', resource_server_identifier: 'organise' }
            ]
          }
        },
        pool
      };

      const handler = new roles.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal([
        {
          name: 'myRole',
          id: 'myRoleId',
          description: 'myDescription',
          permissions: [
            {
              permission_name: 'Create:cal_entry', resource_server_identifier: 'organise'
            }
          ]
        }
      ]);
    });

    it('should update role', async () => {
      const auth0 = {
        roles: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.length).to.equal(0);
            return Promise.resolve(data);
          },
          update: (params, data) => {
            expect(params).to.be.an('object');
            expect(params.id).to.equal('myRoleId');
            expect(data).to.be.an('object');
            expect(data.name).to.equal('myRole');
            expect(data.description).to.equal('myDescription');

            return Promise.resolve(data);
          },
          delete: () => Promise.resolve([]),
          getAll: () => [
            {
              name: 'myRole',
              id: 'myRoleId',
              description: 'myDescription'
            }
          ],
          permissions: {
            get: () => [
              { permission_name: 'Create:cal_entry', resource_server_identifier: 'organise' }
            ],
            getAll: () => [
              { permission_name: 'Create:cal_entry', resource_server_identifier: 'organise' }
            ],
            create: (params, data) => {
              expect(params).to.be.an('object');
              expect(params.id).to.equal('myRoleId');
              expect(data).to.be.an('object');
              expect(data.permissions).to.not.equal(null);
              expect(data.permissions).to.be.an('Array');
              return Promise.resolve(data);
            },
            delete: (params, data) => {
              expect(params).to.be.an('object');
              expect(params.id).to.equal('myRoleId');
              expect(data.permissions).to.be.an('Array');
              return Promise.resolve(data.permissions);
            }
          }

        },
        pool
      };

      const handler = new roles.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [
        {
          roles: [
            {
              name: 'myRole',
              id: 'myRoleId',
              description: 'myDescription',
              permissions: [
                {
                  permission_name: 'Create:cal_entry', resource_server_identifier: 'organise'
                }
              ]
            }
          ]
        }
      ]);
    });

    it('should delete role', async () => {
      const auth0 = {
        roles: {
          create: () => Promise.resolve([]),
          update: () => Promise.resolve([]),
          delete: (data) => {
            expect(data).to.be.an('object');
            expect(data.id).to.equal('myRoleId');
            return Promise.resolve(data);
          },
          getAll: () => [
            {
              name: 'myRole',
              id: 'myRoleId',
              description: 'myDescription',
              permissions: [
                {
                  permission_name: 'Create:cal_entry', resource_server_identifier: 'organise'
                }
              ]
            }
          ],
          permissions: {
            get: () => []
          }
        },
        pool
      };
      const handler = new roles.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      await stageFn.apply(handler, [ { roles: [ {} ] } ]);
    });
  });
});
