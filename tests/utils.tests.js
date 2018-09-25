import path from 'path';
import { expect } from 'chai';
import * as utils from '../src/utils';

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

const expectations = {
  a: 1,
  array_key: [
    'some value',
    'some other value'
  ],
  int_key: 5,
  object_key: {
    key1: 'value1',
    key2: 'value2'
  },
  simple_array_key: 'Some\'some value,some other value',
  simple_int_key: 5,
  simple_object_key: 'Some [object Object]',
  simple_string_key: 'Some some string',
  string_key: 'some string'
};

describe('#utils', function() {
  it('should load file', () => {
    const file = path.resolve(__dirname, 'test.file.json');
    const loaded = utils.loadFile(file, mappings);
    expect(JSON.parse(loaded)).to.deep.equal(expectations);
  });

  it('should throw error if cannot load file', () => {
    expect(function() {
      utils.loadFile('notexist.json', mappings);
    }).to.throw(/Unable to load file.*/);
  });

  it('should do keyword replacements', (done) => {
    const kwContents = '{ "a": 1, "string_key": @@string@@, "array_key": @@array@@, "object_key": @@object@@,' +
      ' "int_key": @@int@@, "simple_string_key": "Some ##string##", "simple_array_key": "Some' +
      ' ##array##", "simple_object_key": "Some ##object##", "simple_int_key": ##int## }';

    const kwExpectations = '{ "a": 1, "string_key": "some string", "array_key": ["some value","some other value"],' +
      ' "object_key": {"key1":"value1","key2":"value2"}, "int_key": 5, "simple_string_key": "Some some string",' +
      ' "simple_array_key": "Some some value,some other value", "simple_object_key": "Some [object Object]",' +
      ' "simple_int_key": 5 }';

    expect(utils.keywordReplace(kwContents, mappings)).to.deep.equal(kwExpectations);
    done();
  });

  it('should flatten', () => {
    const flat = utils.flatten([ [ 1, 2 ], [ 3, 4 ] ]);
    expect(flat).to.deep.equal([ 1, 2, 3, 4 ]);
  });

  it('should dump json', () => {
    expect(utils.dumpJSON(expectations, 2)).to.deep.equal(JSON.stringify(expectations, null, 2));
  });

  it('should strip fields', () => {
    const obj = {
      a: 'field',
      other: {
        deep: 'field'
      }
    };
    expect(utils.stripFields(obj, [ 'a', 'other.deep' ])).to.deep.equal({ other: {} });
  });

  it('should duplicate items', () => {
    const items = [
      { id: '1', test: 'aa' },
      { id: '1', test: 'zz' },
      { id: '2', test: 'bb' },
      { id: '3', test: 'cc' }
    ];

    const duplicates = [
      [
        { id: '1', test: 'aa' },
        { id: '1', test: 'zz' }
      ]
    ];

    expect(utils.duplicateItems(items, 'id')).to.deep.equal(duplicates);
  });
});

describe('#utils calcChanges', () => {
  it('should calc create', () => {
    const existing = [ { name: 'Name1', id: 'id1' } ];
    const assets = [
      { name: 'Name1', id: 'id3' },
      { name: 'Create1', id: 'Create1' }
    ];

    const { create } = utils.calcChanges(assets, existing, [ 'id', 'name' ]);

    expect(create).to.have.length(1);
    expect(create).to.deep.include({ name: 'Create1', id: 'Create1' });
  });

  it('should calc delete', () => {
    const existing = [
      { name: 'Name1', id: 'id3' },
      { name: 'Delete1', id: 'Delete1' }
    ];
    const assets = [ { name: 'Name1', id: 'id1' } ];

    const { del } = utils.calcChanges(assets, existing, [ 'id', 'name' ]);

    expect(del).to.have.length(1);
    expect(del).to.deep.include({ name: 'Delete1', id: 'Delete1' });
  });

  it('should calc update', () => {
    const existing = [
      { name: 'Name1', id: 'id3' },
      { name: 'Delete1', id: 'Delete1' }
    ];
    const assets = [ { name: 'Name1', id: 'id1' } ];

    const { del } = utils.calcChanges(assets, existing, [ 'id', 'name' ]);

    expect(del).to.have.length(1);
    expect(del).to.deep.include({ name: 'Delete1', id: 'Delete1' });
  });
});
