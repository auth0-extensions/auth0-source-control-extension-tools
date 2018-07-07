const _ = require('lodash');
const expect = require('chai').expect;
const Promise = require('bluebird');
const resourceServers = require('../../src/auth0/resourceServers');

function check(done, f) {
  try {
    f();
    done();
  } catch (e) {
    done(e);
  }
}


describe('#resourceServers', () => {
  let auth0;
  let progress;
  let updateFilters;
  let updatePayloads;

  const resourceServerConfigs = {
    'Some ResourceServer Name abcd': {
      configFile: '{ "identifier": "urn:some:backend", "scopes": ["scope1", "scope2"], "signing_alg": "RS256", "signing_secret": "some secret value for signing", "token_lifetime": 4}'
    },
    'Some ResourceServer Name ijkl': {
      configFile: '{ "identifier": "urn:some:backend_ijkl", "scopes": ["scope3", "scope4"] }',
      metadata: true,
      metadataFile: '{ }'
    }
  };

  const existingNonGlobalResourceServers = [
    {
      id: 'AaiyAPdpYdesoKnqjj8HJqRn4T5titcd',
      name: 'Some ResourceServer Name abcd',
      identifier: 'urn:auth0:test:abcd',
      scopes: [
        { value: 'thing1' },
        { value: 'thing2' }
      ],
      signing_alg: 'RS256',
      token_lifetime: 500,
      allow_offline_access: false,
      skip_consent_for_verifiable_first_party_clients: false,
      is_system: false
    },
    {
      id: 'AaiyAPdpYdesoKnqjj8HJqRn4T5titef',
      name: 'Some ResourceServer Name efgh',
      identifier: 'urn:auth0:test:efgh',
      scopes: [
        { value: 'foo1' },
        { value: 'bar1' }
      ],
      signing_alg: 'RS256',
      token_lifetime: 1500,
      allow_offline_access: true,
      skip_consent_for_verifiable_first_party_clients: false,
      is_system: false
    },
    {
      id: 'AaiyAPdpYdesoKnqjj8HJqRn4T5titqr',
      name: 'Some ResourceServer Name qrst',
      identifier: 'urn:auth0:test:qrst',
      scopes: [
        { value: 'foo' },
        { value: 'bar' }
      ],
      signing_alg: 'RS256',
      token_lifetime: 1500,
      allow_offline_access: true,
      skip_consent_for_verifiable_first_party_clients: true,
      is_system: false
    }
  ];

  const existingResourceServers = _.concat(existingNonGlobalResourceServers, [
    {
      id: '581a46a5a5d3eb705225a537',
      name: 'Auth0 Management API',
      identifier: 'https://mostekcm-auto-deploy.auth0.com/api/v2/',
      scopes: [
        { value: 'read:client_grants' },
        { value: 'create:client_grants' },
        { value: 'delete:client_grants' }
      ],
      signing_alg: 'RS256',
      token_lifetime: 86400,
      allow_offline_access: false,
      skip_consent_for_verifiable_first_party_clients: false,
      is_system: true
    }
  ]);

  beforeEach(() => {
    auth0 = {
      resourceServers: {
        create(payload) {
          if (payload.name === 'broken-file') {
            return Promise.reject(new Error('ERROR'));
          }

          updatePayloads.push(payload);
          return Promise.resolve();
        },
        update(filter, payload) {
          updateFilters.push(filter);
          updatePayloads.push(payload);
          return Promise.resolve();
        },
        // Uncomment me when we are actually deleting: delete(filter, payload) {
        //   updateFilters.push(filter);
        //   updatePayloads.push(payload);
        //   return Promise.resolve();
        // },
        getAll(options) {
          var returnResourceServers = options && options.is_system === false ? existingNonGlobalResourceServers : existingResourceServers;
          return Promise.resolve(returnResourceServers);
        }
      }
    };
    updateFilters = [];
    updatePayloads = [];
    progress = {
      log: () => {

      },
      date: new Date(),
      connectionsUpdated: 0,
      configurables: {
        resourceServers: {
          created: 0,
          updated: 0,
          deleted: 0
        }
      },
      error: null
    };
  });

  describe('#getResourceServers', () => {
    it('should return cached resourceServers', (done) => {
      progress.resourceServers = existingResourceServers;

      resourceServers.getResourceServers(progress)
        .then((r) => {
          check(done, function() {
            expect(r).to.deep.equal(existingResourceServers);
          });
        });
    });

    it('should call auth0 and get the resourceServers', (done) => {
      progress.resourceServers = undefined;
      resourceServers.getResourceServers(progress, auth0)
        .then((records) => {
          check(done, function() {
            expect(records).to.deep.equal(existingNonGlobalResourceServers);
          });
        });
    });
  });

  describe('#updateResourceServers', () => {
    it('should not run if the repository does not contain any resourceServers', (done) => {
      if ('adds' in progress.configurables.resourceServers) delete progress.configurables.resourceServers.adds;
      if ('updates' in progress.configurables.resourceServers) delete progress.configurables.resourceServers.updates;
      if ('created' in progress.configurables.resourceServers) delete progress.configurables.resourceServers.created;
      if ('updated' in progress.configurables.resourceServers) delete progress.configurables.resourceServers.updated;

      resourceServers.updateResourceServers(progress, auth0)
        .then(() => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(progress.configurables.resourceServers.created).to.not.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(progress.configurables.resourceServers.updated).to.not.exist;
          });
        });
    });

    it('should create new resourceServers correctly', (done) => {
      progress.configurables.resourceServers.adds = resourceServerConfigs;

      const responsePayload = [
        JSON.parse(resourceServerConfigs['Some ResourceServer Name abcd'].configFile),
        JSON.parse(resourceServerConfigs['Some ResourceServer Name ijkl'].configFile)
      ];
      responsePayload[0].name = 'Some ResourceServer Name abcd';
      responsePayload[1].name = 'Some ResourceServer Name ijkl';

      resourceServers.updateResourceServers(progress, auth0)
        .then(() => {
          check(done, function() {
            expect(Object.keys(progress.configurables.resourceServers.adds).length).to.equal(2);
            expect(progress.configurables.resourceServers.created).to.equal(2);
            expect(updatePayloads).to.deep.equal(responsePayload);
          });
        })
        .catch(function(err) {
          done(err);
        });
    });

    it('should update existing resourceServers correctly', (done) => {
      const update1 = { scopes: [ 'scope1' ] };
      const update2 = {
        scopes: [
          { value: 'foo' },
          { value: 'bar' }
        ]
      };
      const updateConfig2 = {
        allow_offline_access: true,
        scopes: [
          { value: 'foo' },
          { value: 'bar' }
        ]
      };

      progress.configurables.resourceServers.updates = {
        'Some ResourceServer Name abcd': {
          existing: existingNonGlobalResourceServers[0],
          config: {
            configFile: JSON.stringify(update1)
          }
        },
        /* Should skip part of this second one because app_type is already spa */
        'Some ResourceServer Name efgh': {
          existing: existingNonGlobalResourceServers[1],
          config: {
            configFile: JSON.stringify(updateConfig2)
          }
        },
        /* Should skip this entire update */
        'Some ResourceServer Name qrst': {
          existing: existingNonGlobalResourceServers[2],
          config: {
            configFile: JSON.stringify(update2)
          }
        }
      };
      progress.configurables.resourceServers.idName = 'id';

      const responseFilters = [
        { id: 'AaiyAPdpYdesoKnqjj8HJqRn4T5titcd' },
        { id: 'AaiyAPdpYdesoKnqjj8HJqRn4T5titef' }
      ];

      const responsePayloads = [
        update1,
        update2
      ];

      resourceServers.updateResourceServers(progress, auth0)
        .then(() => {
          check(done, function() {
            expect(Object.keys(progress.configurables.resourceServers.updates).length).to.equal(3);
            expect(progress.configurables.resourceServers.updated).to.equal(2);
            expect(updateFilters).to.deep.equal(responseFilters);
            expect(updatePayloads).to.deep.equal(responsePayloads);
          });
        })
        .catch(function(err) {
          done(err);
        });
    });
  });

  describe('#validateResourceServers', () => {
    it('should not run if the repository does not contain any resourceServers', (done) => {
      resourceServers.validateResourceServers(progress, auth0, { })
        .then(() => {
          done();
        });
    });

    it('should return error if config is missing the config file', (done) => {
      const filesWithError = {
        'my-resourceServer': {
        }
      };

      resourceServers.validateResourceServers(progress, auth0, filesWithError)
        .catch((err) => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(err).to.exist;
            expect(err.message).to.equal('The following resourceServers have no config file: my-resourceServer');
          });
        });
    });

    it('should return error if file contains a name that matches the Auth0 Management API', (done) => {
      const filesWithError = {
        'Auth0 Management API': {
          configFile: '{ "name": "Auth0 Management API" }'
        }
      };

      resourceServers.validateResourceServers(progress, auth0, filesWithError)
        .catch((err) => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(err).to.exist;
            expect(err.message).to.equal('You can not configure the Auth0 Management API.');
          });
        });
    });


    it('should return error if file contains a name that does not match the directory name', (done) => {
      const filesWithError = {
        'my-resourceServer': {
          configFile: '{ "name": "someothername" }'
        },
        'my-resourceServer2': {
          configFile: '{  }'
        }
      };

      resourceServers.validateResourceServers(progress, auth0, filesWithError)
        .catch((err) => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(err).to.exist;
            expect(err.message).to.equal('The following resourceServers have key names that do not match the configured name in the configFile: my-resourceServer');
          });
        });
    });


    it('check resourceServers to add', (done) => {
      const newResourceServers = {
        'my-new-resourceServer': {
          configFile: '{ "name": "my-new-resourceServer" }'
        },
        'my-new-resourceServer2': {
          configFile: '{ "name": "my-new-resourceServer2" }'
        }
      };

      resourceServers.validateResourceServers(progress, auth0, newResourceServers)
        .then(() => {
          check(done, function() {
            // should be in add bucket
            expect(progress.configurables.resourceServers.adds).to.deep.equal(newResourceServers);
          });
        });
    });

    it('check resourceServers to delete', (done) => {
      const newResourceServers = {
        'my-new-resourceServer': {
          configFile: '{ "name": "my-new-resourceServer" }'
        },
        'my-new-resourceServer2': {
          configFile: '{ "name": "my-new-resourceServer2" }'
        }
      };

      resourceServers.validateResourceServers(progress, auth0, newResourceServers)
        .then(() => {
          check(done, function() {
            // should be in delete bucket
            expect(progress.configurables.resourceServers.deletes).to.deep.equal([ 'Some ResourceServer Name abcd', 'Some ResourceServer Name efgh', 'Some ResourceServer Name qrst' ]);
          });
        });
    });

    it('check resourceServers to update', (done) => {
      const resourceServerConfig = {
        'Some ResourceServer Name abcd': {
          configFile: '{ "name": "Some ResourceServer Name abcd" }'
        },
        'my-new-resourceServer2': {
          configFile: '{ "name": "my-new-resourceServer2" }'
        }
      };

      const updateResourceServers = {
        'Some ResourceServer Name abcd': {
          existing: existingNonGlobalResourceServers[0],
          config: resourceServerConfig['Some ResourceServer Name abcd']
        }
      };

      resourceServers.validateResourceServers(progress, auth0, resourceServerConfig, 'AaiyAPdpYdesoKnqjj8HJqRn4T5titab')
        .then(() => {
          check(done, function() {
            // should be in delete bucket
            expect(progress.configurables.resourceServers.updates).to.deep.equal(updateResourceServers);
          });
        });
    });
  });
});
