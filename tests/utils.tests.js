const expect = require('expect');

const utils = require('../src/utils');


describe('#utils', function() {
  it('should unify scripts', function(done) {
    const data = [ {
      name: 'database',
      scripts: [
        {
          name: 'login',
          metadataFile: { b: 2 },
          scriptFile: { a: 1 }
        },
        {
          name: 'else',
          metadataFile: '{"b":2}',
          scriptFile: '{"a":1}'
        }
      ]
    } ];

    const expectation = [ {
      name: 'database',
      scripts: {
        login: {
          name: 'login',
          metadataFile: '{"b":2}',
          scriptFile: '{"a":1}'
        },
        else: {
          name: 'else',
          metadataFile: '{"b":2}',
          scriptFile: '{"a":1}'
        }
      }
    } ];

    expect(utils.unifyDatabases(data)).toEqual(expectation);
    done();
  });

  it('should parse json', function(done) {
    const string = '{ "a": 1 }';

    expect(utils.parseJsonFile('test', string)).toEqual({ a: 1 });
    done();
  });

  it('should throw error if cannot parse json', function(done) {
    const string = 'json?';

    expect(function() {
      utils.parseJsonFile('test', string);
    }).toThrow(/Error parsing JSON from metadata file: test/);
    done();
  });
});
