import DefaultHandler from './default';

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      key: { type: 'string', pattern: '^[A-Za-z0-9_-]*$' },
      value: { type: 'string' }
    }
  },
  additionalProperties: false
};

export default class RulesConfigsHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'rulesConfigs',
      id: 'key',
      functions: {
        update: 'set' // Update or Creation of a ruleConfig is via set not update
      }
    });
  }

  async getType() {
    // Not required to return blank
    return [];
  }

  didDelete(config) {
    return super.didDelete(config.value);
  }

  didCreate(config) {
    return super.didCreate(config.value);
  }

  didUpdate(config) {
    return super.didUpdate(config.value);
  }

  async calcChanges(assets) { // eslint-disable-line
    // Intention is to not delete/cleanup old configRules, that needs to be handled manually.
    return {
      del: [],
      update: assets.rulesConfigs,
      create: []
    };
  }
}
