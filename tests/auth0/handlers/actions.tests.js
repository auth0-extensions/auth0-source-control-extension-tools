const { expect } = require('chai');
const actions = require('../../../src/auth0/handlers/actions');

const pool = {
  addEachTask: (data) => {
    if (data.data && data.data.length) {
      data.generator(data.data[0]);
    }
    return { promise: () => null };
  }
};

describe('#actions handler', () => {
  const config = function(key) {
    return config.data && config.data[key];
  };

  config.data = {
    AUTH0_ALLOW_DELETE: true
  };

  describe('#Actions validate', () => {
    it('should not allow same names', (done) => {
      const auth0 = {
        actions: {
          getAll: () => []
        }
      };

      const handler = new actions.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'actions-one',
          supported_triggers: [ {
            id: 'post-login',
            version: 'v1'
          } ],
        },
        {
          name: 'actions-one',
          supported_triggers: [ {
            id: 'credentials-exchange',
            version: 'v1'
          } ]
        }
      ];

      stageFn.apply(handler, [ { actions: data } ])
        .then(() => done(new Error('Expecting error')))
        .catch((err) => {
          expect(err).to.be.an('object');
          expect(err.message).to.include('Names must be unique');
          done();
        });
    });

    it('should pass validation', async () => {
      const auth0 = {
        actions: {
          getAll: () => []
        }
      };

      const handler = new actions.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).validate;
      const data = [
        {
          name: 'action-one',
          supported_triggers: [ {
            id: 'post-login',
            version: 'v1'
          } ],
          current_version: {
            code: 'some code',
            dependencies: [],
            secrets: [],
            runtime: 'node12'
          }
        },
        {
          name: 'action-two',
          supported_triggers: [ {
            id: 'post-login',
            version: 'v1'
          } ],
          current_version: {
            code: '/** @type {PostLoginAction} */\nmodule.exports = async (event, context) => {\n    console.log(\'new version\');\n    return {};\n  };\n  ',
            dependencies: [],
            secrets: [],
            runtime: 'node12'
          },
          bindings: [ { trigger_id: 'post-login' } ]
        }
      ];

      await stageFn.apply(handler, [ { actions: data } ]);
    });
  });

  describe('#action process', () => {
    it('should create action', async () => {

      const version = {
        code: 'action-code',
        dependencies: [],
        id: 'version-id',
        runtime: 'node12',
        secrets: []
      }

      const actionId = 'new-action-id';
      const action = {
        name: 'action-test',
        supported_triggers: [ {
          id: 'post-login',
          version: 'v1'
        } ],
        current_version: {
          code: 'some code',
          dependencies: [],
          secrets: [],
          runtime: 'node12'
        }
      };

      const auth0 = {
        actions: {
          get: (params) => {
            expect(params.id).to.equal(actionId);
            return Promise.resolve({ ...action, id: actionId });
          },
          create: (data) => {
            expect(data).to.be.an('object');
            expect(data.name).to.equal('action-test');
            expect(data.supported_triggers[0].id).to.equal('post-login');
            expect(data.supported_triggers[0].version).to.equal('v1');
            return Promise.resolve({ ...data, id: actionId });
          },
          update: () => Promise.resolve([]),
          delete: () => Promise.resolve([]),
          getAll: () => {
            if (!auth0.getAllCalled) {
              auth0.getAllCalled = true;
              return Promise.resolve({ actions: [] });
            }

            return Promise.resolve({ actions: [ { name: action.name, supported_triggers: action.supported_triggers, id: actionId } ] });
          }
        },
        actionVersions: {
          create: () => Promise.resolve(version),
          upsertDraft: () => Promise.resolve(version),
        }, 
        actionBindings: {
          getAll: () => Promise.resolve({ bindings: [] }),
          create: () =>
            Promise.resolve({
              id: '35409a5b-0326-4e81-ad9b-ac19502cee58',
              trigger_id: 'post-login',
              created_at: '2020-12-08T21:26:21.982298158Z',
              updated_at: '2020-12-08T21:26:21.982298158Z',
              display_name: 'action-test',
            }),
        },
        pool,
        getAllCalled: false
      };

      const handler = new actions.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { actions: [ action ] } ]);
    });

    it('should get actions', async () => {
      const code = 'action-code';

      const version = {
        code: code,
        dependencies: [],
        id: 'version-id',
        runtime: 'node12',
        secrets: []
      }

      const actionsData = [
        {
          id: 'action-id-1',
          name: 'action-test-1',
          supported_triggers: [
            {
              id: 'post-login',
              version: 'v1'
            }
          ],
          current_version: { id: version.id },
          bindings: []
        }
      ];

      const auth0 = {
        actions: {
          getAll: () => Promise.resolve({ actions: actionsData })
        },
        actionVersions: {
          get: (params) => {
            expect(params.action_id).to.equal('action-id-1');
            expect(params.version_id).to.equal('version-id');
            return Promise.resolve(version);
          }
        }
      };

      const handler = new actions.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal([ { ...actionsData[0], current_version: version } ]);
    });

    it('should return an empty array for 501 status code', async () => {
      const auth0 = {
        actions: {
          getAll: () => {
            const error = new Error('Feature is not yet implemented');
            error.statusCode = 501;
            throw error;
          }
        },
        pool
      };

      const handler = new actions.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal([]);
    });

    it('should return an empty array for 404 status code', async () => {
      const auth0 = {
        actions: {
          getAll: () => {
            const error = new Error('Not found');
            error.statusCode = 404;
            throw error;
          }
        },
        pool
      };

      const handler = new actions.default({ client: auth0, config });
      const data = await handler.getType();
      expect(data).to.deep.equal([]);
    });

    it('should throw an error for all other failed requests', async () => {
      const auth0 = {
        actions: {
          getAll: () => {
            const error = new Error('Bad request');
            error.statusCode = 500;
            throw error;
          }
        },
        pool
      };

      const handler = new actions.default({ client: auth0, config });
      try {
        await handler.getType();
      } catch (error) {
        expect(error).to.be.an.instanceOf(Error);
      }
    });


    it('should update action creating binding', async () => {
      const action = {
        name: 'action-test',
        supported_triggers: [ {
          id: 'post-login',
          version: 'v1'
        } ],
        current_version: {
          code: '/** @type {PostLoginAction} */\nmodule.exports = async (event, context) => {\n    console.log(\'new version\');\n    return {};\n  };\n  ',
          dependencies: [],
          secrets: [],
          runtime: 'node12'
        },
        bindings: [ { trigger_id: 'post-login' } ]
      };

      const auth0 = {
        actions: {
          create: () => Promise.resolve([]),
          update: () => Promise.resolve([]),
          delete: () => Promise.resolve([]),
          getAll: () => Promise.resolve({
            actions: [
              {
                id: '1',
                name: 'action-test',
                supported_triggers: [
                  {
                    id: 'post-login',
                    version: 'v1',
                    },
                  ],
                current_version: {
                  code: '/** @type {PostLoginAction} */\nmodule.exports = async (event, context) => {\n    console.log(\'new version\');\n    return {};\n  };\n  ',
                  dependencies: [],
                  secrets: [],
                  runtime: 'node12'
                },
                },
              ],
            }),
        },
        actionBindings: {
          getAll: () => Promise.resolve({ bindings: [] }),
          updateList: () => Promise.resolve(),
        },
        actionVersions: {
          get: () => Promise.resolve({ 
            action: {},
            code:
             '/** @type {PostLoginAction} */\nmodule.exports = async (event, context) => {\n    console.log(\'new version\');\n    return {};\n  };\n  ',
            dependencies: [],
            runtime: 'node12',
            id: '0906fe5b-f4d6-44ec-a8f1-3c05fc186483',
            deployed: true,
            number: 1,
            built_at: '2020-12-03T15:20:54.413725492Z',
            status: 'built',
            created_at: '2020-12-03T15:20:52.094497448Z',
            updated_at: '2020-12-03T15:20:54.415669983Z' })
        },
        createActionBinding: () =>
            Promise.resolve({
              id: '35409a5b-0326-4e81-ad9b-ac19502cee58',
              trigger_id: 'post-login',
              created_at: '2020-12-08T21:26:21.982298158Z',
              updated_at: '2020-12-08T21:26:21.982298158Z',
              display_name: 'action-test',
            }),
        pool,
      };

      const handler = new actions.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { actions: [ action ] } ]);

    });

    it('should remove action', async () => {
      const auth0 = {
        actions: {
          create: () => Promise.resolve([]),
          update: () => Promise.resolve([]),
          delete: (data) => {
            expect(data).to.be.an('object');
            expect(data.id).to.equal('action-1');
            return Promise.resolve(data);
          },
          getAll: () => Promise.resolve({
            actions: [
              {
                id: 'action-1',
                name: 'action-test',
                supported_triggers: [
                  {
                    id: 'post-login',
                    version: 'v1',
                    },
                  ]
                },
              ],
            }),
        },
        actionBindings: {
          getAll: () => Promise.resolve({
            bindings: [ {
              id: '35409a5b-0326-4e81-ad9b-ac19502cee58',
              trigger_id: 'post-login',
              display_name: 'action-test',
            } ]
          }),
          delete: (data) => {
            expect(data).to.be.an('object');
            expect(data.id).to.equal('35409a5b-0326-4e81-ad9b-ac19502cee58');
            expect(data.trigger_id).to.equal('post-login');
            return Promise.resolve(data);
          },
        },
        actionVersions: {
          get: () => Promise.resolve({ 
            action: {},
            code:
             '/** @type {PostLoginAction} */\nmodule.exports = async (event, context) => {\n    console.log(\'new version\');\n    return {};\n  };\n  ',
            dependencies: [],
            runtime: 'node12',
            id: '0906fe5b-f4d6-44ec-a8f1-3c05fc186483',
            deployed: true,
            number: 1,
            built_at: '2020-12-03T15:20:54.413725492Z',
            status: 'built',
            created_at: '2020-12-03T15:20:52.094497448Z',
            updated_at: '2020-12-03T15:20:54.415669983Z' })
        },
        pool
      };

      const handler = new actions.default({ client: auth0, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ { action: [] } ]);
    });

    // // excluded hooks are not yet implemented
    // it.skip('should not touch excluded hooks', async () => {
    //   const auth0 = {
    //     hooks: {
    //       create: (data) => {
    //         expect(data).to.be.an('undefined');
    //         return Promise.resolve(data);
    //       },
    //       update: (data) => {
    //         expect(data).to.be.an('undefined');
    //         return Promise.resolve(data);
    //       },
    //       delete: (data) => {
    //         expect(data).to.be.an('undefined');
    //         return Promise.resolve(data);
    //       },
    //       getAll: () => [
    //         {
    //           id: '1', code: 'hook-one-code', name: 'Hook1', triggerId: 'credentials-exchange'
    //         },
    //         {
    //           id: '2', code: 'hook-two-code', name: 'Hook2', triggerId: 'credentials-exchange'
    //         }
    //       ]
    //     },
    //     pool
    //   };

    //   const handler = new hooks.default({ client: auth0, config });
    //   const stageFn = Object.getPrototypeOf(handler).processChanges;
    //   const data = {
    //     hooks: [
    //       { name: 'Hook1', code: 'new-hook-one-code', triggerId: 'credentials-exchange' },
    //       { name: 'Hook3', script: 'new-hook-three-code', triggerId: 'credentials-exchange' }
    //     ],
    //     exclude: {
    //       hooks: [
    //         'Hook1',
    //         'Hook2',
    //         'Hook3'
    //       ]
    //     }
    //   };

    //   await stageFn.apply(handler, [ data ]);
    // });

    // it('should update (create, delete) secrets', async () => {
    //   const hook = {
    //     id: '1',
    //     name: 'someHook',
    //     triggerId: 'credentials-exchange'
    //   };
    //   const existingSecrets = {
    //     TO_UPDATE_ONE: 'old secret - should be updated - 1',
    //     TO_UPDATE_TWO: 'old secret - should be updated - 2',
    //     TO_REMOVE_ONE: 'should be removed',
    //     TO_REMOVE_TWO: 'should be removed'
    //   };
    //   const createSecrets = {
    //     TO_CREATE_ONE: 'should be created - 1',
    //     TO_CREATE_TWO: 'should be created - 2'
    //   };
    //   const updateSecrets = {
    //     TO_UPDATE_ONE: 'updated - 1',
    //     TO_UPDATE_TWO: 'updated - 2'
    //   };
    //   const removeSecrets = [ 'TO_REMOVE_ONE', 'TO_REMOVE_TWO' ];
    //   const auth0 = {
    //     hooks: {
    //       create: () => Promise.resolve([]),
    //       update: (params, data) => {
    //         expect(params).to.be.an('object');
    //         expect(data).to.be.an('object');
    //         expect(params.id).to.equal(hook.id);
    //         expect(data.id).to.be.an('undefined');
    //         expect(data.code).to.equal('new-code');
    //         expect(data.name).to.equal('someHook');
    //         expect(data.triggerId).to.be.an('undefined');
    //         return Promise.resolve(data);
    //       },
    //       delete: () => Promise.resolve([]),
    //       getAll: () => [ hook ],
    //       get: (params) => {
    //         expect(params.id).to.equal(hook.id);
    //         return Promise.resolve({ ...hook, code: 'hook-code' });
    //       },
    //       getSecrets: (params) => {
    //         expect(params.id).to.equal(hook.id);
    //         return Promise.resolve(existingSecrets);
    //       },
    //       addSecrets: (params, data) => {
    //         expect(params.id).to.equal(hook.id);
    //         expect(data).to.be.an('object');
    //         expect(data).to.deep.equal(createSecrets);
    //         return Promise.resolve();
    //       },
    //       updateSecrets: (params, data) => {
    //         expect(params.id).to.equal(hook.id);
    //         expect(data).to.be.an('object');
    //         expect(data).to.deep.equal(updateSecrets);
    //         return Promise.resolve();
    //       },
    //       removeSecrets: (params, data) => {
    //         expect(params.id).to.equal(hook.id);
    //         expect(data).to.be.an('array');
    //         expect(data).to.deep.equal(removeSecrets);
    //         return Promise.resolve();
    //       }
    //     },
    //     pool
    //   };

    //   const handler = new hooks.default({ client: auth0, config });
    //   const stageFn = Object.getPrototypeOf(handler).processChanges;
    //   const assets = {
    //     hooks: [ {
    //       name: 'someHook',
    //       code: 'new-code',
    //       triggerId: 'credentials-exchange',
    //       secrets: {
    //         ...updateSecrets,
    //         ...createSecrets
    //       }
    //     } ]
    //   };

    //   await stageFn.apply(handler, [ assets ]);
    // });

    // it('should not update secret, if its value did not change', async () => {
    //   const hook = {
    //     id: '1',
    //     name: 'someHook',
    //     triggerId: 'credentials-exchange'
    //   };
    //   const existingSecrets = {
    //     SOME_SECRET: 'should remain the same'
    //   };
    //   const updateSecrets = {
    //     SOME_SECRET: constants.HOOKS_HIDDEN_SECRET_VALUE
    //   };
    //   const auth0 = {
    //     hooks: {
    //       create: () => Promise.resolve([]),
    //       update: (params, data) => {
    //         expect(params).to.be.an('object');
    //         expect(data).to.be.an('object');
    //         expect(params.id).to.equal(hook.id);
    //         expect(data.id).to.be.an('undefined');
    //         expect(data.code).to.equal('new-code');
    //         expect(data.name).to.equal('someHook');
    //         expect(data.triggerId).to.be.an('undefined');
    //         return Promise.resolve(data);
    //       },
    //       delete: () => Promise.resolve([]),
    //       getAll: () => [ hook ],
    //       get: (params) => {
    //         expect(params.id).to.equal(hook.id);
    //         return Promise.resolve({ ...hook, code: 'hook-code' });
    //       },
    //       getSecrets: (params) => {
    //         expect(params.id).to.equal(hook.id);
    //         return Promise.resolve(existingSecrets);
    //       },
    //       updateSecrets: (params) => {
    //         expect(params).to.equal(undefined);
    //         return Promise.reject(new Error('Should not be called'));
    //       }
    //     },
    //     pool
    //   };

    //   const handler = new hooks.default({ client: auth0, config });
    //   const stageFn = Object.getPrototypeOf(handler).processChanges;
    //   const assets = {
    //     hooks: [ {
    //       name: 'someHook',
    //       code: 'new-code',
    //       triggerId: 'credentials-exchange',
    //       secrets: updateSecrets
    //     } ]
    //   };

    //   await stageFn.apply(handler, [ assets ]);
    // });
  });
});
