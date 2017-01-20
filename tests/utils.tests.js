const expect = require('chai').expect;

const utils = require('../src/utils');


describe('#utils', function() {
  it('should unify scripts', function(done) {
    const data = [ {
      name: 'database',
      scripts: [
        {
          name: 'login',
          htmlFile: '<html>@@hello@@</html>',
          metadataFile: { b: 2 },
          scriptFile: { a: 1 }
        },
        {
          name: 'else',
          metadataFile: '{"b":@@two@@}',
          scriptFile: 'console.log(@@hello@@);'
        }
      ]
    } ];

    const mappings = {
      hello: 'goodbye',
      two: 2
    };

    const expectation = [ {
      name: 'database',
      scripts: {
        login: {
          name: 'login',
          htmlFile: '<html>"goodbye"</html>',
          metadataFile: '{"b":2}',
          scriptFile: '{"a":1}'
        },
        else: {
          name: 'else',
          metadataFile: '{"b":2}',
          scriptFile: 'console.log("goodbye");'
        }
      }
    } ];

    expect(utils.unifyDatabases(data, mappings)).to.deep.equal(expectation);
    done();
  });

  it('should unify configs', function(done) {
    const data = [
      {
        name: 'client1',
        metadataFile: { b: 2 },
        configFile: { a: 1 }
      },
      {
        name: 'client2',
        metadataFile: '{"b":@@two@@}',
        configFile: '{"a":1}'
      }
    ];

    const expectation = {
      client1: {
        name: 'client1',
        metadataFile: '{"b":2}',
        configFile: '{"a":1}'
      },
      client2: {
        name: 'client2',
        metadataFile: '{"b":2}',
        configFile: '{"a":1}'
      }
    };

    expect(utils.unifyScripts(data, { two: 2 })).to.deep.equal(expectation);
    done();
  });

  it('should parse json', function(done) {
    const string = '{ "a": 1 }';

    expect(utils.parseJsonFile('test', string)).to.deep.equal({ a: 1 });
    done();
  });

  it('should parse json with keyword replacement mappings', function(done) {
    const mappings = {
      string: 'some string',
      array: [
        'some value',
        'some other value'
      ],
      object: {
        key1: 'value1',
        key2: 'value2'
      },
      int: 5
    };
    const contents = '{ "a": 1, "string_key": @@string@@, "array_key": @@array@@, "object_key": @@object@@, "int_key": @@int@@ }';
    const expectations = {
      a: 1,
      string_key: 'some string',
      array_key: [
        'some value',
        'some other value'
      ],
      object_key: {
        key1: 'value1',
        key2: 'value2'
      },
      int_key: 5
    };
    expect(utils.parseJsonFile('test2', contents, mappings)).to.deep.equal(expectations);
    done();
  });

  it('should throw error if cannot parse json', function(done) {
    const string = 'json?';

    expect(function() {
      utils.parseJsonFile('test', string);
    }).to.throw(/Error parsing JSON from metadata file: test/);
    done();
  });
});
