import DefaultHandler from './default';
import log from '../../logger';
import { isArrayEqual } from '../../utils';

export default class ActionVersionHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'actionVersions'
    });
  }

  async getType(actionId) {
    if (!actionId) {
      return [];
    }

    if (this.existing) {
      return this.existing;
    }

    // in case client version does not support actionVersions
    if (!this.client.actionVersions || typeof this.client.actionVersions.getAll !== 'function') {
      return [];
    }

    try {
      this.existing = await this.client.actionVersions.getAll({ action_id: actionId });
      return this.existing;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 501) {
        return [];
      }
      throw err;
    }
  }

  async getVersionById(actionId, currentVersion) {
    // in case client version does not support actionVersions
    if (!this.client.actionVersions || typeof this.client.actionVersions.get !== 'function') {
      return null;
    }
    // in case action doesn't have a current version yet
    if (!currentVersion) {
      return null;
    }

    try {
      return await this.client.actionVersions.get({ action_id: actionId, version_id: currentVersion.id });
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 501) {
        return null;
      }
      throw err;
    }
  }

  async createActionVersion(version) {
    const actionId = version.action_id;
    delete version.action_id;
    delete version.action_name;
    delete version.status;
    delete version.number;
    delete version.deployed;
    delete version.id;
    delete version.updated_at;
    delete version.created_at;
    const newVersion = await this.client.actionVersions.create({ action_id: actionId }, version);
    // create draft version
    await this.client.actionVersions.upsertDraft({ action_id: actionId, version_id: 'draft' }, version);
    return newVersion;
  }

  async createActionVersions(creates) {
    await this.client.pool.addEachTask({
      data: creates || [],
      generator: item => this.createActionVersion(item).then((data) => {
        this.didCreate({ version_id: data.id });
        this.created += 1;
      }).catch((err) => {
        throw new Error(`Problem creating ${this.type} ${this.objString(item)}\n${err}`);
      })
    }).promise();
  }

  async deleteActionVersion(version) {
    await this.client.actionVersions.delete({ action_id: version.action.id, version_id: version.id });
  }

  async deleteActionVersions(dels) {
    if (this.config('AUTH0_ALLOW_DELETE') === 'true' || this.config('AUTH0_ALLOW_DELETE') === true) {
      await this.client.pool.addEachTask({
        data: dels || [],
        generator: actionVersion => this.deleteActionVersion(actionVersion).then(() => {
          this.didDelete({ version_id: actionVersion.id });
          this.deleted += 1;
        }).catch((err) => {
          throw new Error(`Problem deleting ${this.type} ${this.objString(actionVersion)}\n${err}`);
        })
      }).promise();
    } else {
      log.warn(`Detected the following action versions should be deleted. Doing so may be destructive.\nYou can enable deletes by setting 'AUTH0_ALLOW_DELETE' to true in the config
      \n${dels.map(i => this.objString(i)).join('\n')}`);
    }
  }

  calcCurrentVersionChanges(actionId, currentVersionAssets, existing) {
    const del = [];
    const create = [];

    // Figure out what needs to be deleted or created
    if (!currentVersionAssets && !existing) {
      return { del, create };
    }

    if (!currentVersionAssets && existing) {
      del.push({ ...existing, action_id: actionId });
      return { del, create };
    }

    if (currentVersionAssets && !existing) {
      create.push({ ...currentVersionAssets, action_id: actionId });
      return { del, create };
    }

    if (currentVersionAssets.code !== existing.code
          || currentVersionAssets.runtime !== existing.runtime
          || !isArrayEqual(currentVersionAssets.dependencies, existing.dependencies)
          || !isArrayEqual((currentVersionAssets.secrets || []).map(s => s.name), (existing.secrets || []).map(s => s.name))) {
      create.push({ ...currentVersionAssets, action_id: actionId });
    }

    return {
      del,
      create
    };
  }

  async processChanges(changes) {
    log.info(`Start processChanges for action versions [delete:${changes.del.length}], [create:${changes.create.length}]`);

    const myChanges = [ { del: changes.del }, { create: changes.create } ];
    await Promise.all(myChanges.map(async (change) => {
      switch (true) {
        case change.del && change.del.length > 0:
          await this.deleteActionVersions(change.del);
          break;
        case change.create && change.create.length > 0:
          await this.createActionVersions(changes.create);
          break;
        default:
          break;
      }
    }));
  }
}
