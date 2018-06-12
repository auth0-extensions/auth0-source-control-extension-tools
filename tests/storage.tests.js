const Promise = require('bluebird');
const store = require('../src/storage');

describe('#write logs to storage', () => {
  it('should update logs with 10 or less records', (done) => {
    const storage = {
      read: () => Promise.resolve({}),
      write: () => Promise.resolve({})
    };

    store(storage, '').then(() => done());
  });

  it('should update logs with 11 or more records', (done) => {
    const storage = {
      read: () => Promise.resolve({ deployments: [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ] }),
      write: () => Promise.resolve({})
    };

    store(storage, '').then(() => done());
  });
});