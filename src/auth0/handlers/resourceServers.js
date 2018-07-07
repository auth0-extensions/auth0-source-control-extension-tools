import { ValidationError } from 'auth0-extension-tools';

import constants from '../../constants';
import DefaultHandler from './default';

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      identifier: { type: 'string' },
      scopes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' }
          }
        }
      }
    },
    require: [ 'name', 'identifier' ]
  }
};


export default class ResourceServersHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'resourceServers',
      stripUpdateFields: [ 'identifier' ] // Fields not allowed in updates
    });
  }


  didDelete(resourceServer) {
    return super.didDelete({ name: resourceServer.name, identifier: resourceServer.identifier });
  }

  didCreate(resourceServer) {
    return super.didCreate({ name: resourceServer.name, identifier: resourceServer.identifier });
  }

  didUpdate(resourceServer) {
    return super.didUpdate({ name: resourceServer.name, identifier: resourceServer.identifier });
  }

  async getType() {
    if (this.existing) return this.existing;
    const resourceServers = await this.client.resourceServers.getAll({ paginate: true });
    return resourceServers.filter(rs => rs.name !== constants.RESOURCE_SERVERS_MANAGEMENT_API_NAME);
  }

  async validate(assets) {
    const { resourceServers } = assets;

    const mgmtAPIResource = resourceServers.filter(r => r.name === constants.RESOURCE_SERVERS_MANAGEMENT_API_NAME)[0];
    if (mgmtAPIResource) {
      throw new ValidationError(`You can not configure the '${constants.RESOURCE_SERVERS_MANAGEMENT_API_NAME}.`);
    }

    return super.validate(assets);
  }

}
