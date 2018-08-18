import DefaultHandler, { order } from './default';
import constants from '../../constants';
import { dumpJSON } from '../../utils';
import log from '../../logger';

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

  didDelete(db) {
    return super.didDelete({ name: db.name, id: db.id });
  }

  didCreate(db) {
    return super.didCreate({ name: db.name, id: db.id });
  }

  didUpdate(db) {
    return super.didUpdate({ name: db.name, id: db.id });
  }

  getClientFN(fn) {
    // Override this as a database is actually a connection but we are treating them as a different object
    return Reflect.get(this.client.connections, fn, this.client.connections);
  }

  async getType() {
    if (this.existing) return this.existing;
    return this.client.connections.getAll({ strategy: 'auth0', paginate: true });
  }

  async calcChanges(assets) {
    const { databases } = assets;

    // Do nothing if not set
    if (!databases || !databases.length) return {};

    // Convert enabled_clients by name to the id
    const clients = await this.client.clients.getAll({ paginate: true });
    const formatted = databases.map(db => ({
      ...db,
      enabled_clients: [
        ...(db.enabled_clients || []).map((name) => {
          const found = clients.filter(c => c.name === name)[0];
          if (found) return found.client_id;
          return name;
        })
      ]
    }));

    return super.calcChanges({ ...assets, databases: formatted });
  }

  // Run after clients are updated so we can convert all the enabled_clients names to id's
  @order('60')
  async processChanges(assets) {
    const { databases } = assets;

    // Do nothing if not set
    if (!databases || !databases.length) return;

    const changes = await this.calcChanges(assets);

    // Don't delete databases unless told as it's destructive and will delete all associated users
    const shouldDelete = this.config('AUTH0_ALLOW_CONNECTION_DELETE') === 'true' || this.config('AUTH0_ALLOW_CONNECTION_DELETE') === true;
    if (!shouldDelete) {
      if (changes.del.length > 0) {
        log.warn(`Detected the following database connections should be deleted.
        Doing so will be delete all the associated users. You can force deletes by setting 'AUTH0_ALLOW_CONNECTION_DELETE' to true in the config
        \n${dumpJSON(changes.del.map(db => ({ name: db.name, id: db.id })), 2)})
         `);
      }
      changes.del = [];
    }

    await super.processChanges(assets, { ...changes });
  }
}
