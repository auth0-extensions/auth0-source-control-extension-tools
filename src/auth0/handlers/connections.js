import DefaultHandler, { order } from './default';

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      strategy: { type: 'string' },
      options: { type: 'object' },
      enabled_clients: { type: 'array', items: { type: 'string' } },
      realms: { type: 'array', items: { type: 'string' } },
      metadata: { type: 'object' }
    },
    required: [ 'name', 'strategy' ]
  }
};


export default class ConnectionsHandler extends DefaultHandler {
  constructor(config) {
    super({
      ...config,
      type: 'connections',
      stripUpdateFields: [ 'strategy', 'name' ]
    });
  }

  objString(connection) {
    return super.objString({ name: connection.name, id: connection.id });
  }

  async getType() {
    if (this.existing) return this.existing;
    const connections = await this.client.connections.getAll({ paginate: true });
    // Filter out database connections
    this.existing = connections.filter(c => c.strategy !== 'auth0');

    return this.existing;
  }

  async calcChanges(assets) {
    const { connections } = assets;

    // Do nothing if not set
    if (!connections) return {};

    // Convert enabled_clients by name to the id
    const clients = await this.client.clients.getAll({ paginate: true });
    const formatted = assets.connections.map(connection => ({
      ...connection,
      enabled_clients: [
        ...(connection.enabled_clients || []).map((name) => {
          const found = clients.find(c => c.name === name);
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
    const { connections } = assets;

    // Do nothing if not set
    if (!connections) return;

    await super.processChanges(assets);
  }
}
