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

  async createRoles(creates) {
    await Promise.all(creates.map(async (roleData) => {
      const data = { ...roleData };
      delete data.permissions;
      const created = await this.client.roles.create(data);
      if (typeof roleData.permissions !== 'undefined' && roleData.permissions.length > 0) await this.client.roles.permissions.create({ id: created.id }, { permissions: roleData.permissions });
      this.didCreate(created);
      this.created += 1;
    }));
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

  async updateRoles(updates, roles) {
    await Promise.all(updates.map(async (updateRole) => {
      const existingRole = await roles.find(roleDataForUpdate => roleDataForUpdate.name === updateRole.name);
      const params = { id: updateRole.id };
      const newPermissions = updateRole.permissions;
      delete updateRole.permissions;
      delete updateRole.id;
      await this.client.roles.update(params, updateRole);
      if (typeof existingRole.permissions !== 'undefined' && existingRole.permissions.length > 0) {
        await this.client.roles.permissions.delete(params, { permissions: existingRole.permissions });
      }
      if (typeof newPermissions !== 'undefined' && newPermissions.length > 0) await this.client.roles.permissions.create(params, { permissions: newPermissions });
      this.didUpdate(params);
      this.updated += 1;
    }));
  }

  async getType() {
    if (this.existing) {
      return this.existing;
    }

    // in case client version does not support roles
    if (!this.client.roles || typeof this.client.roles.getAll !== 'function') {
      return [];
    }

    try {
      const roles = await this.getAllRoles();
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
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 501) {
        return [];
      }
      throw err;
    }
  }

  async getAllRoles() {
    let result = [];
    let initialPage = 0;
    let data = await this.client.roles.getAll({ include_totals: true }); // getAll() returns 50 roles as default
    if (data && data.total !== 0) {
      let pagesLeft = Math.ceil(data.total / data.limit) - 1;
      result = data.roles;
      while (pagesLeft > 0) {
        initialPage += 1;
        data = await this.client.roles.getAll({ page: initialPage, include_totals: true });
        result.push(...data.roles);
        pagesLeft -= 1;
      }
    }
    return result;
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
          await this.deleteRoles(change.del);
          break;
        case change.create && change.create.length > 0:
          await this.createRoles(changes.create);
          break;
        case change.update && change.update.length > 0:
          await this.updateRoles(change.update, existing);
          break;
        default:
          break;
      }
    }));
  }
}
