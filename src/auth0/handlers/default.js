import { ValidationError } from 'auth0-extension-tools';

import { stripFields, dumpJSON, calcChanges, duplicateItems } from '../../utils';

export function order(value) {
  return function decorator(t, n, descriptor) {
    descriptor.value.order = value; // eslint-disable-line
    return descriptor;
  };
}

export default class DefaultHandler {
  constructor(options) {
    this.config = options.config;
    this.existing = null;
    this.type = options.type;
    this.id = options.id || 'id';
    this.client = options.client;
    this.log = options.tracker.log;
    this.existing = null;
    this.identifiers = options.identifiers || [ 'id', 'name' ];
    this.stripUpdateFields = [
      ...options.stripUpdateFields || [],
      this.id
    ];
    this.functions = {
      getAll: 'getAll',
      create: 'create',
      update: 'update',
      delete: 'delete',
      ...options.functions || {}
    };

    this.updated = 0;
    this.created = 0;
    this.deleted = 0;
  }

  getClientFN(fn) {
    const client = Reflect.get(this.client, this.type);
    return Reflect.get(client, fn, client);
  }

  didDelete(item) {
    this.log(`Deleted [${this.type}]: ${dumpJSON(item)}`);
  }

  didCreate(item) {
    this.log(`Created [${this.type}]: ${dumpJSON(item)}`);
  }

  didUpdate(item) {
    this.log(`Updated [${this.type}]: ${dumpJSON(item)}`);
  }

  async getType() {
    // Each type to impl how to get the existing as its not consistent across the mgnt api.
    throw new Error(`Must implement getType for type ${this.type}`);
  }

  async calcChanges(assets) {
    const existing = await this.getType();

    const typeAssets = assets[this.type] || [];

    // Figure out what needs to be updated vs created
    return calcChanges(typeAssets, existing, this.identifiers);
  }

  async validate(assets) {
    // Ensure no duplication in id and name
    const typeAssets = assets[this.type];

    if (!Array.isArray(typeAssets)) return;

    // Do not allow items with same name
    const duplicateNames = duplicateItems(typeAssets, 'name');
    if (duplicateNames.length > 0) {
      const formatted = duplicateNames.map(dups => dups.map(d => `${d.name}`));
      throw new ValidationError(`There are multiple ${this.type} with the same name combinations
      ${dumpJSON(formatted)}.
       Names must be unique.`);
    }

    // Do not allow items with same id
    const duplicateIDs = duplicateItems(typeAssets, this.id);
    if (duplicateIDs.length > 0) {
      const formatted = duplicateIDs.map(dups => dups.map(d => `${d[this.id]}`));
      throw new ValidationError(`There are multiple rules for the following stage-order combinations
      ${dumpJSON(formatted)}.
       Only one rule must be defined for the same order number in a stage.`);
    }
  }

  async processChanges(assets, changes) {
    if (!changes) {
      changes = await this.calcChanges(assets);
    }

    const {
      del, update, create, conflicts
    } = changes;

    // Process Deleted
    await this.client.pool.addEachTask({
      data: del || [],
      generator: (delItem) => {
        const delFunction = this.getClientFN(this.functions.delete);
        return delFunction({ [this.id]: delItem[this.id] })
          .then(() => {
            this.didDelete(delItem);
            this.deleted += 1;
          })
          .catch((err) => {
            throw new Error(`Problem deleting ${this.type} ${dumpJSON(delItem, 1)}\n${err}`);
          });
      }
    }).promise();

    // Process Renaming Entries Temp due to conflicts in names
    await this.client.pool.addEachTask({
      data: conflicts || [],
      generator: (updateItem) => {
        const updateFN = this.getClientFN(this.functions.update);
        const params = { [this.id]: updateItem[this.id] };
        const payload = stripFields({ ...updateItem }, this.stripUpdateFields);
        return updateFN(params, payload)
          .then(data => this.didUpdate(data))
          .catch((err) => {
            throw new Error(`Problem updating ${this.type} ${dumpJSON(updateItem, 1)}\n${err}`);
          });
      }
    }).promise();

    // Process Creations
    await this.client.pool.addEachTask({
      data: create || [],
      generator: (createItem) => {
        const createFunction = this.getClientFN(this.functions.create);
        return createFunction(createItem)
          .then((data) => {
            this.didCreate(data);
            this.created += 1;
          })
          .catch((err) => {
            throw new Error(`Problem creating ${this.type} ${dumpJSON(createItem, 1)}\n${err}`);
          });
      }
    }).promise();

    // Process Updates and strip fields not allowed in updates
    await this.client.pool.addEachTask({
      data: update || [],
      generator: (updateItem) => {
        const updateFN = this.getClientFN(this.functions.update);
        const params = { [this.id]: updateItem[this.id] };
        const payload = stripFields({ ...updateItem }, this.stripUpdateFields);
        return updateFN(params, payload)
          .then((data) => {
            this.didUpdate(data);
            this.updated += 1;
          })
          .catch((err) => {
            throw new Error(`Problem updating ${this.type} ${dumpJSON(updateItem, 1)}\n${err}`);
          });
      }
    }).promise();
  }
}
