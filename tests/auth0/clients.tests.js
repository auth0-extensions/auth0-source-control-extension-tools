const _ = require('lodash');
const expect = require('chai').expect;
const Promise = require('bluebird');
const clients = require('../../src/auth0/clients');

function check(done, f) {
  try {
    f();
    done();
  } catch (e) {
    done(e);
  }
}


describe('#clients', () => {
  let auth0;
  let progress;
  let updateFilters;
  let updatePayloads;

  const clientConfigs = {
    'Some Client Name abcd': {
      configFile: '{ "client_id": "AaiyAPdpYdesoKnqjj8HJqRn4T5titcd", "client_secret": "somesecretvalu2", "app_type": "", "logo_uri": "", "is_first_party": false, "oidc_conformant": false, "global": false}',
      metadata: true,
      metadataFile: '{ }'
    },
    'Some Client Name ijkl': {
      configFile: '{ "app_type": "spa", "logo_uri": "", "is_first_party": true, "callbacks": [ "http://localhost/callback" ] }',
      metadata: true,
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
      clients: {
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
      clientsCreated: 0,
      clientsUpdated: 0,
      clientsDeleted: 0,
      error: null
    };
  });

  describe('#getClients', () => {
    it('should return cached clients', (done) => {
      progress.clients = existingClients;

      clients.getClients(progress)
        .then((r) => {
          check(done, function() {
            expect(r).to.deep.equal(existingClients);
          });
        });
    });

    it('should call auth0 and get the clients', (done) => {
      progress.clients = undefined;
      clients.getClients(progress, auth0)
        .then((records) => {
          check(done, function() {
            expect(records).to.deep.equal(existingNonGlobalClients);
          });
        });
    });
  });

  describe('#updateClients', () => {
    it('should not run if the repository does not contain any clients', (done) => {
      if ('addClients' in progress) delete progress.addClients;
      if ('updateClients' in progress) delete progress.updateClients;
      if ('clientsCreated' in progress) delete progress.clientsCreated;
      if ('clientsUpdated' in progress) delete progress.clientsUpdated;

      clients.updateClients(progress, auth0)
        .then(() => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(progress.clientsCreated).to.not.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(progress.clientsUpdated).to.not.exist;
          });
        });
    });

    it('should create new clients correctly', (done) => {
      progress.addClients = clientConfigs;

      clients.updateClients(progress, auth0)
        .then(() => {
          check(done, function() {
            expect(Object.keys(progress.addClients).length).to.equal(2);
            expect(progress.clientsCreated).to.equal(2);
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

    it('should update existing clients correctly', (done) => {
      progress.updateClients = {
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

      clients.updateClients(progress, auth0)
        .then(() => {
          check(done, function() {
            expect(Object.keys(progress.updateClients).length).to.equal(2);
            expect(progress.clientsUpdated).to.equal(1);
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

  describe('#validateClients', () => {
    it('should not run if the repository does not contain any clients', (done) => {
      clients.validateClients(progress, auth0, { })
        .then(() => {
          done();
        });
    });

    it('should return error if config is missing the config file', (done) => {
      const filesWithError = {
        'my-client': {
        }
      };

      clients.validateClients(progress, auth0, filesWithError, 'AaiyAPdpYdesoKnqjj8HJqRn4T5titab')
        .catch((err) => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(err).to.exist;
            expect(err.message).to.equal('The following clients have no config file: my-client');
          });
        });
    });

    it('should return error if file contains a name that does not match the directory name', (done) => {
      const filesWithError = {
        'my-client': {
          configFile: '{ "name": "someothername" }'
        },
        'my-client2': {
          configFile: '{  }'
        }
      };

      clients.validateClients(progress, auth0, filesWithError, 'AaiyAPdpYdesoKnqjj8HJqRn4T5titab')
        .catch((err) => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(err).to.exist;
            expect(err.message).to.equal('The following clients have key names that do not match the configured name in the configFile: my-client');
          });
        });
    });

    it('should return error if we do not pass in the management client', (done) => {
      const someClient = {
        'my-client': {
          configFile: '{ }'
        }
      };

      clients.validateClients(progress, auth0, someClient)
        .catch((err) => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(err).to.exist;
            expect(err.message).to.equal('When specifying clients, you must specify which client is the management client for the deploy application.');
          });
        });
    });

    it('should return error if we pass in the wrong management client', (done) => {
      const someClient = {
        'my-client': {
          configFile: '{ }'
        }
      };

      clients.validateClients(progress, auth0, someClient, 'Wrong Management Client')
        .catch((err) => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(err).to.exist;
            expect(err.message).to.equal('Did not find Wrong Management Client, in list of existing client IDs: AaiyAPdpYdesoKnqjj8HJqRn4T5titab,AaiyAPdpYdesoKnqjj8HJqRn4T5titcd,AaiyAPdpYdesoKnqjj8HJqRn4T5titef');
          });
        });
    });


    it('check clients to add', (done) => {
      const newClients = {
        'my-new-client': {
          configFile: '{ "name": "my-new-client" }'
        },
        'my-new-client2': {
          configFile: '{ "name": "my-new-client2" }'
        }
      };

      clients.validateClients(progress, auth0, newClients, 'AaiyAPdpYdesoKnqjj8HJqRn4T5titab')
        .then(() => {
          check(done, function() {
            // should be in add bucket
            expect(progress.addClients).to.deep.equal(newClients);
          });
        });
    });

    it('check clients to delete', (done) => {
      const newClients = {
        'my-new-client': {
          configFile: '{ "name": "my-new-client" }'
        },
        'my-new-client2': {
          configFile: '{ "name": "my-new-client2" }'
        }
      };

      clients.validateClients(progress, auth0, newClients, 'AaiyAPdpYdesoKnqjj8HJqRn4T5titab')
        .then(() => {
          check(done, function() {
            // should be in delete bucket
            expect(progress.deleteClients).to.deep.equal([ 'Some Client Name abcd', 'Some Client Name efgh' ]);
          });
        });
    });

    it('check clients to update', (done) => {
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

      clients.validateClients(progress, auth0, clientConfig, 'AaiyAPdpYdesoKnqjj8HJqRn4T5titab')
        .then(() => {
          check(done, function() {
            // should be in delete bucket
            expect(progress.updateClients).to.deep.equal(updateClients);
          });
        });
    });
  });
});
