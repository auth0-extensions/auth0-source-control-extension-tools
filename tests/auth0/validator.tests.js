import { expect } from 'chai';
import Auth0 from '../../src/auth0';

describe.only('#schema validation tests', () => {
  const client = {
    rules: {
      getAll: () => []
    }
  };

  const failedCb = done => err => done(err || 'test failed');

  const passedCb = (done, message) => (err) => {
    if (err || message) expect(err.message).to.contain(message);
    done();
  };

  const checkPassed = (data, done) => {
    const auth0 = new Auth0(client, data, {});

    auth0.validate()
      .then(passedCb(done), failedCb(done));
  };

  const checkRequired = (field, data, done) => {
    const auth0 = new Auth0({}, data, {});

    auth0.validate()
      .then(failedCb(done), passedCb(done, `should have required property '${field}'`));
  };

  const checkEnum = (data, done) => {
    const auth0 = new Auth0({}, data, {});

    auth0.validate()
      .then(failedCb(done), passedCb(done, 'should be equal to one of the allowed values'));
  };

  describe('#clientGrants validate', () => {
    it('should fail validation if no "client_id" provided', (done) => {
      const data = [
        {
          name: 'name'
        }
      ];

      checkRequired('client_id', { clientGrants: data }, done);
    });

    it('should fail validation if no "scope" provided', (done) => {
      const data = [
        {
          client_id: 'client_id',
          audience: 'audience'
        }
      ];

      checkRequired('scope', { clientGrants: data }, done);
    });

    it('should fail validation if no "audience" provided', (done) => {
      const data = [
        {
          client_id: 'client_id',
          scope: [ 'scope' ]
        }
      ];

      checkRequired('audience', { clientGrants: data }, done);
    });

    it('should fail validation if bad "scope" provided', (done) => {
      const data = [
        {
          client_id: 'client_id',
          scope: 'scope',
          audience: 'audience'
        }
      ];

      const auth0 = new Auth0({}, { clientGrants: data }, {});

      auth0.validate()
        .then(failedCb(done), passedCb(done, 'should be array'));
    });

    it('should pass validation', (done) => {
      const data = [
        {
          client_id: 'client_id',
          scope: [ 'scope' ],
          audience: 'audience'
        }
      ];

      checkPassed({ clientGrants: data }, done);
    });
  });

  describe('#clients validate', () => {
    it('should fail validation if no "name" provided', (done) => {
      const data = [
        {
          id: 'id'
        }
      ];

      checkRequired('name', { clients: data }, done);
    });

    it('should fail validation if bad "name" provided', (done) => {
      const data = [
        {
          name: ''
        }
      ];

      const auth0 = new Auth0({}, { clients: data }, {});

      auth0.validate()
        .then(failedCb(done), passedCb(done, 'should NOT be shorter than 1 characters'));
    });

    it('should pass validation', (done) => {
      const data = [
        {
          name: 'name'
        }
      ];

      checkPassed({ clients: data }, done);
    });
  });

  describe('#connections validate', () => {
    it('should fail validation if no "name" provided', (done) => {
      const data = [
        {
          id: 'id'
        }
      ];

      checkRequired('name', { connections: data }, done);
    });

    it('should fail validation if no "strategy" provided', (done) => {
      const data = [
        {
          name: 'name'
        }
      ];

      checkRequired('strategy', { connections: data }, done);
    });

    it('should pass validation', (done) => {
      const data = [
        {
          name: 'name',
          strategy: 'strategy'
        }
      ];

      checkPassed({ connections: data }, done);
    });
  });

  describe('#databases validate', () => {
    it('should fail validation if no "name" provided', (done) => {
      const data = [
        {
          id: 'id'
        }
      ];

      checkRequired('name', { databases: data }, done);
    });

    it('should fail validation if bad "strategy" provided', (done) => {
      const data = [
        {
          name: 'name',
          strategy: 'strategy'
        }
      ];

      checkEnum({ databases: data }, done);
    });

    it('should fail validation if no "options.import_mode" provided', (done) => {
      const data = [
        {
          name: 'name',
          options: {
            passwordPolicy: ''
          }
        }
      ];

      checkRequired('.import_mode', { databases: data }, done);
    });

    it('should pass validation', (done) => {
      const data = [
        {
          name: 'name',
          options: {
            import_mode: 'import_mode'
          }
        }
      ];

      checkPassed({ databases: data }, done);
    });
  });

  describe('#emailProvider validate', () => {
    it('should fail validation if emailProvider is not an object', (done) => {
      const data = [
        {
          anything: 'anything'
        }
      ];

      const auth0 = new Auth0({}, { emailProvider: data }, {});

      auth0.validate()
        .then(failedCb(done), passedCb(done, 'should be object'));
    });

    it('should pass validation', (done) => {
      const data = {
        anything: 'anything'
      };

      checkPassed({ emailProvider: data }, done);
    });
  });

  describe('#emailTemplates validate', () => {
    it('should fail validation if no "template" provided', (done) => {
      const data = [
        {
          anything: 'anything'
        }
      ];

      checkRequired('template', { emailTemplates: data }, done);
    });

    it('should fail validation if bad "template" provided', (done) => {
      const data = [
        {
          template: 'template',
          body: 'body'
        }
      ];

      checkEnum({ emailTemplates: data }, done);
    });

    it('should pass validation', (done) => {
      const data = [
        {
          template: 'verify_email',
          body: 'body'
        }
      ];

      checkPassed({ emailTemplates: data }, done);
    });
  });

  describe('#guardianFactorProviders validate', () => {
    it('should fail validation if no "name" provided', (done) => {
      const data = [
        {
          anything: 'anything'
        }
      ];

      checkRequired('name', { guardianFactorProviders: data }, done);
    });

    it('should fail validation if no "provider" provided', (done) => {
      const data = [
        {
          name: 'sms'
        }
      ];

      checkRequired('provider', { guardianFactorProviders: data }, done);
    });

    it('should fail validation if bad "name" provided', (done) => {
      const data = [
        {
          name: 'name',
          provider: 'provider'
        }
      ];

      checkEnum({ guardianFactorProviders: data }, done);
    });

    it('should fail validation if bad "provider" provided', (done) => {
      const data = [
        {
          name: 'sms',
          provider: 'provider'
        }
      ];

      checkEnum({ guardianFactorProviders: data }, done);
    });

    it('should pass validation', (done) => {
      const data = [
        {
          name: 'sms',
          provider: 'twilio'
        }
      ];

      checkPassed({ guardianFactorProviders: data }, done);
    });
  });

  describe('#guardianFactors validate', () => {
    it('should fail validation if no "name" provided', (done) => {
      const data = [
        {
          anything: 'anything'
        }
      ];

      checkRequired('name', { guardianFactors: data }, done);
    });

    it('should fail validation if bad "name" provided', (done) => {
      const data = [
        {
          name: 'name'
        }
      ];

      checkEnum({ guardianFactors: data }, done);
    });

    it('should pass validation', (done) => {
      const data = [
        {
          name: 'sms'
        }
      ];

      checkPassed({ guardianFactors: data }, done);
    });
  });

  describe('#guardianFactorTemplates validate', () => {
    it('should fail validation if no "name" provided', (done) => {
      const data = [
        {
          anything: 'anything'
        }
      ];

      checkRequired('name', { guardianFactorTemplates: data }, done);
    });

    it('should fail validation if bad "name" provided', (done) => {
      const data = [
        {
          name: 'name'
        }
      ];

      checkEnum({ guardianFactorTemplates: data }, done);
    });

    it('should pass validation', (done) => {
      const data = [
        {
          name: 'sms'
        }
      ];

      checkPassed({ guardianFactorTemplates: data }, done);
    });
  });

  describe('#pages validate', () => {
    it('should fail validation if no "name" provided', (done) => {
      const data = [
        {
          anything: 'anything'
        }
      ];

      checkRequired('name', { pages: data }, done);
    });

    it('should fail validation if bad "name" provided', (done) => {
      const data = [
        {
          name: 'name'
        }
      ];

      checkEnum({ pages: data }, done);
    });

    it('should pass validation', (done) => {
      const data = [
        {
          name: 'login'
        }
      ];

      checkPassed({ pages: data }, done);
    });
  });

  describe('#resourceServers validate', () => {
    it('should fail validation if no "name" provided', (done) => {
      const data = [
        {
          anything: 'anything'
        }
      ];

      checkRequired('name', { resourceServers: data }, done);
    });

    it('should fail validation if no "identifier" provided', (done) => {
      const data = [
        {
          name: 'name'
        }
      ];

      checkRequired('identifier', { resourceServers: data }, done);
    });

    it('should pass validation', (done) => {
      const data = [
        {
          name: 'name',
          identifier: 'identifier'
        }
      ];

      checkPassed({ resourceServers: data }, done);
    });
  });

  describe('#rules validate', () => {
    it('should fail validation if no "name" provided', (done) => {
      const data = [
        {
          anything: 'anything'
        }
      ];

      checkRequired('name', { rules: data }, done);
    });

    it('should fail validation if bad "name" provided', (done) => {
      const data = [
        {
          name: '-rule-'
        }
      ];

      const auth0 = new Auth0({}, { rules: data }, {});

      auth0.validate()
        .then(failedCb(done), passedCb(done, 'should match pattern'));
    });

    it('should fail validation if bad "stage" provided', (done) => {
      const data = [
        {
          name: 'rule',
          stage: 'stage'
        }
      ];

      checkEnum({ rules: data }, done);
    });

    it('should pass validation', (done) => {
      const data = [
        {
          name: 'name',
          order: 1,
          stage: 'login_failure'
        }
      ];

      checkPassed({ rules: data }, done);
    });
  });

  describe('#rulesConfigs validate', () => {
    it('should fail validation if no "key" provided', (done) => {
      const data = [
        {
          anything: 'anything'
        }
      ];

      checkRequired('key', { rulesConfigs: data }, done);
    });

    it('should fail validation if no "value" provided', (done) => {
      const data = [
        {
          key: 'key'
        }
      ];

      checkRequired('value', { rulesConfigs: data }, done);
    });

    it('should fail validation if bad "key" provided', (done) => {
      const data = [
        {
          key: ':-?',
          value: 'value'
        }
      ];

      const auth0 = new Auth0({}, { rulesConfigs: data }, {});

      auth0.validate()
        .then(failedCb(done), passedCb(done, 'should match pattern'));
    });

    it('should pass validation', (done) => {
      const data = [
        {
          key: 'key',
          value: 'value'
        }
      ];

      checkPassed({ rulesConfigs: data }, done);
    });
  });

  describe('#tenant validate', () => {
    it('should fail validation if tenant is not an object', (done) => {
      const data = [
        {
          anything: 'anything'
        }
      ];

      const auth0 = new Auth0({}, { tenant: data }, {});

      auth0.validate()
        .then(failedCb(done), passedCb(done, 'should be object'));
    });

    it('should pass validation', (done) => {
      const data = {
        anything: 'anything'
      };

      checkPassed({ tenant: data }, done);
    });
  });
});
