const _ = require('lodash');
const expect = require('chai').expect;
const Promise = require('bluebird');
const connections = require('../../src/auth0/connections');

const check = function(done, f) {
  try {
    f();
    done();
  } catch (e) {
    done(e);
  }
};

describe('#connections', () => {
  let auth0;
  let progress;
  let updateFilters;
  let updatePayloads;

  const connectionsConfigs = {
    'Username Password Database': {
      configFile: '{ "name": "Username Password Database", "strategy": "auth0", "enabled_clients": [ "VcxDs0khG026SBgrUjGbFqgvrXezGmU1", "E3XwoN1Hhtw2lrtHierRnvSSCR14CsDi" ], "options": { "import_mode": false, "disable_signup": false, "requires_username": false, "brute_force_protection": true } }'
    },
    'New Username Password Database': {
      configFile: '{ "name": "New Username Password Database", "strategy": "auth0", "enabled_clients": [], "options": { "requires_username": false, "brute_force_protection": true } }'
    }
  };

  const existingConnections = [
    {
      id: 'con_4DUzr',
      name: 'Username Password Database',
      options: {
        import_mode: false,
        disable_signup: false,
        requires_username: false,
        brute_force_protection: true
      },
      strategy: 'auth0',
      enabled_clients: [ 'VcxDs0khG026SBgrUjGbFqgvrXezGmU1', 'E3XwoN1Hhtw2lrtHierRnvSSCR14CsDi' ]
    },
    {
      id: 'con_dkDKi',
      name: 'Internal Username Password Database',
      options: {
        import_mode: false,
        disable_signup: true,
        requires_username: true,
        brute_force_protection: true
      },
      strategy: 'auth0',
      enabled_clients: [ 'VcxDs0khG026SBgrUjGbFqgvrXezGmU1', 'E3XwoN1Hhtw2lrtHierRnvSSCR14CsDi' ]
    }
  ];

  beforeEach(() => {
    auth0 = {
      connections: {
        create(payload) {
          if (payload.name === 'broken-file') {
            return Promise.reject(new Error('ERROR'));
          }

          updatePayloads.push(payload);
          return Promise.resolve(_(payload).extend({
            id: 'asdfgh'
          }));
        },
        update(filter, payload) {
          updateFilters.push(filter);
          updatePayloads.push(payload);
          /* Need a garbage object so we don't fail */
          return Promise.resolve(_(payload).extend({
            name: 'asdf',
            id: 'asdf'
          }));
        },
        getAll() {
          return Promise.resolve(
            existingConnections
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
        connections: {
          created: 0,
          updated: 0,
          deleted: 0
        }
      },
      error: null
    };
  });

  describe('#getConnections', () => {
    it('should return cached connections', (done) => {
      progress.connections = existingConnections;

      connections.getConnections(progress)
        .then((r) => {
          check(done, function() {
            expect(r).to.deep.equal(existingConnections);
          });
        });
    });

    it('should call auth0 and get the connections', (done) => {
      progress.connections = undefined;
      connections.getConnections(progress, auth0)
        .then((records) => {
          check(done, function() {
            expect(records).to.deep.equal(existingConnections);
          });
        });
    });
  });

  describe('#updateConnections', () => {
    it('should not run if the repository does not contain any connection', (done) => {
      if ('adds' in progress.configurables.connections) delete progress.configurables.connections.adds;
      if ('updates' in progress.configurables.connections) delete progress.configurables.connections.updates;
      if ('created' in progress.configurables.connections) delete progress.configurables.connections.created;
      if ('updated' in progress.configurables.connections) delete progress.configurables.connections.updated;

      connections.updateConnections(progress, auth0)
        .then(() => {
          check(done, function() {
            // eslint-disable-next-line no-unused-expressions
            expect(progress.configurables.connections.created).to.not.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(progress.configurables.connections.updated).to.not.exist;
          });
        });
    });

    it('should create new connections correctly', (done) => {
      progress.configurables.connections.adds = connectionsConfigs;

      connections.updateConnections(progress, auth0)
        .then(() => {
          check(done, function() {
            expect(Object.keys(progress.configurables.connections.adds).length).to.equal(2);
            expect(progress.configurables.connections.created).to.equal(2);
            expect(updatePayloads.length).to.equal(2);
            expect(updatePayloads[0].name).to.equal('Username Password Database');
            expect(updatePayloads[0].strategy).to.equal('auth0');
            expect(updatePayloads[0].enabled_clients[0]).to.equal('VcxDs0khG026SBgrUjGbFqgvrXezGmU1');
            expect(updatePayloads[0].enabled_clients[1]).to.equal('E3XwoN1Hhtw2lrtHierRnvSSCR14CsDi');
            expect(updatePayloads[0].options.import_mode).to.equal(false);
            expect(updatePayloads[0].options.disable_signup).to.equal(false);
            expect(updatePayloads[0].options.requires_username).to.equal(false);
            expect(updatePayloads[0].options.brute_force_protection).to.equal(true);

            expect(updatePayloads[1].name).to.equal('New Username Password Database');
            expect(updatePayloads[1].strategy).to.equal('auth0');
            expect(updatePayloads[1].enabled_clients).to.be.an.instanceof(Array);
            expect(updatePayloads[1].enabled_clients.length).to.be.equal(0);
            expect(updatePayloads[1].options.requires_username).to.equal(false);
            expect(updatePayloads[1].options.brute_force_protection).to.equal(true);
          });
        })
        .catch(function(err) {
          done(err);
        });
    });

    it('should update existing connections correctly', (done) => {
      progress.configurables.connections.updates = {
        'Username Password Database': {
          existing: existingConnections[0],
          config: {
            configFile: '{ "name": "Username Password Database Update", "options": { "disable_signup": true }, "enabled_clients": [ "VcxDs0khG026SBgrUjGbFqgvrXezGmU1", "2lrtHierRnvE3XwoN1HhtwSSCR14CsDi" ] }'
          }
        },
        'Internal Username Password Database': {
          existing: existingConnections[1],
          config: {
            configFile: '{ "options": { "requires_username": false } }'
          }
        }
      };
      progress.configurables.connections.idName = 'id';

      connections.updateConnections(progress, auth0)
        .then(() => {
          check(done, function() {
            expect(Object.keys(progress.configurables.connections.updates).length).to.equal(2);
            expect(progress.configurables.connections.updated).to.equal(2);

            expect(updateFilters.length).to.equal(2);
            expect(updateFilters[0]).to.deep.equal({ id: 'con_4DUzr' });
            expect(updateFilters[1]).to.deep.equal({ id: 'con_dkDKi' });

            expect(updatePayloads.length).to.equal(2);
            expect(updatePayloads[0]).to.deep.equal({ options: { disable_signup: true }, enabled_clients: [ 'VcxDs0khG026SBgrUjGbFqgvrXezGmU1', '2lrtHierRnvE3XwoN1HhtwSSCR14CsDi' ] });
            expect(updatePayloads[1]).to.deep.equal({ options: { requires_username: false } });
          });
        })
        .catch(function(err) {
          done(err);
        });
    });
  });

  describe('#validateConnections', () => {
    it('should not run if the repository does not contain any connections', (done) => {
      connections.validateConnections(progress, auth0, {})
        .then(() => {
          done();
        });
    });

    it('check connections to add', (done) => {
      const newConnections = {
        'my-new-connection': {
          configFile: '{ "name": "my-new-connection" }'
        },
        'my-new-connection2': {
          configFile: '{ "name": "my-new-connection2" }'
        }
      };

      connections.validateConnections(progress, auth0, newConnections)
        .then(() => {
          check(done, function() {
            // should be in add bucket
            expect(progress.configurables.connections.adds).to.deep.equal(newConnections);
          });
        });
    });

    it('check connections to delete', (done) => {
      const newConnections = {
        'my-new-connection': {
          configFile: '{ "name": "my-new-connection" }'
        },
        'my-new-connection2': {
          configFile: '{ "name": "my-new-connection2" }'
        }
      };

      connections.validateConnections(progress, auth0, newConnections)
        .then(() => {
          check(done, function() {
            // should be in delete bucket
            expect(progress.configurables.connections.deletes).to.deep.equal([ 'Username Password Database', 'Internal Username Password Database' ]);
          });
        });
    });

    it('check connections to update', (done) => {
      const connectionsConfig = {
        'Internal Username Password Database': {
          configFile: '{ "name": "Internal Username Password Database" }'
        },
        'my-new-connection2': {
          configFile: '{ "name": "my-new-connection2" }'
        }
      };

      const updateConnections = {
        'Internal Username Password Database': {
          existing: existingConnections[1],
          config: connectionsConfig['Internal Username Password Database']
        }
      };

      connections.validateConnections(progress, auth0, connectionsConfig)
        .then(() => {
          check(done, function() {
            // should be in delete bucket
            expect(progress.configurables.connections.updates).to.deep.equal(updateConnections);
          });
        });
    });
  });
});
