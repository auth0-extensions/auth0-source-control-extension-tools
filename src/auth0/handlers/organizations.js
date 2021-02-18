import _ from 'lodash';
import DefaultHandler, { order } from './default';
import { calcChanges } from '../../utils';
import log from '../../logger';

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      display_name: { type: 'string' },
      branding: { type: 'object' },
      metadata: { type: 'object' },
      connections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            connection_id: { type: 'string' },
            assign_membership_on_login: { type: 'boolean' }
          }
        }
      }
    },
    required: [ 'name' ]
  }
};

export default class OrganizationsHandler extends DefaultHandler {
  constructor(config) {
    super({
      ...config,
      type: 'organizations',
      id: 'id',
      identifiers: [ 'name' ]
    });
  }

  async deleteOrganization(org) {
    await this.client.organizations.delete({ id: org.id });
  }

  async deleteOrganizations(data) {
    if (this.config('AUTH0_ALLOW_DELETE') === 'true' || this.config('AUTH0_ALLOW_DELETE') === true) {
      await this.client.pool.addEachTask({
        data: data || [],
        generator: item => this.deleteOrganization(item).then(() => {
          this.didDelete(item);
          this.deleted += 1;
        }).catch((err) => {
          throw new Error(`Problem deleting ${this.type} ${this.objString(item)}\n${err}`);
        })
      }).promise();
    } else {
      log.warn(`Detected the following organizations should be deleted. Doing so may be destructive.\nYou can enable deletes by setting 'AUTH0_ALLOW_DELETE' to true in the config
      \n${data.map(i => this.objString(i)).join('\n')}`);
    }
  }

  async createOrganization(org) {
    const organization = { ...org };
    delete organization.connections;

    const created = await this.client.organizations.create(organization);

    if (typeof org.connections !== 'undefined' && org.connections.length > 0) {
      await Promise.all(org.connections.map(conn => this.client.organizations.addEnabledConnection({ id: created.id }, conn)));
    }

    return created;
  }

  async createOrganizations(creates) {
    await this.client.pool.addEachTask({
      data: creates || [],
      generator: item => this.createOrganization(item).then((data) => {
        this.didCreate(data);
        this.created += 1;
      }).catch((err) => {
        throw new Error(`Problem creating ${this.type} ${this.objString(item)}\n${err}`);
      })
    }).promise();
  }

  async updateOrganization(org, organizations) {
    const { connections: existingConnections } = await organizations.find(orgToUpdate => orgToUpdate.name === org.name);

    const params = { id: org.id };
    const { connections } = org;

    delete org.connections;
    delete org.name;
    delete org.id;

    await this.client.organizations.update(params, org);

    const connectionsToRemove = existingConnections.filter(c => !connections.find(x => x.connection_id === c.connection_id));
    const connectionsToAdd = connections.filter(c => !existingConnections.find(x => x.connection_id === c.connection_id));
    const connectionsToUpdate = connections.filter(c => existingConnections.find(x => x.connection_id === c.connection_id && x.assign_membership_on_login !== c.assign_membership_on_login));

    // Handle updates first
    await Promise.all(connectionsToUpdate.map(conn => this.client.organizations
      .updateEnabledConnection(Object.assign({ connection_id: conn.connection_id }, params), { assign_membership_on_login: conn.assign_membership_on_login })
      .catch(() => {
        throw new Error(`Problem updating Enabled Connection ${conn.connection_id} for organizations ${params.id}`);
      })));

    await Promise.all(connectionsToAdd.map(conn => this.client.organizations
      .addEnabledConnection(params, _.omit(conn, 'connection'))
      .catch(() => {
        throw new Error(`Problem adding Enabled Connection ${conn.connection_id} for organizations ${params.id}`);
      })));

    await Promise.all(connectionsToRemove.map(conn => this.client.organizations
      .removeEnabledConnection(Object.assign({ connection_id: conn.connection_id }, params))
      .catch(() => {
        throw new Error(`Problem removing Enabled Connection ${conn.connection_id} for organizations ${params.id}`);
      })));

    return params;
  }

  async updateOrganizations(updates, orgs) {
    await this.client.pool.addEachTask({
      data: updates || [],
      generator: item => this.updateOrganization(item, orgs).then((data) => {
        this.didUpdate(data);
        this.updated += 1;
      }).catch((err) => {
        throw new Error(`Problem updating ${this.type} ${this.objString(item)}\n${err}`);
      })
    }).promise();
  }

  async getType() {
    if (this.existing) {
      return this.existing;
    }

    if (!this.client.organizations || typeof this.client.organizations.getAll !== 'function') {
      return [];
    }

    try {
      const organizations = await this.getAllOrganizations();
      for (let index = 0; index < organizations.length; index++) {
        const connections = await this.client.organizations.connections.get({ id: organizations[index].id });
        organizations[index].connections = connections;
      }
      this.existing = organizations;
      return this.existing;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 501) {
        return [];
      }
      throw err;
    }
  }

  async getAllOrganizations() {
    let result = [];
    let initialPage = 0;
    let data = await this.client.organizations.getAll({ include_totals: true });
    if (data && data.total !== 0) {
      let pagesLeft = Math.ceil(data.total / data.limit) - 1;
      result = data.organizations;
      while (pagesLeft > 0) {
        initialPage += 1;
        data = await this.client.organizations.getAll({ page: initialPage, include_totals: true });
        result.push(...data.organizations);
        pagesLeft -= 1;
      }
    }
    return result;
  }

  // Run after connections
  @order('70')
  async processChanges(assets) {
    const { organizations } = assets;
    // Do nothing if not set
    if (!organizations) return;
    // Gets organizations from destination tenant
    const existing = await this.getType();
    const changes = calcChanges(organizations, existing, [ 'id', 'name' ]);

    log.debug(`Start processChanges for organizations [delete:${changes.del.length}] [update:${changes.update.length}], [create:${changes.create.length}]`);

    const myChanges = [ { del: changes.del }, { create: changes.create }, { update: changes.update } ];

    await Promise.all(myChanges.map(async (change) => {
      switch (true) {
        case change.del && change.del.length > 0:
          await this.deleteOrganizations(change.del);
          break;
        case change.create && change.create.length > 0:
          await this.createOrganizations(changes.create);
          break;
        case change.update && change.update.length > 0:
          await this.updateOrganizations(change.update, existing);
          break;
        default:
          break;
      }
    }));
  }
}
