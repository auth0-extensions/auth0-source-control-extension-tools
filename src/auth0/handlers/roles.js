import DefaultHandler, { order } from './default';
import { calcChanges } from '../../utils';
import log from '../../logger';

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      id: { type: 'string' },
      description: { type: 'string' },
      permissions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            permission_name: { type: 'string' },
            resource_server_identifier: { type: 'string' }
          }
        }
      }
    },
    required: [ 'name' ]
  }
};

export default class RoleHandler extends DefaultHandler {
  constructor(config) {
    super({
      ...config,
      type: 'roles',
      id: 'id',
      identifiers: [ 'name' ]
    });
  }

  objString(item) {
    return super.objString({ name: item.name, id: item.id, description: item.description });
  }

  async getType() {
    if (this.existing) {
      return this.existing;
    }

    const roles = await this.client.roles.getAll();
    for (let index = 0; index < roles.length; index++) {
      const permissions = await this.client.roles.permissions.get({ id: roles[index].id });
      const strippedPerms = await Promise.all(permissions.map(async (permission) => {
        delete permission.resource_server_name;
        delete permission.description;
        return permission;
      }));
      roles[index].permissions = strippedPerms;
    }
    this.existing = roles;
    return this.existing;
  }

  @order('60')
  async processChanges(assets) {
    const { roles } = assets;

    // Do nothing if not set
    if (!roles) return;

    // Gets roles from destination tenant
    const existing = await this.getType();
    const changes = calcChanges(roles, existing, [ 'id', 'name' ]);

    log.debug(`Start processChanges for roles [delete:${changes.del.length}] [update:${changes.update.length}], [create:${changes.create.length}]`);

    await Promise.all(changes.create.map(async (createRole) => {
      const data = { ...createRole };
      delete data.permissions;
      const created = await this.client.roles.create(data);
      if (typeof createRole.permissions !== 'undefined' && createRole.permissions.length > 0) await this.client.roles.permissions.create({ id: created.id }, { permissions: createRole.permissions });
      this.didCreate(created);
      this.created += 1;
    }));

    await Promise.all(changes.update.map(async (updateRole) => {
      const data = await roles.find(roleDataForUpdate => roleDataForUpdate.name === updateRole.name);
      const params = { id: updateRole.id };
      const newPermissions = data.permissions;
      delete data.permissions;
      await this.client.roles.update(params, data);

      if (typeof updateRole.permissions !== 'undefined' && updateRole.permissions.length > 0) {
        const deleteAllowed = this.config.AUTH0_ALLOW_DELETE;
        if (!deleteAllowed) this.config.AUTH0_ALLOW_DELETE = true;
        await this.client.roles.permissions.delete(params, { permissions: updateRole.permissions });
        if (!deleteAllowed) this.config.AUTH0_ALLOW_DELETE = false;
      }
      if (typeof newPermissions !== 'undefined' && newPermissions.length > 0) await this.client.roles.permissions.create(params, { permissions: newPermissions });

      this.didUpdate(params);
      this.updated += 1;
    }));

    if (changes.del.length > 0) {
      const shouldDelete = this.config('AUTH0_ALLOW_DELETE') === 'true' || this.config('AUTH0_ALLOW_DELETE') === true;
      if (!shouldDelete) {
        log.warn(`Detected the following roles should be deleted. Doing so may be destructive.\nYou can enable deletes by setting 'AUTH0_ALLOW_DELETE' to true in the config
        \n${changes.del.map(i => this.objString(i)).join('\n')}`);
      } else {
        await Promise.all(changes.del.map(async (roleToDelete) => {
          await this.client.roles.delete({ id: roleToDelete.id });
        }));
      }
    }
  }
}
