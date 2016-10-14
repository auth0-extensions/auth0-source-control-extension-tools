const expect = require('expect');
const Promise = require('bluebird');

const rules = require('../../src/auth0/rules');

describe('#rules', () => {
  let auth0;
  let progress;
  let updateFilters;
  let updatePayloads;

  const files = {
    'log-to-console': {
      script: true,
      scriptFile: 'function logToConsole() { }',
      metadata: false
    },
    'add-country': {
      script: true,
      scriptFile: 'function addCountry() { }',
      metadata: true,
      metadataFile: '{ "order": 20 }'
    },
    'enrich-profile': {
      script: true,
      scriptFile: 'function enrichProfile() { }',
      metadata: true,
      metadataFile: '{ "order": 30, "enabled": false }'
    }
  };

  const existingRules = [
    { id: 456, name: 'log-to-console', stage: 'login_success', order: 1 },
    { id: 123, name: 'add-country', stage: 'login_success', order: 2 },
    { id: 789, name: 'enrich-profile', stage: 'login_success', order: 3 },
    { id: 111, name: 'authz-extension', stage: 'login_success', script: 'function authz() { }', order: 4 }
  ];

  const manualRules = [
    'authz-extension'
  ];

  beforeEach(() => {
    auth0 = {
      rules: {
        create(payload) {
          updatePayloads.push(payload);
          return Promise.resolve();
        },
        update(filter, payload) {
          updateFilters.push(filter);
          updatePayloads.push(payload);
          return Promise.resolve();
        },
        delete(filter, payload) {
          updateFilters.push(filter);
          updatePayloads.push(payload);
          return Promise.resolve();
        },
        getAll() {
          return Promise.resolve(
            existingRules
          );
        }
      }
    };
    updateFilters = [ ];
    updatePayloads = [ ];
    progress = {
      log: () => null,
      date: new Date(),
      connectionsUpdated: 0,
      rulesCreated: 0,
      rulesUpdated: 0,
      rulesDeleted: 0,
      error: null
    };
  });

  describe('#getRules', () => {
    it('should return cached rules', (done) => {
      progress.rules = existingRules;

      rules.getRules(progress)
        .then((r) => {
          expect(r).toEqual(existingRules);
          done();
        });
    });

    it('should call auth0 and get the rules', (done) => {
      rules.getRules(progress, auth0)
        .then((records) => {
          expect(records.length).toEqual(4);
          expect(records[0].name).toEqual('log-to-console');
          expect(records[2].name).toEqual('enrich-profile');
          done();
        });
    });
  });

  describe('#deleteRules', () => {
    it('should not run if the rule also exists in the repository', (done) => {
      progress.rules = [
        { id: 456, name: 'log-to-console' },
        { id: 123, name: 'add-country' },
        { id: 789, name: 'enrich-profile' }
      ];

      rules.deleteRules(progress, auth0, files, [ ])
        .then(() => {
          expect(progress.rulesDeleted).toNotExist();
          done();
        });
    });

    it('should not run if the rule is excluded', (done) => {
      rules.deleteRules(progress, auth0, files, manualRules)
        .then(() => {
          expect(progress.rulesDeleted).toNotExist();
          done();
        });
    });

    it('should delete rules that are not in the repository', (done) => {
      rules.deleteRules(progress, auth0, files, [ ])
        .then(() => {
          expect(progress.rulesDeleted).toEqual(1);
          expect(updateFilters[0].id).toEqual(111);
          done();
        });
    });
  });

  describe('#updateRules', () => {
    it('should not run if the repository does not contain any rules', (done) => {
      rules.updateRules(progress, auth0, { })
        .then(() => {
          expect(progress.rulesCreated).toNotExist();
          expect(progress.rulesUpdated).toNotExist();
          done();
        });
    });

    it('should create new rules correctly', (done) => {
      auth0.rules.getAll = () => Promise.resolve([ ]);

      rules.updateRules(progress, auth0, files, [ 'foo' ])
        .then(() => {
          expect(progress.rulesCreated).toEqual(3);
          expect(updatePayloads.length).toEqual(3);
          expect(updatePayloads[0].name).toEqual('log-to-console');
          expect(updatePayloads[0].enabled).toEqual(true);
          expect(updatePayloads[1].name).toEqual('add-country');
          expect(updatePayloads[1].enabled).toEqual(true);
          expect(updatePayloads[1].order).toEqual(20);
          expect(updatePayloads[2].name).toEqual('enrich-profile');
          expect(updatePayloads[2].enabled).toEqual(false);
          expect(updatePayloads[2].order).toEqual(30);
          done();
        });
    });

    it('should update existing rules correctly', (done) => {
      const filesForExistingRules = {
        'log-to-console-2': {
          script: true,
          scriptFile: 'function logToConsole() { }',
          metadata: false
        },
        'add-country': {
          script: true,
          scriptFile: 'function addCountry() { }',
          metadata: true,
          metadataFile: '{ "order": 20 }'
        },
        'authz-extension': {
          script: false,
          metadata: true,
          metadataFile: '{ "order": 30, "enabled": false }'
        }
      };
      rules.updateRules(progress, auth0, filesForExistingRules, [ 'foo' ])
        .then(() => {
          expect(progress.rulesCreated).toEqual(1);
          expect(progress.rulesUpdated).toEqual(2);
          expect(updateFilters.length).toEqual(2);
          expect(updatePayloads.length).toEqual(3);
          expect(updatePayloads[0].name).toEqual('log-to-console-2');
          expect(updatePayloads[0].enabled).toEqual(true);
          expect(updatePayloads[0].script).toEqual('function logToConsole() { }');
          expect(updatePayloads[1].name).toEqual('add-country');
          expect(updatePayloads[1].script).toEqual('function addCountry() { }');
          expect(updatePayloads[1].enabled).toEqual(true);
          expect(updatePayloads[1].order).toEqual(20);
          expect(updatePayloads[2].script).toEqual('function authz() { }');
          expect(updatePayloads[2].enabled).toEqual(false);
          expect(updatePayloads[2].order).toEqual(30);
          done();
        });
    });

    it('should update existing rules correctly and ignore manual rules', (done) => {
      const filesForExistingRules = {
        'log-to-console-2': {
          script: true,
          scriptFile: 'function logToConsole() { }',
          metadata: false
        },
        'add-country': {
          script: true,
          scriptFile: 'function addCountry() { // ORIGINAL }',
          metadata: true,
          metadataFile: '{ "order": 20 }'
        },
        'authz-extension': {
          script: false,
          metadata: true,
          metadataFile: '{ "order": 30, "enabled": false }'
        }
      };
      rules.updateRules(progress, auth0, filesForExistingRules, [ 'add-country' ])
        .then(() => {
          expect(progress.rulesCreated).toEqual(1);
          expect(progress.rulesUpdated).toEqual(2);
          expect(updateFilters.length).toEqual(2);
          expect(updatePayloads.length).toEqual(3);
          expect(updatePayloads[0].name).toEqual('log-to-console-2');
          expect(updatePayloads[0].enabled).toEqual(true);
          expect(updatePayloads[0].script).toEqual('function logToConsole() { }');
          expect(updatePayloads[1].name).toEqual('add-country');
          expect(updatePayloads[1].script).toEqual(undefined);
          expect(updatePayloads[1].enabled).toEqual(true);
          expect(updatePayloads[1].order).toEqual(20);
          expect(updatePayloads[2].script).toEqual('function authz() { }');
          expect(updatePayloads[2].enabled).toEqual(false);
          expect(updatePayloads[2].order).toEqual(30);
          done();
        });
    });

    it('should not create rules that are marked as manual', (done) => {
      const filesForExistingRules = {
        'new-rule': {
          script: true,
          scriptFile: 'function newRule() { // Existing }',
          metadata: true,
          metadataFile: '{ "order": 20 }'
        }
      };
      rules.updateRules(progress, auth0, filesForExistingRules, [ 'new-rule' ])
        .then(() => {
          expect(progress.rulesCreated).toEqual(0);
          expect(progress.rulesUpdated).toEqual(0);
          done();
        });
    });
  });

  describe('#validateRules', () => {
    it('should not run if the repository does not contain any rules', (done) => {
      rules.validateRules(progress, auth0, { }, [ ])
        .then(() => {
          done();
        });
    });

    it('should return error if file contains only metadata without script', (done) => {
      const filesWithError = {
        'my-rule': {
          metadata: true,
          metadataFile: '{ "enabled": true }'
        }
      };

      rules.validateRules(progress, auth0, filesWithError, [ ])
        .catch((err) => {
          expect(err).toExist();
          expect(err.message).toEqual('The following rules have metadata files, but have no script files: my-rule');
          done();
        });
    });

    it('should allow metadata only files for manual rules', (done) => {
      const myRules = {
        'my-rule': {
          metadata: true,
          metadataFile: '{ "enabled": true }'
        }
      };

      rules.validateRules(progress, auth0, myRules, [ 'my-rule' ])
        .then(() => {
          done();
        });
    });

    it('should allow rules without explicit stage', (done) => {
      const myRules = {
        'my-rule': {
          script: true,
          scriptFile: 'function myRule() { }'
        }
      };

      rules.validateRules(progress, auth0, myRules, [ ])
        .then(() => {
          done();
        });
    });

    it('should allow rules with explicit stage', (done) => {
      const myRules = {
        'my-rule': {
          script: true,
          scriptFile: 'function myRule() { }',
          metadata: true,
          metadataFile: '{ "stage": "login_success" }'
        }
      };

      rules.validateRules(progress, auth0, myRules, [ ])
        .then(() => {
          done();
        });
    });

    it('should not allow rules with invalid stage', (done) => {
      const myRules = {
        'my-rule': {
          script: true,
          scriptFile: 'function myRule() { }',
          metadata: true,
          metadataFile: '{ "stage": "foo" }'
        }
      };

      rules.validateRules(progress, auth0, myRules, [ ])
        .catch((err) => {
          expect(err).toExist();
          expect(err.message.indexOf('The following rules have invalid stages set in their metadata files: my-rule')).toEqual(0);
          done();
        });
    });

    it('should not allow changing stages', (done) => {
      const myRules = {
        'log-to-console': {
          script: true,
          scriptFile: 'function myRule() { }',
          metadata: true,
          metadataFile: '{ "stage": "login_success" }'
        }
      };

      progress.rules = [
        { id: 456, name: 'log-to-console', stage: 'login_failed' }
      ];

      rules.validateRules(progress, auth0, myRules, [ ])
        .catch((err) => {
          expect(err).toExist();
          expect(err.message).toEqual('The following rules changed stage which is not allowed: log-to-console. Rename the rules to recreate them and avoid this error.');
          done();
        });
    });

    it('should allow multiple rules without any order specified', (done) => {
      const myRules = {
        'log-to-console': {
          script: true,
          scriptFile: 'function myRule() { }',
          metadata: true,
          metadataFile: '{ "stage": "login_success" }'
        },
        'log-to-foo': {
          script: true,
          scriptFile: 'function myRule() { }',
          metadata: true,
          metadataFile: '{ "stage": "login_success" }'
        }
      };

      rules.validateRules(progress, auth0, myRules, [ ])
        .then(() => {
          done();
        });
    });

    it('should not allow multiple rules with the same order', (done) => {
      const myRules = {
        'log-to-console': {
          script: true,
          scriptFile: 'function myRule() { }',
          metadata: true,
          metadataFile: '{ "stage": "login_success", "order": 20 }'
        },
        'log-to-foo': {
          script: true,
          scriptFile: 'function myRule() { }',
          metadata: true,
          metadataFile: '{ "stage": "login_success", "order": 20 }'
        }
      };

      rules.validateRules(progress, auth0, myRules, [ ])
        .catch((err) => {
          expect(err).toExist();
          expect(err.name).toEqual('ValidationError');
          done();
        });
    });

    it('should allow order changes', (done) => {
      const myRules = {
        'log-to-console': {
          script: true,
          scriptFile: 'function myRule() { }',
          metadata: true,
          metadataFile: '{ "order": 2 }'
        },
        'add-country': {
          script: true,
          scriptFile: 'function myRule() { }',
          metadata: true,
          metadataFile: '{ "order": 1 }'
        }
      };

      rules.validateRules(progress, auth0, myRules, [ ])
        .then(() => {
          done();
        });
    });

    it('should not allow order conflicts with existing rules', (done) => {
      const myRules = {
        'log-to-console': {
          script: true,
          scriptFile: 'function myRule() { }',
          metadata: true,
          metadataFile: '{ "order": 2 }'
        }
      };

      rules.validateRules(progress, auth0, myRules, [ ])
        .catch((err) => {
          expect(err).toExist();
          expect(err.name).toEqual('ValidationError');
          done();
        });
    });
  });
});
