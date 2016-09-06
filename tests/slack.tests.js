const expect = require('expect');
const slack = require('../src/slack');

describe('#slack', () => {
  it('should ignore call without webhook url', (done) => {
    const url = 'http://127.0.0.1/';
    const progress = {};

    slack(progress, url).then(() => done());
  });

  it('should send success message (full) to slack', (done) => {
    const url = 'http://127.0.0.1/';
    const progress = {
      log: () => null,
      connectionsUpdated: 1,
      rulesCreated: 1,
      rulesUpdated: 1,
      rulesDeleted: 1
    };

    slack(progress, url, url).catch((err) => {
      expect(err).toExist();
      done();
    });
  });

  it('should send success message (shorten) to slack', (done) => {
    const url = 'http://127.0.0.1/';
    const progress = {
      log: () => null
    };

    slack(progress, url, url).catch((err) => {
      expect(err).toExist();
      done();
    });
  });

  it('should send error message to slack', (done) => {
    const url = 'http://127.0.0.1/';
    const progress = {
      log: () => null,
      error: { message: 'test' }
    };

    slack(progress, url, url).catch((err) => {
      expect(err).toExist();
      done();
    });
  });
});

