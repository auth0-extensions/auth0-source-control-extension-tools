const expect = require('expect');
const Promise = require('bluebird');
const _ = require('lodash');

const connections = require('../../src/auth0/connections');

describe('#connections', () => {
  let progress = null;
  let updateFilters = [ ];
  let updatePayloads = [ ];
  let getAllPayload = null;

  const existingConnections = [
    { id: 456, name: 'Username-Password', strategy: 'auth0' },
    { id: 123,
      name: 'My-Other-Custom-DB',
      options: {
        passwordPolicy: 'low',
        requires_username: false,
        configuration: {
          some_key: '$encrypted'
        }
      },
      metadata: { meta: true },
      strategy: 'auth0'
    },
    { id: 666, name: 'Bad-Connection', strategy: 'auth0' },
    { id: 789, name: 'My-Custom-DB', options: { import_mode: true }, strategy: 'auth0' },
    {
      id: 888,
      name: 'With-Config',
      options: {
        configuration: {
          some_key: '$encrypted'
        }
      },
      strategy: 'auth0'
    },
    {
      id: 999,
      name: 'Waad',
      strategy: 'waad'
    }
  ];

  const auth0 = {
    connections: {
      update(filter, payload) {
        if (filter.id === 666) {
          return Promise.reject(new Error('ERROR'));
        }

        updateFilters.push(filter);
        updatePayloads.push(payload);
        return Promise.resolve();
      },
      getAll(payload) {
        getAllPayload = payload;
        return Promise.resolve(
          existingConnections
        );
      }
    }
  };

  const database = {
    name: 'My-Other-Custom-DB',
    scripts: {
      login: {
        scriptFile: 'function login() { }'
      },
      create: {
        scriptFile: 'function create() { }'
      },
      delete: {
        scriptFile: 'function delete() { }'
      },
      change_email: {
        scriptFile: 'function change_email() { }'
      },
      get_user: {
        scriptFile: 'function get_user() { }'
      }
    },
    configuration: {
      options: {
        requires_username: true
      },
      metadata: {
        setting: 'test'
      }
    }
  };

  const waadDatabaseWithScripts = {
    name: 'Waad',
    scripts: {
      login: {
        scriptFile: 'function login() { }'
      }
    }
  };

  const databaseWithConfigurationKey = {
    name: 'With-Config',
    scripts: {},
    configuration: {
      options: {
        bareConfiguration: {
          some_key: 'new_value'
        }
      }
    }
  };

  const brokenDatabase = {
    name: 'Bad-Connection',
    scripts: {
      login: {
        scriptFile: 'function login() { }'
      }
    }
  };

  beforeEach(() => {
    updateFilters = [ ];
    updatePayloads = [ ];
    progress = {
      log: () => null
    };
  });

  describe('#getDatabaseConnections', () => {
    it('should return cached connections', (done) => {
      progress.connections = existingConnections;

      connections.getDatabaseConnections(progress)
        .then((c) => {
          expect(c).toEqual(existingConnections);
          done();
        });
    });

    it('should call auth0 and get the databases', (done) => {
      connections.getDatabaseConnections(progress, auth0, [ { name: 'My-Custom-DB' }, database ])
        .then((conn) => {
          expect(conn.length).toEqual(2);
          expect(conn[0].name).toEqual('My-Other-Custom-DB');
          expect(conn[1].name).toEqual('My-Custom-DB');
          done();
        });
    });

    it('should get all connections, not only \'auth0\' connections, to be able to update configuration', (done) => {
      connections.getDatabaseConnections(progress, auth0, [ { name: 'My-Custom-DB' } ])
        .then(() => {
          expect(getAllPayload).toExist();
          expect(getAllPayload.strategy).toNotExist();
          done();
        });
    });
  });

  describe('#updateDatabase', () => {
    it('should throw if connection does not exist', (done) => {
      connections.updateDatabase(progress, null, { }, database)
        .catch((err) => {
          expect(err).toExist();
          expect(err.message).toEqual('Unable to find connection named: ' + database.name);
          done();
        });
    });

    it('should update the connection correctly', (done) => {
      connections.updateDatabase(progress, auth0, existingConnections, database)
        .then(() => {
          expect(updateFilters[0]).toExist();
          expect(updateFilters[0].id).toEqual(123);
          expect(updatePayloads[0]).toExist();
          expect(updatePayloads[0].options).toExist();
          expect(updatePayloads[0].options.customScripts).toExist();
          expect(updatePayloads[0].options.customScripts.login).toEqual('function login() { }');
          expect(updatePayloads[0].options.customScripts.create).toEqual('function create() { }');
          expect(updatePayloads[0].options.customScripts.delete).toEqual('function delete() { }');
          expect(updatePayloads[0].options.customScripts.get_user).toEqual('function get_user() { }');
          expect(updatePayloads[0].options.customScripts.change_email).toEqual('function change_email() { }');
          done();
        });
    });

    it('should not send \'options.configuration\' from the connection if \'options.bareConfiguration\' exists in the DB', (done) => {
      connections.updateDatabase(progress, auth0, existingConnections, databaseWithConfigurationKey)
        .then(() => {
          expect(updatePayloads[0]).toExist();
          expect(updatePayloads[0].options.configuration).toNotExist();
          expect(updatePayloads[0].options.bareConfiguration).toEqual(databaseWithConfigurationKey.configuration.options.bareConfiguration);
          done();
        });
    });

    it('should preserve/send \'options.configuration\' from the connection if the DB doesn\'t have \'options.bareConfiguration\'', (done) => {
      const expectedConfig = _.find(existingConnections, c => c.id === 123).options.configuration;
      connections.updateDatabase(progress, auth0, existingConnections, database)
        .then(() => {
          expect(updatePayloads[0].options).toExist();
          expect(updatePayloads[0].options.configuration).toEqual(expectedConfig);
          done();
        });
    });

    it('should include custom options in the update', (done) => {
      connections.updateDatabase(progress, auth0, existingConnections, database)
        .then(() => {
          expect(updatePayloads[0].options).toExist();
          expect(updatePayloads[0].options.requires_username).toEqual(true);
          expect(updatePayloads[0].options.passwordPolicy).toEqual('low');
          done();
        });
    });

    it('should include custom metadata in the update', (done) => {
      connections.updateDatabase(progress, auth0, existingConnections, database)
        .then(() => {
          expect(updatePayloads[0].metadata).toExist();
          expect(updatePayloads[0].metadata.setting).toEqual('test');
          expect(updatePayloads[0].metadata.meta).toEqual(true);
          done();
        });
    });

    it('should return error if cannot update', (done) => {
      connections.updateDatabase(progress, auth0, existingConnections, brokenDatabase)
        .catch((err) => {
          expect(err.message).toEqual('ERROR');
          done();
        });
    });

    it('should refuse to update a non-auth0 connection with scripts', (done) => {
      connections.updateDatabase(progress, auth0, existingConnections, waadDatabaseWithScripts)
        .then(() => done(new Error('Unexpected success')))
        .catch((err) => {
          expect(err).toExist();
          expect(err.message).toEqual('The login script is not allowed for ' + waadDatabaseWithScripts.name + '.');
          done();
        });
    });
  });

  describe('#updateDatabases', () => {
    it('should continue if no databases need to be updated', (done) => {
      connections.updateDatabases(progress, null, [ ])
        .then((result) => {
          expect(result).toExist();
          done();
        });
    });

    it('should handle errors correctly', (done) => {
      connections.updateDatabases(progress, auth0, [ {
        name: 'My-Other-Custom-DB',
        scripts: {
          login: {
            scriptFile: ''
          }
        }
      } ])
        .catch((err) => {
          expect(err).toExist();
          expect(err.message).toEqual('The login script for My-Other-Custom-DB is empty.');
          done();
        });
    });

    it('should return error if trying to update forbidden script', (done) => {
      connections.updateDatabases(progress, auth0, [ {
        name: 'My-Custom-DB',
        scripts: {
          delete: {
            scriptFile: ''
          }
        }
      } ])
        .catch((err) => {
          expect(err.message).toEqual('The delete script is not allowed for My-Custom-DB.');
          done();
        });
    });

    it('should return error if trying to update forbidden script, change_email and no get_user', (done) => {
      connections.updateDatabases(progress, auth0, [ {
        name: 'My-Other-Custom-DB',
        scripts: {
          change_email: {
            scriptFile: ''
          }
        }
      } ])
        .catch((err) => {
          expect(err.message).toEqual('The change_email script requires the get_user script for My-Other-Custom-DB.');
          done();
        });
    });

    it('should update all databases', (done) => {
      connections.updateDatabases(progress, auth0, [ database ])
        .then((results) => {
          expect(results.length).toEqual(1);
          expect(updateFilters.length).toEqual(1);
          expect(updatePayloads.length).toEqual(1);
          done();
        });
    });

    it('should return error if cannot update one or more databases', (done) => {
      connections.updateDatabases(progress, auth0, [ database, brokenDatabase ])
        .catch((err) => {
          expect(err.message).toEqual('ERROR');
          done();
        });
    });
  });

  describe('#validateDatabases', () => {
    it('should continue if no databases need to be updated', (done) => {
      connections.validateDatabases(progress, null, [ ])
        .then((result) => {
          expect(result).toExist();
          done();
        });
    });

    it('should continue if all databases exist', (done) => {
      connections.validateDatabases(progress, auth0, [ database ])
        .then((result) => {
          expect(result).toExist();
          done();
        });
    });

    it('should return an error if a database does not exist', (done) => {
      connections.validateDatabases(progress, auth0, [ database, { name: 'foo' } ])
        .catch((err) => {
          expect(err).toExist();
          expect(err.message).toEqual('The following databases do not exist in the Auth0 tenant: foo');
          done();
        });
    });
  });
});
