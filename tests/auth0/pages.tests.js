const expect = require('expect');
const Promise = require('bluebird');

const pages = require('../../src/auth0/pages');

describe('#pages', () => {
  let progress = null;
  const files = {
    login: {
      htmlFile: '<html>this is login</html>'
    },
    guardian_multifactor: {
      htmlFile: '<html>this is guardian</html>',
      metadata: true,
      metadataFile: '{ "enabled": "foo" }'
    },
    password_reset: {
      htmlFile: '<html>this is pwd reset</html>'
    },
    password_reset_with_metadata: {
      htmlFile: '<html>this is pwd reset 2</html>',
      metadata: true,
      metadataFile: '{ "enabled": false }'
    },
    password_reset_with_corrupt_metadata: {
      htmlFile: '<html>this is pwd reset 3</html>',
      metadata: true,
      metadataFile: '{ "enabled: false }'
    },
    error_page: {
      htmlFile: '<html>this is error page</html>'
    },
    error_page_disabled: {
      htmlFile: '<html>this is error page</html>',
      metadata: true,
      metadataFile: '{ "enabled": false }'
    },
    error_page_url: {
      htmlFile: '',
      metadata: true,
      metadataFile: '{ "enabled": false, "url": "https://mycompany.org/error" }'
    }
  };

  beforeEach(() => {
    progress = {
      log: () => null
    };
  });

  describe('#getGlobalClientId', () => {
    it('should return cached client_id', (done) => {
      progress.globalClientId = 'abc';

      pages.getGlobalClientId(progress, null)
        .then((clientId) => {
          expect(clientId).toEqual('abc');
          done();
        });
    });

    it('should call auth0 and get the global client', (done) => {
      const auth0 = {
        clients: {
          getAll() {
            return Promise.resolve([
              { client_id: '123', global: false },
              { client_id: '456', global: true },
              { client_id: '789', global: false }
            ]);
          }
        }
      };

      pages.getGlobalClientId(progress, auth0)
        .then((clientId) => {
          expect(clientId).toEqual('456');
          expect(clientId).toEqual(progress.globalClientId);
          done();
        });
    });
  });

  describe('#getPage', () => {
    it('should return null if page not found', () => {
      expect(pages.getPage({ }, 'foo')).toNotExist();
    });

    it('should return the correct page', () => {
      const page = pages.getPage(files, 'password_reset');
      expect(page).toExist();
      expect(page.html).toEqual('<html>this is pwd reset</html>');
    });

    it('should default to enabled', () => {
      const page = pages.getPage(files, 'password_reset');
      expect(page).toExist();
      expect(page.enabled).toExist();
    });

    it('should read status from metadata', () => {
      const page = pages.getPage(files, 'password_reset_with_metadata');
      expect(page).toExist();
      expect(page.enabled).toEqual(false);
      expect(page.metadata).toExist();
    });

    it('should handle metadata errors', () => {
      expect(function() { pages.getPage(files, 'password_reset_with_corrupt_metadata'); }).toThrow(/Error parsing JSON/);
    });
  });

  describe('#updatePasswordResetPage', () => {
    it('should continue if file does not exist', (done) => {
      pages.updatePasswordResetPage(progress, null, { })
        .then(function(result) {
          expect(result).toExist();
          done();
        });
    });

    it('should update tenant correctly', (done) => {
      let payload = null;
      const auth0 = {
        updateTenantSettings(data) {
          payload = data;
          return Promise.resolve(true);
        }
      };

      pages.updatePasswordResetPage(progress, auth0, files)
        .then(function() {
          expect(payload.change_password).toExist();
          expect(payload.change_password.enabled).toEqual(true);
          expect(payload.change_password.metadata).toNotExist();
          expect(payload.change_password.html).toEqual('<html>this is pwd reset</html>');
          done();
        });
    });
  });

  describe('#updateErrorPage', () => {
    it('should continue if file does not exist', (done) => {
      pages.updateErrorPage(progress, null, { })
        .then(function(result) {
          expect(result).toExist();
          done();
        });
    });

    it('should update tenant correctly', (done) => {
      let payload = null;
      const auth0 = {
        updateTenantSettings(data) {
          payload = data;
          return Promise.resolve(true);
        }
      };

      pages.updateErrorPage(progress, auth0, files)
        .then(function() {
          expect(payload.error_page).toExist();
          expect(payload.error_page.metadata).toNotExist();
          expect(payload.error_page.html).toEqual('<html>this is error page</html>');
          done();
        });
    });

    it('should remove html if disabled', (done) => {
      let payload = null;
      const auth0 = {
        updateTenantSettings(data) {
          payload = data;
          return Promise.resolve(true);
        }
      };

      pages.updateErrorPage(progress, auth0, { error_page: files.error_page_disabled })
        .then(function() {
          expect(payload.error_page).toExist();
          expect(payload.error_page.metadata).toNotExist();
          expect(payload.error_page.url).toEqual('');
          expect(payload.error_page.html).toEqual('');
          done();
        });
    });

    it('should remove html if disabled and set url if provided', (done) => {
      let payload = null;
      const auth0 = {
        updateTenantSettings(data) {
          payload = data;
          return Promise.resolve(true);
        }
      };

      pages.updateErrorPage(progress, auth0, { error_page: files.error_page_url })
        .then(function() {
          expect(payload.error_page).toExist();
          expect(payload.error_page.metadata).toNotExist();
          expect(payload.error_page.html).toEqual('');
          expect(payload.error_page.url).toEqual('https://mycompany.org/error');
          done();
        });
    });
  });

  describe('#updateLoginPage', () => {
    it('should continue if file does not exist', (done) => {
      pages.updateLoginPage(progress, null, { })
        .then(function(result) {
          expect(result).toExist();
          done();
        });
    });

    it('should update tenant correctly', (done) => {
      let updateFilter = null;
      let updatePayload = null;
      const auth0 = {
        clients: {
          update(filter, payload) {
            updateFilter = filter;
            updatePayload = payload;
            return Promise.resolve();
          },
          getAll() {
            return Promise.resolve([
              { client_id: '123', global: false },
              { client_id: '456', global: true },
              { client_id: '789', global: false }
            ]);
          }
        }
      };

      pages.updateLoginPage(progress, auth0, files)
        .then(function() {
          expect(updateFilter.client_id).toEqual('456');
          expect(updatePayload.custom_login_page_on).toEqual(true);
          expect(updatePayload.custom_login_page).toEqual('<html>this is login</html>');
          done();
        });
    });
  });

  describe('#updateGuardianMultifactorPage', () => {
    it('should continue if file does not exist', (done) => {
      pages.updateGuardianMultifactorPage(progress, null, { })
        .then(function(result) {
          expect(result).toExist();
          done();
        });
    });

    it('should update tenant correctly', (done) => {
      let payload = null;
      const auth0 = {
        updateTenantSettings(data) {
          payload = data;
          return Promise.resolve(true);
        }
      };

      pages.updateGuardianMultifactorPage(progress, auth0, files)
        .then(function() {
          expect(payload.guardian_mfa_page).toExist();
          expect(payload.guardian_mfa_page.enabled).toEqual('foo');
          expect(payload.guardian_mfa_page.html).toEqual('<html>this is guardian</html>');
          done();
        });
    });
  });

  describe('#updateAllPages', () => {
    it('should run all update functions', (done) => {
      pages.updatePages(progress, null, { })
        .then(function(result) {
          expect(result).toExist();
          done();
        });
    });
  });
});
