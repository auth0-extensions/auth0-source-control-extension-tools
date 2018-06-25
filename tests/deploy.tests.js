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
        htmlFile: '<html></html>'
      }
    },
    pages: {},
    databases: [],
    clients: {},
    resourceServers: {},
    configurables: {},
    rules: {}
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
});
