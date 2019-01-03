import DefaultHandler, { order } from './default';
import constants from '../../constants';

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      strategy: { type: 'string', enum: [ 'auth0' ], default: 'auth0' },
      name: { type: 'string' },
      options: {
        type: 'object',
        properties: {
          customScripts: {
            type: 'object',
            properties: {
              ...constants.DATABASE_SCRIPTS.reduce((o, script) => ({ ...o, [script]: { type: 'string' } }), {})
            },
            require: [ 'login', 'get_user' ]
          }
        }
      }
    },
    require: [ 'name', 'import_mode' ]
  }
};


export default class DatabaseHandler extends DefaultHandler {
  constructor(config) {
    super({
      ...config,
      type: 'databases',
      stripUpdateFields: [ 'strategy', 'name' ]
    });
  }

  objString(db) {
    return super.objString({ name: db.name, id: db.id });
  }

  getClientFN(fn) {
    // Override this as a database is actually a connection but we are treating them as a different object
    // If we going to update database, we need to get current options first
    if (fn === this.functions.update) {
      return (params, payload) => this.client.connections.get(params)
        .then((connection) => {
          payload.options = Object.assign({}, connection.options, payload.options);
          return this.client.connections.update(params, payload);
        });
    }

    return Reflect.get(this.client.connections, fn, this.client.connections);
  }

  async getType() {
    if (this.existing) return this.existing;
    this.existing = this.client.connections.getAll({ strategy: 'auth0', paginate: true });

    return this.existing;
  }

  async calcChanges(assets) {
    const { databases } = assets;

    // Do nothing if not set
    if (!databases || !databases.length) return {};

    // Convert enabled_clients by name to the id
    const clients = await this.client.clients.getAll({ paginate: true });
    const formatted = databases.map((db) => {
      if (db.enabled_clients) {
        return {
          ...db,
          enabled_clients: db.enabled_clients.map((name) => {
            const found = clients.find(c => c.name === name);
            if (found) return found.client_id;
            return name;
          })
        };
      }

      return db;
    });

    return super.calcChanges({ ...assets, databases: formatted });
  }

  // Run after clients are updated so we can convert all the enabled_clients names to id's
  @order('60')
  async processChanges(assets) {
    const { databases } = assets;

    // Do nothing if not set
    if (!databases || !databases.length) return;

    await super.processChanges(assets);
  }
}
