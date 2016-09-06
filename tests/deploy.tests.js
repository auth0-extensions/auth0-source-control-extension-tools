const expect = require('expect');
const tools = require('../src/index');

describe('#constants', () => {
  it('should be exposed', () => {
    expect(tools.deploy).toExist();
  });
});

describe('#tryToDeploy', () => {
  it('should throw error', (done) => {
    try {
      tools.deploy();
    } catch (err) {
      expect(err).toExist();
      done();
    }
  });
});
