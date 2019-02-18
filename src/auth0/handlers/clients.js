import DefaultHandler from './default';

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, pattern: '[^<>]+' }
    },
    required: [ 'name' ]
  }
};


export default class ClientHandler extends DefaultHandler {
  constructor(config) {
    super({
      ...config,
      type: 'clients',
      id: 'client_id',
      identifiers: [ 'client_id', 'name' ],
      stripUpdateFields: [
        // Fields not allowed during updates
        'callback_url_template', 'signing_keys', 'global', 'tenant', 'jwt_configuration.secret_encoded'
      ]
    });
  }

  objString(item) {
    return super.objString({ name: item.name, client_id: item.client_id });
  }

  async processChanges(assets) {
    const { clients } = assets;

    // Do nothing if not set
    if (!clients) return;

    const {
      del, update, create, conflicts
    } = await this.calcChanges(assets);

    // Always filter out the client we are using to access Auth0 Management API
    // As it could cause problems if it gets deleted or updated etc
    const currentClient = this.config('AUTH0_CLIENT_ID');
    const changes = {
      del: del.filter(c => c.client_id !== currentClient),
      update: update.filter(c => c.client_id !== currentClient),
      create: create.filter(c => c.client_id !== currentClient),
      conflicts: conflicts.filter(c => c.client_id !== currentClient)
    };

    await super.processChanges(assets, {
      ...changes
    });
  }

  async getType() {
    if (this.existing) {
      return this.existing;
    }
    this.existing = await this.client.clients.getAll({ paginate: true, is_global: false });
    return this.existing;
  }
}
