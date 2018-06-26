const expect = require('expect');
const Promise = require('bluebird');

const emailTemplates = require('../../src/auth0/emailTemplates');
const constants = require('../../src/constants');

describe('#emailTemplates', () => {
  let progress = null;
  const files = {
    verify_email: {
      htmlFile: 'this is verify_email'
    },
    verify_email_with_metadata: {
      htmlFile: 'this is verify_email_with_template',
      metadata: true,
      metadataFile: '{ "enabled": "foo" }'
    },
    verify_email_with_mapping: {
      htmlFile: 'this is verify_email_with_mapping',
      metadata: true,
      metadataFile: '{ "enabled": ##iz_enabled## }'
    }
  };

  beforeEach(() => {
    progress = {
      log: () => null
    };
  });

  describe('#getEmailTemplateObject', () => {
    it('should return null if template not found', () => {
      expect(emailTemplates.getEmailTemplateObject({ }, 'foo')).toNotExist();
    });

    it('should return the correct template', () => {
      const tpl = emailTemplates.getEmailTemplateObject(files, 'verify_email');
      expect(tpl).toExist();
      expect(tpl.body).toEqual('this is verify_email');
    });

    it('should default to disabled', () => {
      const tpl = emailTemplates.getEmailTemplateObject(files, 'verify_email');
      expect(tpl).toExist();
      expect(tpl.enabled).toEqual(false);
    });

    it('should read enabled status from metadata', () => {
      const tpl = emailTemplates.getEmailTemplateObject(files, 'verify_email_with_metadata');
      expect(tpl).toExist();
      expect(tpl.enabled).toEqual('foo');
    });

    it('should apply mappings', () => {
      const mappings = { iz_enabled: false };
      const tpl = emailTemplates.getEmailTemplateObject(files, 'verify_email_with_mapping', mappings);
      expect(tpl).toExist();
      expect(tpl.enabled).toEqual(false);
    });
  });

  describe('#updateEmailTemplateByName', () => {
    it('should continue if file does not exist', (done) => {
      emailTemplates.updateEmailTemplateByName(progress, null, { }, 'verify_email')
        .then(function(result) {
          expect(result).toExist();
          done();
        });
    });

    it('should update template correctly', (done) => {
      let payload = null;
      let paramsObj = null;
      const auth0 = {
        emailTemplates: {
          update(params, data) {
            paramsObj = params;
            payload = data;
            return Promise.resolve(true);
          }
        }
      };

      emailTemplates.updateEmailTemplateByName(progress, auth0, files, 'verify_email')
        .then(function() {
          expect(paramsObj.name).toEqual('verify_email');
          expect(payload.body).toEqual('this is verify_email');
          done();
        });
    });
  });

  describe('#updateAllEmailTemplates', () => {
    let callCount = 0;
    const myFiles = {};
    constants.EMAIL_TEMPLATE_NAMES.forEach((name) => {
      myFiles[name] = { htmlFile: '<html>', metadata: true, metadataFile: '{"enabled":true}' };
    });
    const auth0 = {
      emailTemplates: {
        update: function() {
          callCount += 1;
          return Promise.resolve(true);
        }
      }
    };
    it('should update all email template types', (done) => {
      emailTemplates.updateAllEmailTemplates(progress, auth0, myFiles)
        .then(function(result) {
          expect(result).toExist();
          expect(callCount).toEqual(constants.EMAIL_TEMPLATE_NAMES.length);
          done();
        });
    });
  });
});
