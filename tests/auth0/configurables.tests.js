const _ = require('lodash');
const expect = require('chai').expect;
const Promise = require('bluebird');
const configurables = require('../../src/auth0/configurables');

function check(done, f) {
  try {
    f();
    done();
  } catch (e) {
    done(e);
  }
}

describe('#configurables', () => {
  let auth0;
  let progress;
  let updateFilters;
  let updatePayloads;

  const clientConfigs = {
    'Some Client Name abcd': {
      configFile: '{ "client_id": "AaiyAPdpYdesoKnqjj8HJqRn4T5titcd", "client_secret": "somesecretvalu2", "app_type": "", "logo_uri": "", "is_first_party": false, "oidc_conformant": false, "global": false}',
      metadataFile: '{ }'
    },
    'Some Client Name ijkl': {
      configFile: '{ "app_type": "spa", "logo_uri": "", "is_first_party": true, "callbacks": [ "http://localhost/callback" ] }',
      metadataFile: '{ }'
    }
  };

  const existingNonGlobalClients = [
    {
      name: 'The Management Client',
      client_id: 'AaiyAPdpYdesoKnqjj8HJqRn4T5titab',
      client_secret: 'somesecretvalu1',
      app_type: '',
      logo_uri: '',
      is_first_party: false,
      oidc_conformant: false,
      global: false
    },
    {
      name: 'Some Client Name abcd',
      client_id: 'AaiyAPdpYdesoKnqjj8HJqRn4T5titcd',
      client_secret: 'somesecretvalu2',
      app_type: '',
      logo_uri: '',
      is_first_party: false,
      oidc_conformant: false,
      global: false
    },
    {
      name: 'Some Client Name efgh',
      client_id: 'AaiyAPdpYdesoKnqjj8HJqRn4T5titef',
      client_secret: 'somesecretvalu3',
      app_type: '',
      logo_uri: '',
      is_first_party: false,
      oidc_conformant: false,
      global: false
    }
  ];

  const existingClients = _.concat(existingNonGlobalClients, [
    {
      name: 'The Global Client abc',
      client_id: 'AaiyAPdpYdesoKnqjj8HJqRn4T5titww',
      client_secret: 'somesecretvalue',
      app_type: '',
      logo_uri: '',
      is_first_party: false,
      oidc_conformant: false,
      global: true
    }
  ]);

  beforeEach(() => {
    auth0 = {
      someUnits: {
        create(payload) {
          if (payload.name === 'broken-file') {
            return Promise.reject(new Error('ERROR'));
          }

          updatePayloads.push(payload);

          /* returning payload is not perfect, but helps with some tests */
          return Promise.resolve(payload);
        },
        update(filter, payload) {
          updateFilters.push(filter);
          updatePayloads.push(payload);
          return Promise.resolve(payload);
        },
        // Uncomment me when we are actually deleting: delete(filter, payload) {
        //   updateFilters.push(filter);
        //   updatePayloads.push(payload);
        //   return Promise.resolve();
        // },
        getAll(options) {
          var returnClients = options && options.global === false ? existingNonGlobalClients : existingClients;
          return Promise.resolve(
            returnClients
          );
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
        someUnits: {
          created: 0,
          updated: 0,
          deleted: 0
        }
      },
      error: null
    };
  });

  describe('#updateConfigurables', () => {
    it('should not run if the repository does not contain any configurables', (done) => {
      if ('someUnits' in progress.configurables) {
        if ('adds' in progress.configurables.someUnits) delete progress.configurables.someUnits.adds;
        if ('updates' in progress.configurables.someUnits) delete progress.configurables.someUnits.updates;
        if ('created' in progress.configurables.someUnits) delete progress.configurables.someUnits.created;
        if ('updated' in progress.configurables.someUnits) delete progress.configurables.someUnits.updated;
      }

      configurables.update('someUnits', progress, auth0)
        .then(() => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(progress.configurables.someUnits.created).to.not.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(progress.configurables.someUnits.updated).to.not.exist;
          });
        });
    });

    it('should pass through metadata on create', (done) => {
      var gotMetaData = false;

      const metaData = {
        someVal: true
      };

      const config = {
        some_new_configurable: {
          configFile: '{ }',
          metadataFile: JSON.stringify(metaData)
        }
      };

      /* Setup valid state */
      progress.configurables.someUnits.adds = config;

      /* Initialize metadata function */
      const metaDataFunction = function(localProgress, client, unit, localMeta) {
        gotMetaData = localMeta.someVal;
        return Promise.resolve(true);
      };

      /* Call create */
      configurables.update('someUnits', progress, auth0, metaDataFunction)
        .then(() => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(progress.configurables.someUnits.created).to.equal(1);
            // eslint-disable-next-line no-unused-expressions
            expect(gotMetaData).to.be.true;
          });
        });
    });

    it('should not mark as updated if metadata does not update', (done) => {
      const metaData = {
        someVal: true
      };

      const config = {
        configFile: '{ "is_first_party": false }',
        metadataFile: JSON.stringify(metaData)
      };

      progress.configurables.someUnits.updates = {
        'Some Client Name efgh': {
          existing: existingNonGlobalClients[2],
          config: config
        }
      };

      /* Initialize metadata function */
      const metaDataFunction = function() {
        return Promise.resolve(false);
      };

      configurables.update('someUnits', progress, auth0, metaDataFunction)
        .then(() => {
          check(done, function() {
            expect(Object.keys(progress.configurables.someUnits.updates).length).to.equal(1);
            expect(progress.configurables.someUnits.updated).to.equal(0);
            expect(updatePayloads.length).to.equal(0);
          });
        });
    });

    it('should mark as updated if only metadata updates', (done) => {
      const metaData = {
        someVal: true
      };

      const config = {
        configFile: '{ "is_first_party": false }',
        metadataFile: JSON.stringify(metaData)
      };

      progress.configurables.someUnits.updates = {
        'Some Client Name efgh': {
          existing: existingNonGlobalClients[2],
          config: config
        }
      };

      /* Initialize metadata function */
      const metaDataFunction = function() {
        return Promise.resolve(true);
      };

      configurables.update('someUnits', progress, auth0, metaDataFunction)
        .then(() => {
          check(done, function() {
            expect(Object.keys(progress.configurables.someUnits.updates).length).to.equal(1);
            expect(progress.configurables.someUnits.updated).to.equal(1);
            expect(updatePayloads.length).to.equal(0);
          });
        });
    });

    it('should mark as updated if both metadata and unit updates', (done) => {
      const metaData = {
        someVal: true
      };

      const config = {
        configFile: '{ "is_first_party": true }',
        metadataFile: JSON.stringify(metaData)
      };

      progress.configurables.someUnits.updates = {
        'Some Client Name efgh': {
          existing: existingNonGlobalClients[2],
          config: config
        }
      };

      /* Initialize metadata function */
      const metaDataFunction = function() {
        return Promise.resolve(true);
      };

      configurables.update('someUnits', progress, auth0, metaDataFunction)
        .then(() => {
          check(done, function() {
            expect(Object.keys(progress.configurables.someUnits.updates).length).to.equal(1);
            expect(progress.configurables.someUnits.updated).to.equal(1);
            expect(updatePayloads.length).to.equal(1);
            expect(updatePayloads[0]).to.deep.equal({ is_first_party: true });
          });
        });
    });

    it('should create new configurables correctly', (done) => {
      progress.configurables.someUnits.adds = clientConfigs;
      progress.configurables.someUnits.idName = 'client_id';

      configurables.update('someUnits', progress, auth0)
        .then(() => {
          check(done, function() {
            expect(Object.keys(progress.configurables.someUnits.adds).length).to.equal(2);
            expect(progress.configurables.someUnits.created).to.equal(2);
            expect(updatePayloads.length).to.equal(2);
            expect(updatePayloads[0].name).to.equal('Some Client Name abcd');
            expect(updatePayloads[0].client_id).to.equal('AaiyAPdpYdesoKnqjj8HJqRn4T5titcd');
            expect(updatePayloads[0].client_secret).to.equal('somesecretvalu2');
            expect(updatePayloads[0].app_type).to.equal('');
            expect(updatePayloads[0].logo_uri).to.equal('');
            expect(updatePayloads[0].is_first_party).to.equal(false);
            expect(updatePayloads[0].oidc_conformant).to.equal(false);
            expect(updatePayloads[1].name).to.equal('Some Client Name ijkl');
            expect(updatePayloads[1].app_type).to.equal('spa');
            expect(updatePayloads[1].logo_uri).to.equal('');
            expect(updatePayloads[1].is_first_party).to.equal(true);
            expect(updatePayloads[1].callbacks).to.deep.equal([ 'http://localhost/callback' ]);
          });
        })
        .catch(function(err) {
          done(err);
        });
    });

    it('should update existing configurables correctly', (done) => {
      progress.configurables.someUnits.updates = {
        'Some Client Name abcd': {
          existing: existingNonGlobalClients[1],
          config: {
            configFile: '{ "app_type": "non-interactive" }'
          }
        },
        /* Should skip this second one because app_type is already spa */
        'Some Client Name efgh': {
          existing: existingNonGlobalClients[2],
          config: {
            configFile: '{ "is_first_party": false }'
          }
        }
      };

      progress.configurables.someUnits.idName = 'client_id';

      configurables.update('someUnits', progress, auth0)
        .then(() => {
          check(done, function() {
            expect(Object.keys(progress.configurables.someUnits.updates).length).to.equal(2);
            expect(progress.configurables.someUnits.updated).to.equal(1);
            expect(updateFilters.length).to.equal(1);
            expect(updateFilters[0]).to.deep.equal({ client_id: 'AaiyAPdpYdesoKnqjj8HJqRn4T5titcd' });
            expect(updatePayloads.length).to.equal(1);
            expect(updatePayloads[0]).to.deep.equal({ app_type: 'non-interactive' });
          });
        })
        .catch(function(err) {
          done(err);
        });
    });
  });

  describe('#validate', () => {
    it('should not run if the repository does not contain any units', (done) => {
      configurables.validate('someUnits', progress, auth0, { }, [])
        .then(() => {
          done();
        });
    });

    it('should return error if you use a bad idName', (done) => {
      const goodConfig = {
        'my-client': {
          configFile: '{ }'
        }
      };

      configurables.validate('someUnits', progress, auth0, goodConfig, existingNonGlobalClients, [], 'notanid')
        .catch((err) => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(err).to.exist;
            expect(err.message).to.equal('Attempted to use notanid for idName for someUnits but did not find that attribute in the existing someUnits.');
          });
        });
    });

    it('should return error if config is missing the config file', (done) => {
      const filesWithError = {
        'my-client': {
        }
      };

      configurables.validate('someUnits', progress, auth0, filesWithError, existingNonGlobalClients)
        .catch((err) => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(err).to.exist;
            expect(err.message).to.equal('The following someUnits have no config file: my-client');
          });
        });
    });

    it('should return error if file contains a name that does not match the file name', (done) => {
      const filesWithError = {
        'my-client': {
          configFile: '{ "name": "someothername" }'
        },
        'my-client2': {
          configFile: '{  }'
        }
      };

      configurables.validate('someUnits', progress, auth0, filesWithError, existingNonGlobalClients)
        .catch((err) => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(err).to.exist;
            expect(err.message).to.equal('The following someUnits have key names that do not match the configured name in the configFile: my-client');
          });
        });
    });

    it('check configurables to add', (done) => {
      const newClients = {
        'my-new-client': {
          configFile: '{ "name": "my-new-client" }'
        },
        'my-new-client2': {
          configFile: '{ "name": "my-new-client2" }'
        }
      };

      configurables.validate('someUnits', progress, auth0, newClients, existingNonGlobalClients, [], 'client_id')
        .then(() => {
          check(done, function() {
            // should be in add bucket
            expect(progress.configurables.someUnits.adds).to.deep.equal(newClients);
          });
        });
    });

    it('check configurables to delete', (done) => {
      const newClients = {
        'my-new-client': {
          configFile: '{ "name": "my-new-client" }'
        },
        'my-new-client2': {
          configFile: '{ "name": "my-new-client2" }'
        }
      };

      configurables.validate('someUnits', progress, auth0, newClients, existingNonGlobalClients, [ { client_id: 'AaiyAPdpYdesoKnqjj8HJqRn4T5titab' } ], 'client_id')
        .then(() => {
          check(done, function() {
            // should be in delete bucket
            expect(progress.configurables.someUnits.deletes).to.deep.equal([ 'Some Client Name abcd', 'Some Client Name efgh' ]);
          });
        });
    });

    it('check configurables to update', (done) => {
      const clientConfig = {
        'Some Client Name abcd': {
          configFile: '{ "name": "Some Client Name abcd" }'
        },
        'my-new-client2': {
          configFile: '{ "name": "my-new-client2" }'
        }
      };

      const updateClients = {
        'Some Client Name abcd': {
          existing: existingNonGlobalClients[1],
          config: clientConfig['Some Client Name abcd']
        }
      };

      configurables.validate('someUnits', progress, auth0, clientConfig, existingNonGlobalClients, [], 'client_id')
        .then(() => {
          check(done, function() {
            // should be in delete bucket
            expect(progress.configurables.someUnits.updates).to.deep.equal(updateClients);
          });
        });
    });
  });
});
