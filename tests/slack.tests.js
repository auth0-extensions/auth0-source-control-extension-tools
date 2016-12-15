const slack = require('../src/slack');

describe('#slack', () => {
  it('should ignore call without webhook url', (done) => {
    const url = 'http://127.0.0.1/';
    const progress = {};
    const template = {};

    slack(progress, template, url).then(() => done());
  });

  it('should send success message (full) to slack', (done) => {
    const url = 'http://127.0.0.1/';
    const progress = {
      log: () => null,
      connectionsUpdated: 1,
      rulesCreated: 1,
      rulesUpdated: 1,
      rulesDeleted: 1,
      configurables: {
        clients: {
          created: 1,
          deleted: 1,
          updated: 1
        },
        resourceServers: {
          created: 1,
          deleted: 1,
          updated: 1
        }
      }
    };
    const template = {};

    slack(progress, template, url, url).then(() => {
      done();
    });
  });

  it('should send success message (shorten) to slack', (done) => {
    const url = 'http://127.0.0.1/';
    const progress = {
      log: () => null
    };
    const template = {};

    slack(progress, template, url, url).then(() => {
      done();
    });
  });

  it('should send error message to slack', (done) => {
    const url = 'http://127.0.0.1/';
    const progress = {
      log: () => null,
      error: { message: 'test' }
    };
    const template = {};

    slack(progress, template, url, url).then(() => {
      done();
    });
  });
});
