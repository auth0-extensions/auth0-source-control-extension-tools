import DefaultHandler, { order } from './default';
import { dumpJSON } from '../../utils';

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      strategy: { type: 'string' },
      options: { type: 'object' }
    },
    enabled_clients: { type: 'array', items: { type: 'string' } },
    realms: { type: 'array', items: { type: 'string' } },
    metadata: { type: 'object' }
  },
  require: [ 'name', 'strategy' ]
};


export default class ConnectionsHandler extends DefaultHandler {
  constructor(config) {
    super({
      ...config,
      type: 'connections',
      stripUpdateFields: [ 'strategy', 'name' ]
    });
  }

  didDelete(connection) {
    return super.didDelete({ name: connection.name, id: connection.id });
  }

  didCreate(connection) {
    return super.didCreate({ name: connection.name, id: connection.id });
  }

  didUpdate(connection) {
    return super.didUpdate({ name: connection.name, id: connection.id });
  }

  async getType() {
    if (this.existing) return this.existing;
    const connections = await this.client.connections.getAll({ paginate: true });
    // Filter out database connections
    return connections.filter(c => c.strategy !== 'auth0');
  }

  async calcChanges(assets) {
    // Convert enabled_clients by name to the id
    const clients = await this.client.clients.getAll({ paginate: true });
    const formatted = assets.connections.map(connection => ({
      ...connection,
      enabled_clients: [
        ...(connection.enabled_clients || []).map((name) => {
          const found = clients.filter(c => c.name === name)[0];
          if (found) return found.client_id;
          return name;
        })
      ]
    }));

    return super.calcChanges({ ...assets, connections: formatted });
  }


  // Run after clients are updated so we can convert all the enabled_clients names to id's
  @order('60')
  async processChanges(assets) {
    const changes = await this.calcChanges(assets);

    // Don't delete connections unless told as it's destructive and will delete all associated users
    const shouldDelete = this.config('AUTH0_ALLOW_CONNECTION_DELETE') === 'true' || this.config('AUTH0_ALLOW_CONNECTION_DELETE') === true;
    if (!shouldDelete) {
      if (changes.del.length > 0) {
        this.log(`WARNING: Detected the following connections should be deleted.
        Doing so will be delete all the associated users. You can force deletes by setting 'AUTH0_ALLOW_CONNECTION_DELETE' to true in the config
        \n${dumpJSON(changes.del.map(db => ({ name: db.name, id: db.id })), 2)})
         `);
      }
      changes.del = [];
    }

    return super.processChanges(assets, { ...changes });
  }
}
