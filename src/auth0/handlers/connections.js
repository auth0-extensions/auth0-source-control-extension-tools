import DefaultHandler, { order } from './default';
import { filterExcluded } from '../../utils';

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
    const excludedClientsByNames = (assets.exclude && assets.exclude.clients) || [];
    const excludedClients = excludedClientsByNames.map((clientName) => {
      const found = clients.find(c => c.name === clientName);
      return (found && found.client_id) || clientName;
    });

    const formatted = assets.connections.map(connection => ({
      ...connection,
      enabled_clients: [
        ...(connection.enabled_clients || []).map((name) => {
          const found = clients.find(c => c.name === name);
          if (found) return found.client_id;
          return name;
        }).filter(item => ![ ...excludedClientsByNames, ...excludedClients ].includes(item))
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

    const excludedConnections = (assets.exclude && assets.exclude.connections) || [];

    const changes = await this.calcChanges(assets);

    await super.processChanges(assets, filterExcluded(changes, excludedConnections));
  }
}
