const expect = require('chai').expect;

const utils = require('../src/utils');


describe('#utils', function() {
  it('should unify database scripts', function(done) {
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

  it('should read configuration when unifying database scripts', function(done) {
    const data = [ {
      name: 'database',
      scripts: [],
      configurationFile: '{"hello":@@hello@@}',
      configurationFileName: 'configuration.json'
    } ];

    const mappings = {
      hello: 'goodbye'
    };

    const expectation = [ {
      name: 'database',
      scripts: {},
      configuration: {
        hello: 'goodbye'
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

  it('should parse json with keyword replacement mappings, new method', function(done) {
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

    const contents = '{ "a": 1, "string_key": @@string@@, "array_key": @@array@@, "object_key": @@object@@,' +
      ' "int_key": @@int@@, "simple_string_key": "Some ##string##", "simple_array_key": "Some' +
      ' ##array##", "simple_object_key": "Some ##object##", "simple_int_key": ##int## }';
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
      int_key: 5,
      simple_string_key: 'Some some string',
      simple_array_key: 'Some some value,some other value',
      simple_object_key: 'Some [object Object]',
      simple_int_key: 5
    };
    expect(utils.parseJsonFile('test2.5', contents, mappings)).to.deep.equal(expectations);
    done();
  });

  it('should throw error if cannot parse json', function(done) {
    const string = 'json?';

    expect(function() {
      utils.parseJsonFile('test', string);
    }).to.throw(/Error parsing JSON from metadata file: test/);
    done();
  });

  it('should reduce stringified JSON with array of parameter names', function(done) {
    const object = {
      prop1: 'value 1',
      prop2: 'value 2',
      prop3: 'value 3',
      prop4: 'value 4',
      prop5: 'value 5',
      prop6: {
        prop1: 'value 1',
        prop2: 'value 2',
        prop3: 'value 3'
      }
    };

    const expectation = {
      prop1: 'value 1',
      prop2: 'value 2',
      prop3: '5e2d78eb5107622b5441f53ac317fe431cebbfc2a04036c4ed820e11d54d6d1c',
      prop4: 'value 4',
      prop5: '3db104a9dc47163e43226d0b25c4cabf082d1813a80d4d217b75a9c2b1e49ae8',
      prop6: {
        prop1: 'value 1',
        prop2: 'value 2',
        prop3: '5e2d78eb5107622b5441f53ac317fe431cebbfc2a04036c4ed820e11d54d6d1c'
      }
    };

    const json = JSON.stringify(object, utils.checksumReplacer([ 'prop3', 'prop5' ]));
    const reducedObject = JSON.parse(json);

    expect(reducedObject).to.deep.equal(expectation);
    done();
  });

  it('should reduce stringified JSON with a single parameter name as a string', function(done) {
    const object = {
      prop1: 'value 1',
      prop2: 'value 2',
      prop3: 'value 3',
      prop4: 'value 4',
      prop5: 'value 5',
      prop6: {
        prop1: 'value 1',
        prop2: 'value 2',
        prop3: 'value 3'
      }
    };

    const expectation = {
      prop1: 'value 1',
      prop2: 'value 2',
      prop3: '5e2d78eb5107622b5441f53ac317fe431cebbfc2a04036c4ed820e11d54d6d1c',
      prop4: 'value 4',
      prop5: 'value 5',
      prop6: {
        prop1: 'value 1',
        prop2: 'value 2',
        prop3: '5e2d78eb5107622b5441f53ac317fe431cebbfc2a04036c4ed820e11d54d6d1c'
      }
    };

    const json = JSON.stringify(object, utils.checksumReplacer('prop3'));
    const reducedObject = JSON.parse(json);

    expect(reducedObject).to.deep.equal(expectation);
    done();
  });

  it('should not impact stringified JSON with unspecified properties', function(done) {
    const object = {
      prop1: 'value 1',
      prop2: 'value 2',
      prop3: 'value 3',
      prop4: 'value 4',
      prop5: 'value 5',
      prop6: {
        prop1: 'value 1',
        prop2: 'value 2',
        prop3: 'value 3'
      }
    };

    const json = JSON.stringify(object, utils.checksumReplacer());
    const reducedObject = JSON.parse(json);

    expect(reducedObject).to.deep.equal(object);
    done();
  });
});
