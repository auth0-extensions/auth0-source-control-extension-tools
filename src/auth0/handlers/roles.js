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

  async createRole(roleData) {
    const data = { ...roleData };
    delete data.permissions;
    const created = await this.client.roles.create(data);
    if (typeof roleData.permissions !== 'undefined' && roleData.permissions.length > 0) await this.client.roles.permissions.create({ id: created.id }, { permissions: roleData.permissions });
    return created;
  }

  async deleteRoles(dels) {
    if (this.config('AUTH0_ALLOW_DELETE') === 'true' || this.config('AUTH0_ALLOW_DELETE') === true) {
      await Promise.all(dels.map(async (roleToDelete) => {
        await this.client.roles.delete({ id: roleToDelete.id });
        this.didDelete(roleToDelete);
        this.deleted += 1;
      }));
    } else {
      log.warn(`Detected the following roles should be deleted. Doing so may be destructive.\nYou can enable deletes by setting 'AUTH0_ALLOW_DELETE' to true in the config
      \n${dels.map(i => this.objString(i)).join('\n')}`);
    }
  }

  async updateRole(updateRole, roles) {
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
    return params;
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
    const myChanges = [ { del: changes.del }, { create: changes.create }, { update: changes.update } ];
    await Promise.all(myChanges.map(async (change) => {
      switch (true) {
        case change.del && change.del.length > 0:
          this.deleteRoles(change.del);
          break;
        case change.create && change.create.length > 0:
          await Promise.all(change.create.map(async (createRole) => {
            this.didCreate(await this.createRole(createRole));
            this.created += 1;
          }));
          break;
        case change.update && change.update.length > 0:
          await Promise.all(change.update.map(async (updateRole) => {
            this.didUpdate(await this.updateRole(updateRole, roles));
            this.updated += 1;
          }));
          break;
        default:
          break;
      }
    }));
  }
}
