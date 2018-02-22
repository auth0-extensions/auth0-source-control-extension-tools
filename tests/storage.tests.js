const crypto = require('crypto');
const expect = require('expect');
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
});

describe('#write logs to storage', () => {
  it('should remove oldest logs and push news deploy to history', (done) => {
    const storage = {
      read: () => Promise.resolve({ deployments: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16 ] }),
      write: (newData) => {
        expect(newData.deployments.length).toBe(10);
        expect(newData.deployments[0]).toBe(8);
        return Promise.resolve({});
      }
    };

    store(storage, '').then(() => done());
  });

  it('should remove oldest history when total history size exceeds 490KB, but not exceed length', (done) => {
    var deployments = [];

    // Generate 9 random strings of 54,444 bytes.
    deployments.push(crypto.randomBytes(27222).toString('hex'));
    deployments.push(crypto.randomBytes(27222).toString('hex'));
    deployments.push(crypto.randomBytes(27222).toString('hex'));
    deployments.push(crypto.randomBytes(27222).toString('hex'));
    deployments.push(crypto.randomBytes(27222).toString('hex'));
    deployments.push(crypto.randomBytes(27222).toString('hex'));
    deployments.push(crypto.randomBytes(27222).toString('hex'));
    deployments.push(crypto.randomBytes(27222).toString('hex'));
    deployments.push(crypto.randomBytes(27222).toString('hex'));

    const storage = {
      read: () => Promise.resolve({
        deployments: deployments
      }),
      write: (newData) => {
        expect(newData.deployments.length).toBe(9);
        expect(newData.deployments[newData.deployments.length - 1]).toBe('test');
        return Promise.resolve({});
      }
    };

    store(storage, 'test').then(() => done());
  });
});
