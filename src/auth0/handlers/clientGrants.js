import DefaultHandler from './default';
import { order } from './default';

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      client_id: { type: 'string' },
      audience: { type: 'string' },
      scope: {
        type: 'array',
        items: { type: 'string' },
        uniqueItems: true
      }
    },
    require: [ 'name' ]
  }
};


export default class ClientHandler extends DefaultHandler {
  constructor(config) {
    super({
      ...config,
      type: 'clientGrants',
      id: 'id',
      identifiers: [ 'id', 'client_id' ],
      stripUpdateFields: [ 'audience', 'client_id' ]
    });
  }

  async getType() {
    if (this.existing) {
      return this.existing;
    }
    this.existing = this.client.clientGrants.getAll({ paginate: true });

    // Always filter out the client we are using to access Auth0 Management API
    // As it could cause problems if the grants are deleted or updated etc
    const currentClient = this.config('AUTH0_CLIENT_ID');
    return this.existing.filter(grant => grant.client_id !== currentClient);
  }

  async calcChanges(assets) {
    // Convert enabled_clients by name to the id
    const clients = await this.client.clients.getAll({ paginate: true });
    const formatted = assets.clientGrants.map((clientGrant) => {
      const grant = { ...clientGrant };
      const found = clients.filter(c => c.name === grant.client_id)[0];
      if (found) grant.client_id = found.client_id;
      return grant;
    });
    return super.calcChanges({ ...assets, clientGrants: formatted });
  }

  // Run after clients are updated so we can convert client_id names to id's
  @order('60')
  async processChanges(assets) {
    const changes = await this.calcChanges(assets);
    return super.processChanges(assets, { ...changes });
  }
}
