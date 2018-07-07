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
    this.assets = {
      clients: assets.clients || [],
      databases: assets.databases || [],
      connections: assets.connections || [],
      pages: assets.pages || [],
      resourceServers: assets.resourceServers || [],
      rules: assets.rules || [],
      rulesConfigs: assets.rulesConfigs || [],
      excludedRules: assets.excluded_rules || []
    };
    this.tracker = tracker;
    const options = { client: this.client, tracker, config };
    this.handlers = Object.values(handlers).map(h => new h.default(options));
    this.stats = {};
    this.config = config;
  }

  async runStage(stage) {
    // Sort by priority
    for (const handler of sortByOrder(this.handlers, stage)) { // eslint-disable-line
      const stageFn = Object.getPrototypeOf(handler)[stage];
      this.assets = {
        ...this.assets,
        ...await stageFn.apply(handler, [ this.assets ]) || {}
      };
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
