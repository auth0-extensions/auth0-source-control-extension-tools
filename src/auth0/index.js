import Ajv from 'ajv/lib/ajv';

import pagedClient from './client';
import schema from './schema';
import * as handlers from './handlers';

const defaultOrder = 50;

function sortByOrder(toSort, stage) {
  const sorted = [ ...toSort ];
  sorted.sort((a, b) => {
    const aOrder = a[stage].order || defaultOrder;
    const bOrder = b[stage].order || defaultOrder;
    return aOrder - bOrder;
  });
  return sorted;
}


export default class Auth0 {
  constructor(client, assets, tracker, config) {
    this.client = pagedClient(client);
    this.tracker = tracker;
    this.config = config;
    this.assets = {
      excludedRules: assets.excluded_rules || []
    };
    this.handlers = [];
    Object.values(handlers).forEach((h) => {
      const handler = new h.default({ client: this.client, tracker, config });
      this.handlers.push(handler);

      // Set default asset value from schema
      if (h.schema) {
        let defaultValue = [];
        if (h.schema.type === 'object') defaultValue = {};
        this.assets[handler.type] = assets[handler.type] || defaultValue;
      }
    });
  }

  async runStage(stage) {
    // Sort by priority
    for (const handler of sortByOrder(this.handlers, stage)) { // eslint-disable-line
      try {
        const stageFn = Object.getPrototypeOf(handler)[stage];
        this.assets = {
          ...this.assets,
          ...await stageFn.apply(handler, [ this.assets ]) || {}
        };
      } catch (err) {
        throw new Error(`Error during ${stage} on ${handler.type} due to ${err}`);
      }
    }
  }

  async validate() {
    const ajv = new Ajv({ useDefaults: true });
    const valid = ajv.validate(schema, this.assets);
    if (!valid) {
      throw new Error(`Schema validation failed loading ${JSON.stringify(ajv.errors, null, 4)}`);
    }

    await this.runStage('validate');
  }

  async processChanges() {
    await this.runStage('processChanges');
  }
}
