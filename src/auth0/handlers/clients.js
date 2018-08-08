import DefaultHandler from './default';
import { dumpJSON } from '../../utils';

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

  async processChanges(assets) {
    const changes = await this.calcChanges(assets);

    // Don't delete clients unless told as you cannot recover client_id's if deleted.
    const shouldDelete = this.config('AUTH0_ALLOW_CLIENT_DELETE') === 'true' || this.config('AUTH0_ALLOW_CLIENT_DELETE') === true;
    if (!shouldDelete) {
      if (changes.del.length > 0) {
        this.log(`WARNING: Detected the following clients should be deleted.
        Doing so will be prevent authentications using the client_id. You can force deletes by setting 'AUTH0_ALLOW_CLIENT_DELETE' to true in the config
        \n${dumpJSON(changes.del.map(client => ({ name: client.name, client_id: client.client_id })), 2)})
         `);
      }
      changes.del = [];
    }

    return super.processChanges(assets, { ...changes });
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
