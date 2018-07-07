import * as handlers from './handlers';

const objectSchema = Object.entries(handlers).reduce((map, [ name, obj ]) => {
  map[name] = obj.schema; //eslint-disable-line
  return map;
}, {});

export default {
  type: 'object',
  $schema: 'http://json-schema.org/draft-07/schema#',
  properties: {
    ...objectSchema,
    excludedRules: { type: 'array', items: { type: 'string' } }
  },
  additionalProperties: false
};
