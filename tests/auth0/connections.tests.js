const expect = require('expect');
const Promise = require('bluebird');

const connections = require('../../src/auth0/connections');

describe('#connections', () => {
  let progress = null;
  let updateFilters = [ ];
  let updatePayloads = [ ];

  const existingConnections = [
    { id: 456, name: 'Username-Password' },
    { id: 123, name: 'My-Other-Custom-DB' },
    { id: 666, name: 'Bad-Connection' },
    { id: 789, name: 'My-Custom-DB', options: { import_mode: true } }
  ];

  const auth0 = {
    connections: {
      update(filter, payload) {
        updateFilters.push(filter);
        updatePayloads.push(payload);
        return Promise.resolve();
      },
      getAll() {
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

    it('should update all databases', (done) => {
      connections.updateDatabases(progress, auth0, [ database ])
        .then((results) => {
          expect(results.length).toEqual(1);
          expect(updateFilters.length).toEqual(1);
          expect(updatePayloads.length).toEqual(1);
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
