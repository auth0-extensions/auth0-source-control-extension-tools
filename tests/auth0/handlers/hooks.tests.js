const { expect } = require('chai');
const hooks = require('../../../src/auth0/handlers/hooks');

const pool = {
  addEachTask: (data) => {
    if (data.data && data.data.length) {
      data.generator(data.data[0]);
    }
    return { promise: () => null };
  }
};

describe('#hooks handler', () => {
  const config = function(key) {
    return config.data && config.data[key];
  };

  config.data = {
    AUTH0_ALLOW_DELETE: true
  };

  describe('#hooks validate', () => {
    it('should not allow same names', (done) => {
      const auth0 = {
        hooks: {
          getAll: () => []
        }
      };

      const handler = new hooks.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'newHook',
          code: 'code',
          triggerId: 'credentials-exchange'
        },
        {
          name: 'newHook',
          code: 'code',
          triggerId: 'credentials-exchange'
        }
      ];

      stageFn.apply(handler, [ { hooks: data } ])
        .then(() => done(new Error('Expecting error')))
        .catch((err) => {
          expect(err).to.be.an('object');
          expect(err.message).to.include('Names must be unique');
          done();
        });
    });

    it('should not allow more than one active hook for each triggerId', (done) => {
      const auth0 = {
        hooks: {
          getAll: () => []
        }
      };

      const handler = new hooks.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'Hook-1',
          code: 'code',
          active: true,
          triggerId: 'credentials-exchange'
        },
        {
          name: 'Hook-2',
          code: 'code',
          active: true,
          triggerId: 'credentials-exchange'
        }
      ];

      stageFn.apply(handler, [ { hooks: data } ])
        .then(() => done(new Error('Expecting error')))
        .catch((err) => {
          expect(err).to.be.an.instanceof(Error);
          expect(err.message).to.include('Only one active hook allowed for "credentials-exchange" extensibility point. Conflicting hooks: Hook-1, Hook-2');
          done();
        });
    });

    it('should pass validation', async () => {
      const auth0 = {
        hooks: {
          getAll: () => []
        }
      };

      const handler = new hooks.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'Hook-1',
          code: 'code',
          active: true,
          triggerId: 'credentials-exchange'
        },
        {
          name: 'Hook-2',
          code: 'code',
          active: true,
          triggerId: 'pre-user-registration'
        },
        {
          name: 'Hook-3',
          code: 'code',
          active: true,
          triggerId: 'post-user-registration'
        },
        {
          name: 'Hook-4',
          code: 'code',
          active: false,
          triggerId: 'pre-user-registration'
        },
        {
          name: 'Hook-5',
          code: 'code',
          active: false,
          triggerId: 'credentials-exchange'
        }
      ];

      await stageFn.apply(handler, [ { hooks: data } ]);
    });
  });

  describe('#hooks process', () => {
    it('should create hook', async () => {
      const auth0 = {
        hooks: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('Hook');
            expect(data.code).to.equal('code');
            expect(data.triggerId).to.equal('credentials-exchange');
            return Promise.resolve(data);
          },
          update: () => Promise.resolve([]),
          delete: () => Promise.resolve([]),
          getAll: () => []
        },
        pool
      };

      const handler = new hooks.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { hooks: [ { name: 'Hook', code: 'code', triggerId: 'credentials-exchange' } ] } ]);
    });

    it('should get hooks', async () => {
      const code = 'hook-code';

      const hooksData = [
        {
          id: 0, active: false, name: 'test-hook-1', triggerId: 'credentials-exchange'
        },
        {
          id: 1, active: true, name: 'test-hook-2', triggerId: 'credentials-exchange'
        }
      ];

      const auth0 = {
        hooks: {
          getAll: () => hooksData,
          get: ({ id }) => ({ ...hooksData[id], code })
        }
      };

      const handler = new hooks.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal(hooksData.map(hook => ({ ...hook, code })));
    });

    it('should update hook', async () => {
      const auth0 = {
        hooks: {
          create: () => Promise.resolve([]),
          update: (params, data) => {
            expect(params).to.be.an('object');
            expect(data).to.be.an('object');
            expect(params.id).to.equal('1');
            expect(data.id).to.be.an('undefined');
            expect(data.code).to.equal('code');
            expect(data.name).to.equal('someHook');
            expect(data.triggerId).to.equal('credentials-exchange');
            return Promise.resolve(data);
          },
          delete: () => Promise.resolve([]),
          getAll: () => [ {
            id: '1',
            name: 'someHook',
            triggerId: 'credentials-exchange'
          } ],
          get: () => ({
            id: '1',
            name: 'someHook',
            code: 'code',
            triggerId: 'credentials-exchange'
          })
        },
        pool
      };

      const handler = new hooks.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { hooks: [ { name: 'someHook', code: 'code', triggerId: 'credentials-exchange' } ] } ]);
    });

    it('should remove hook', async () => {
      const auth0 = {
        hooks: {
          create: () => Promise.resolve([]),
          update: () => Promise.resolve([]),
          delete: (data) => {
            expect(data).to.be.an('object');
            expect(data.id).to.equal('1');
            return Promise.resolve(data);
          },
          getAll: () => [ {
            id: '1',
            name: 'someHook',
            triggerId: 'credentials-exchange'
          } ],
          get: () => ({
            id: '1',
            name: 'someHook',
            code: 'code',
            triggerId: 'credentials-exchange'
          })
        },
        pool
      };

      const handler = new hooks.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { hooks: [ {} ] } ]);
    });

    it('should deactivate hooks', async () => {
      const auth0 = {
        hooks: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('Hook2');
            expect(data.code).to.equal('new-hook-code');
            expect(data.active).to.equal(true);
            expect(data.triggerId).to.equal('credentials-exchange');
            return Promise.resolve(data);
          },
          update: (params, data) => {
            expect(params).to.be.an('object');
            expect(data).to.be.an('object');
            expect(params.id).to.equal('1');
            expect(data.id).to.be.an('undefined');
            expect(data.code).to.equal('hook-one-code');
            expect(data.name).to.equal('Hook1');
            expect(data.active).to.equal(false);
            expect(data.triggerId).to.equal('credentials-exchange');
            return Promise.resolve(data);
          },
          delete: (data) => {
            expect(data).to.be.an('undefined');
            return Promise.resolve(data);
          },
          getAll: () => [
            {
              id: '1',
              name: 'Hook1',
              active: true,
              triggerId: 'credentials-exchange'
            }
          ],
          get: () => ({
            id: '1',
            name: 'Hook1',
            active: true,
            code: 'hook-one-code',
            triggerId: 'credentials-exchange'
          })
        },
        pool
      };

      config.data = {
        AUTH0_ALLOW_DELETE: false
      };

      const handler = new hooks.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = {
        hooks: [
          {
            name: 'Hook2',
            code: 'new-hook-code',
            active: true,
            triggerId: 'credentials-exchange'
          }
        ]
      };

      await stageFn.apply(handler, [ data ]);
    });

    it('should not deactivate hooks if new hook is not active', async () => {
      const auth0 = {
        hooks: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('Hook2');
            expect(data.code).to.equal('new-hook-code');
            expect(data.active).to.equal(false);
            expect(data.triggerId).to.equal('credentials-exchange');
            return Promise.resolve(data);
          },
          update: (params, data) => {
            expect(data).to.be.an('undefined');
          },
          delete: (data) => {
            expect(data).to.be.an('undefined');
            return Promise.resolve(data);
          },
          getAll: () => [
            {
              id: '1',
              name: 'Hook1',
              active: true,
              triggerId: 'credentials-exchange'
            }
          ],
          get: () => ({
            id: '1',
            name: 'Hook1',
            active: true,
            code: 'hook-one-code',
            triggerId: 'credentials-exchange'
          })
        },
        pool
      };

      config.data = {
        AUTH0_ALLOW_DELETE: false
      };

      const handler = new hooks.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = {
        hooks: [
          {
            name: 'Hook2',
            code: 'new-hook-code',
            active: false,
            triggerId: 'credentials-exchange'
          }
        ]
      };

      await stageFn.apply(handler, [ data ]);
    });

    it('should not deactivate hooks if new hook has different triggerId', async () => {
      const auth0 = {
        hooks: {
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('Hook2');
            expect(data.code).to.equal('new-hook-code');
            expect(data.active).to.equal(true);
            expect(data.triggerId).to.equal('pre-user-registration');
            return Promise.resolve(data);
          },
          update: (params, data) => {
            expect(data).to.be.an('undefined');
          },
          delete: (data) => {
            expect(data).to.be.an('undefined');
            return Promise.resolve(data);
          },
          getAll: () => [
            {
              id: '1',
              name: 'Hook1',
              active: true,
              triggerId: 'credentials-exchange'
            }
          ],
          get: () => ({
            id: '1',
            name: 'Hook1',
            active: true,
            code: 'hook-one-code',
            triggerId: 'credentials-exchange'
          })
        },
        pool
      };

      config.data = {
        AUTH0_ALLOW_DELETE: false
      };

      const handler = new hooks.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = {
        hooks: [
          {
            name: 'Hook2',
            code: 'new-hook-code',
            active: true,
            triggerId: 'pre-user-registration'
          }
        ]
      };

      await stageFn.apply(handler, [ data ]);
    });

    // excluded hooks are not yet implemented
    it.skip('should not touch excluded hooks', async () => {
      const auth0 = {
        hooks: {
          create: (data) => {
            expect(data).to.be.an('undefined');
            return Promise.resolve(data);
          },
          update: (data) => {
            expect(data).to.be.an('undefined');
            return Promise.resolve(data);
          },
          delete: (data) => {
            expect(data).to.be.an('undefined');
            return Promise.resolve(data);
          },
          getAll: () => [
            {
              id: '1', code: 'hook-one-code', name: 'Hook1', triggerId: 'credentials-exchange'
            },
            {
              id: '2', code: 'hook-two-code', name: 'Hook2', triggerId: 'credentials-exchange'
            }
          ]
        },
        pool
      };

      const handler = new hooks.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;
      const data = {
        hooks: [
          { name: 'Hook1', code: 'new-hook-one-code', triggerId: 'credentials-exchange' },
          { name: 'Hook3', script: 'new-hook-three-code', triggerId: 'credentials-exchange' }
        ],
        exclude: {
          hooks: [
            'Hook1',
            'Hook2',
            'Hook3'
          ]
        }
      };

      await stageFn.apply(handler, [ data ]);
    });
  });
});
