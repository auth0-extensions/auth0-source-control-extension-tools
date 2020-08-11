import DefaultHandler, { order } from './default';
import { filterExcluded, convertClientNameToId, convertClientNamesToIds } from '../../utils';

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

  getFormattedOptions(connection, clients) {
    try {
      return {
        options: {
          ...connection.options,
          idpinitiated: {
            ...connection.options.idpinitiated,
            client_id: convertClientNameToId(
              connection.options.idpinitiated.client_id,
              clients
            )
          }
        }
      };
    } catch (e) {
      return {};
    }
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
    const existingConexions = await this.client.connections.getAll();
    const excludedClientsByNames = (assets.exclude && assets.exclude.clients) || [];
    const excludedClients = convertClientNamesToIds(excludedClientsByNames, clients);
    const formatted = assets.connections.map((connection) => {
      const enabledClients = [
        ...convertClientNamesToIds(
          connection.enabled_clients || [],
          clients
        ).filter(
          item => ![ ...excludedClientsByNames, ...excludedClients ].includes(item)
        )
      ];
      // If client is excluded and in the existing connection this client is enabled, it should keep enabled
      // If client is excluded and in the existing connection this client is disabled, it should keep disabled
      existingConexions.forEach((conn) => {
        if (conn.name === connection.name) {
          excludedClients.forEach((excludedClient) => {
            if (conn.enabled_clients.includes(excludedClient)) {
              enabledClients.push(excludedClient);
            }
          });
        }
      });

      return ({
        ...connection,
        ...this.getFormattedOptions(connection, clients),
        enabled_clients: enabledClients
      });
    });
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
