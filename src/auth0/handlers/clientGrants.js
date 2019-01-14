import DefaultHandler, { order } from './default';

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
    required: [ 'client_id', 'scope', 'audience' ]
  }
};


export default class ClientHandler extends DefaultHandler {
  constructor(config) {
    super({
      ...config,
      type: 'clientGrants',
      id: 'id',
      identifiers: [ 'id', [ 'client_id', 'audience' ] ],
      stripUpdateFields: [ 'audience', 'client_id' ]
    });
  }

  objString(item) {
    return super.objString({ id: item.id, client_id: item.client_id, audience: item.audience });
  }

  async getType() {
    if (this.existing) {
      return this.existing;
    }
    this.existing = this.client.clientGrants.getAll({ paginate: true });

    // Always filter out the client we are using to access Auth0 Management API
    // As it could cause problems if the grants are deleted or updated etc
    const currentClient = this.config('AUTH0_CLIENT_ID');

    this.existing = this.existing.filter(grant => grant.client_id !== currentClient);

    return this.existing;
  }

  async calcChanges(assets) {
    const { clientGrants } = assets;

    // Do nothing if not set
    if (!clientGrants || !clientGrants.length) return {};

    // Convert enabled_clients by name to the id
    const clients = await this.client.clients.getAll({ paginate: true });
    const formatted = assets.clientGrants.map((clientGrant) => {
      const grant = { ...clientGrant };
      const found = clients.find(c => c.name === grant.client_id);
      if (found) grant.client_id = found.client_id;
      return grant;
    });
    return super.calcChanges({ ...assets, clientGrants: formatted });
  }

  // Run after clients are updated so we can convert client_id names to id's
  @order('60')
  async processChanges(assets) {
    await super.processChanges(assets);
  }
}
