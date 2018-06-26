const expect = require('expect');
// const Promise = require('bluebird');

const emailProviders = require('../../src/auth0/emailProviders');
// const constants = require('../../src/constants');

describe('#emailProviders', () => {
  let progress = null;

  beforeEach(() => {
    progress = {
      log: () => null
    };
  });

  describe('#getEmailProviderObject', () => {
    it('should return null if there is no file', () => {
      expect(emailProviders.getEmailProviderObject({ })).toNotExist();
    });

    it('should return null if there is no \'default\' file', () => {
      expect(emailProviders.getEmailProviderObject({ other: {} })).toNotExist();
    });

    it('should find the default provider', () => {
      const files = {
        default: {
          configFile: '{"name":"smtp"}'
        }
      };
      const object = emailProviders.getEmailProviderObject(files);
      expect(object.name).toEqual('smtp');
    });

    it('should replace mappings', () => {
      const files = {
        default: {
          configFile: '{"name":@@name@@}'
        }
      };
      const mappings = { name: 'smtp' };
      const object = emailProviders.getEmailProviderObject(files, mappings);
      expect(object.name).toEqual('smtp');
    });
  });

  describe('#updateEmailProvider', () => {
    it('should continue if \'default\' file does not exist', (done) => {
      emailProviders.updateEmailProvider(progress, null, { })
        .then(function(result) {
          expect(result).toExist();
          done();
        });
    });

    it('should update the provider correctly', (done) => {
      let payload = null;
      const auth0 = {
        emailProvider: {
          update(data) {
            payload = data;
            return Promise.resolve(true);
          }
        }
      };

      const files = {
        default: {
          name: 'default',
          configFile: '{"name":"smtp"}'
        }
      };

      emailProviders.updateEmailProvider(progress, auth0, files)
        .then(function(result) {
          expect(result).toEqual(true);
          expect(payload.name).toEqual('smtp');
          done();
        });
    });
  });
});
