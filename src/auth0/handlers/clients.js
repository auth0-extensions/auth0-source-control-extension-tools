import DefaultHandler from './default';

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, pattern: '[^<>]+' }
    },
    require: [ 'name' ]
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

  didDelete(client) {
    return super.didDelete({ name: client.name, client_id: client.client_id });
  }

  didCreate(client) {
    return super.didCreate({ name: client.name, client_id: client.client_id });
  }

  didUpdate(client) {
    return super.didUpdate({ name: client.name, client_id: client.client_id });
  }


  async getType() {
    if (this.existing) {
      return this.existing;
    }
    this.existing = await this.client.getClients({ paginate: true, is_global: false });

    // Always filter out the client we are using to access Auth0 Management API
    // As it could cause problems if it gets deleted or updated etc
    const currentClient = this.config('AUTH0_CLIENT_ID');
    return this.existing.filter(c => c.client_id !== currentClient);
  }
}
