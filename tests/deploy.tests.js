const expect = require('expect');
const deploy = require('../src/deploy');
const Promise = require('bluebird');

describe('#deploy', () => {
  const context = {
    init() {
      return Promise.resolve(true);
    },
    emailTemplates: {
      verify_email: {
        htmlFile: '<html></html>',
        name: 'verify_email'
      }
    },
    pages: {},
    databases: [],
    clients: {},
    resourceServers: {},
    configurables: {},
    rules: {},
    emailProviders: {
      default: {
        configFile: '{"name":"smtp"}',
        name: 'default'
      }
    }
  };

  const storage = {
    read: () => Promise.resolve({}),
    write: () => Promise.resolve({})
  };

  it('updates email templates', (done) => {
    const updatedTemplates = [];
    // function(progressData, context, client, storage, config, slackTemplate) {
    const progressData = {};
    const client = {
      emailTemplates: {
        update(paramsObj) {
          updatedTemplates.push(paramsObj.name);
          return Promise.resolve(true);
        }
      },
      emailProvider: {
        update: () => Promise.resolve(true)
      },
      rules: {
        getAll: () => Promise.resolve([])
      }
    };
    const config = () => {};
    const slackTemplate = {};
    deploy(progressData, context, client, storage, config, slackTemplate).then(() => {
      expect(updatedTemplates).toEqual([ 'verify_email' ]);
      done();
    });
  });

  it('updates email providers _before_ email templates', (done) => {
    const operations = [];
    let providerConfig = null;
    // function(progressData, context, client, storage, config, slackTemplate) {
    const progressData = {};
    const client = {
      emailProvider: {
        update(config) {
          providerConfig = config;
          operations.push('provider');
          return Promise.resolve(true);
        }
      },
      emailTemplates: {
        update() {
          operations.push('template');
          return Promise.resolve(true);
        }
      },
      rules: {
        getAll: () => Promise.resolve([])
      }
    };
    const config = () => {};
    const slackTemplate = {};
    deploy(progressData, context, client, storage, config, slackTemplate).then(() => {
      expect(providerConfig.name).toEqual('smtp');
      expect(operations).toEqual([ 'provider', 'template' ]);
      done();
    });
  });
});
