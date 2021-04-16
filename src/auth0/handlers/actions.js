/* eslint-disable consistent-return */
import DefaultHandler, { order } from './default';
import log from '../../logger';
import { areArraysEquals } from '../../utils';

const WAIT_FOR_DEPLOY = 60; // seconds to wait for the version to deploy
const HIDDEN_SECRET_VALUE = '_VALUE_NOT_SHOWN_';

// With this schema, we can only validate property types but not valid properties on per type basis
export const schema = {
  type: 'array',
  items: {
    type: 'object',
    required: [ 'name', 'supported_triggers' ],
    additionalProperties: false,
    properties: {
      code: { type: 'string', default: '' },
      dependencies: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            registry_url: { type: 'string' }
          }
        }
      },
      status: { type: 'string', default: '' },
      runtime: { type: 'string', default: '' },
      secrets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'string' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        }
      },
      name: { type: 'string', default: '' },
      supported_triggers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', default: '' },
            version: { type: 'string' },
            url: { type: 'string' }
          }
        }
      },
      required_configuration: {
        type: 'array',
        items: {
          type: 'object',
          required: [ 'name', 'label', 'type' ],
          properties: {
            name: { type: 'string' },
            label: { type: 'string' },
            type: { type: 'string' },
            placeholder: { type: 'string' },
            description: { type: 'string' },
            default_value: { type: 'string' }
          }
        }
      },
      required_secrets: {
        type: 'array',
        items: {
          type: 'object',
          required: [ 'name', 'label', 'type' ],
          properties: {
            name: { type: 'string' },
            label: { type: 'string' },
            type: { type: 'string' },
            placeholder: { type: 'string' },
            description: { type: 'string' },
            default_value: { type: 'string' }
          }
        }
      },
      current_version: {
        type: 'object',
        properties: {
          code: { type: 'string', default: '' },
          dependencies: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                version: { type: 'string' },
                registry_url: { type: 'string' }
              }
            }
          },
          runtime: { type: 'string', default: '' },
          secrets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'string' },
                updated_at: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    }
  }
};

function wait(n) { return new Promise(resolve => setTimeout(resolve, n)); }

function mapSecrets(secrets) {
  if (secrets) {
    return secrets.map(secret => ({ ...secret, value: HIDDEN_SECRET_VALUE }));
  }
}

function mapCurrentVersion(currentVersion) {
  if (currentVersion) {
    return ({ ...currentVersion, secrets: mapSecrets(currentVersion.secrets) });
  }
}

async function waitUntilVersionIsDeployed(client, actionId, versionId, retries) {
  const version = await client.actions.getVersion({ action_id: actionId, version_id: versionId });
  if (retries > 0 && !version.deployed) {
    await wait(1000);
    await waitUntilVersionIsDeployed(client, actionId, versionId, retries - 1);
  }

  if (retries <= 0) {
    throw new Error(`Couldn't deploy version after ${WAIT_FOR_DEPLOY} retries`);
  }
}


export default class ActionHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'actions'
    });
  }

  async getVersionById(actionId, currentVersion) {
    // in case client version does not support actionVersions
    if (typeof this.client.actions.getVersions !== 'function') {
      return null;
    }
    // in case action doesn't have a current version yet
    if (!currentVersion) {
      return null;
    }

    try {
      return await this.client.actions.getVersions({ action_id: actionId, version_id: currentVersion.id });
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 501) {
        return null;
      }
      throw err;
    }
  }

  async getType() {
    if (this.existing) {
      return this.existing;
    }

    // in case client version does not support actions
    if (!this.client.actions || typeof this.client.actions.getAll !== 'function') {
      return [];
    }

    try {
      const actions = await this.client.actions.getAll();
      // need to get complete current version for each action
      // the current_version inside the action doesn't have all the necessary information
      this.existing = await Promise.all(actions.actions.map(action => this.getVersionById(action.id, action.current_version)
        .then(async currentVersion => ({ ...action, secrets: mapSecrets(action.secrets), current_version: mapCurrentVersion(currentVersion) }))));
      return this.existing;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 501) {
        return [];
      }
      throw err;
    }
  }


  async createVersion(version) {
    const actionId = version.action_id;
    const versionToCreate = {
      code: version.code,
      dependencies: version.dependencies,
      secrets: version.secrets.filter(secret => secret.value !== HIDDEN_SECRET_VALUE),
      runtime: version.runtime
    };
    const newVersion = await this.client.actions.createVersion({ action_id: actionId }, versionToCreate);

    // wait WAIT_FOR_DEPLOY seconds for version deploy, if can't deploy an error will arise
    await waitUntilVersionIsDeployed(this.client, actionId, newVersion.id, WAIT_FOR_DEPLOY);

    return newVersion;
  }

  calcCurrentVersionChanges(actionId, currentVersionAssets, existing) {
    const create = [];

    // Figure out what needs to be deleted or created
    if (!currentVersionAssets && !existing) {
      return { create };
    }

    if (currentVersionAssets && !existing) {
      create.push({ ...currentVersionAssets, action_id: actionId });
      return { create };
    }

    if (currentVersionAssets.code !== existing.code
          || currentVersionAssets.runtime !== existing.runtime
          || !areArraysEquals(currentVersionAssets.dependencies, existing.dependencies)
          || !areArraysEquals((currentVersionAssets.secrets || []).map(s => s.name), (existing.secrets || []).map(s => s.name))) {
      create.push({ ...currentVersionAssets, action_id: actionId });
    }

    return {
      create: create
    };
  }

  async createVersions(creates) {
    await this.client.pool.addEachTask({
      data: creates || [],
      generator: item => this.createVersion(item).then((data) => {
        this.didCreate({ version_id: data.id });
        this.created += 1;
      }).catch((err) => {
        throw new Error(`Problem creating ${this.type} ${this.objString(item)}\n${err}`);
      })
    }).promise();
  }

  async processVersionsChanges(changes) {
    log.info(`Start processChanges for action versions [create:${changes.create.length}]`);

    const myChanges = [ { create: changes.create } ];
    await Promise.all(myChanges.map(async (change) => {
      switch (true) {
        case change.create && change.create.length > 0:
          await this.createVersions(changes.create);
          break;
        default:
          break;
      }
    }));
  }

  async createAction(data) {
    const action = { ...data };
    const currentVersion = action.current_version;
    // eslint-disable-next-line prefer-destructuring
    const actionToCreate = {
      name: action.name,
      supported_triggers: action.supported_triggers,
      code: action.code,
      dependencies: action.dependencies,
      secrets: action.secrets,
      runtime: action.runtime
    };

    const created = await this.client.actions.create(actionToCreate);
    if (currentVersion) {
      await this.createVersions([ { ...currentVersion, action_id: created.id } ]);
    }
    return created;
  }

  async createActions(creates) {
    await this.client.pool.addEachTask({
      data: creates || [],
      generator: item => this.createAction(item).then((data) => {
        this.didCreate({ action_id: data.id });
        this.created += 1;
      }).catch((err) => {
        throw new Error(`Problem creating ${this.type} ${this.objString(item)}\n${err}`);
      })
    }).promise();
  }

  async deleteAction(action) {
    // force=true forced bound actions to delete
    await this.client.actions.delete({ action_id: action.id, force: true });
  }

  async deleteActions(dels) {
    if (this.config('AUTH0_ALLOW_DELETE') === 'true' || this.config('AUTH0_ALLOW_DELETE') === true) {
      await this.client.pool.addEachTask({
        data: dels || [],
        generator: action => this.deleteAction(action).then(() => {
          this.didDelete({ action_id: action.id });
          this.deleted += 1;
        }).catch((err) => {
          throw new Error(`Problem deleting ${this.type} ${this.objString({ action_id: action.id })}\n${err}`);
        })
      }).promise();
    } else {
      log.warn(`Detected the following actions should be deleted. Doing so may be destructive.\nYou can enable deletes by setting 'AUTH0_ALLOW_DELETE' to true in the config
      \n${dels.map(i => this.objString(i)).join('\n')}`);
    }
  }

  async updateAction(action, existing) {
    const found = existing.find(existingAction => existingAction.name === action.name);
    // update current version
    const currentVersionChanges = await this.calcCurrentVersionChanges(found.id, action.current_version, found.current_version);
    if (currentVersionChanges.create.length > 0) {
      await this.processVersionsChanges(currentVersionChanges);
    }

    const updatedFields = {
      code: action.code,
      dependencies: action.dependencies,
      secrets: action.secrets.filter(secret => secret.value !== HIDDEN_SECRET_VALUE),
      runtime: action.runtime,
      supported_triggers: action.supported_triggers
    };

    // Update action
    await this.client.actions.update({ action_id: found.id }, updatedFields);
    return found;
  }

  async updateActions(updates, actions) {
    await this.client.pool.addEachTask({
      data: updates || [],
      generator: item => this.updateAction(item, actions).then((data) => {
        this.didUpdate({ action_id: data.id });
        this.updated += 1;
      }).catch((err) => {
        throw new Error(`Problem updating ${this.type} ${this.objString(item)}\n${err}`);
      })
    }).promise();
  }

  async calcChanges(actionsAssets, existing) {
    // Calculate the changes required between two sets of assets.
    const update = [];
    let del = [ ...existing ];
    const create = [];
    actionsAssets.forEach(async (action) => {
      const found = existing.find(existingAction => existingAction.name === action.name);
      if (found) {
        del = del.filter(e => e.id !== found.id);
        // current version changes
        const currentVersionChanges = await this.calcCurrentVersionChanges(found.id, action.current_version, found.current_version);
        if (action.name !== found.name
            || action.code !== found.code
            || !areArraysEquals(action.dependencies, found.dependencies)
            || !areArraysEquals((action.secrets || []).map(s => s.name), (found.secrets || []).map(s => s.name))
            || action.runtime !== found.runtime
            || currentVersionChanges.create.length > 0) {
          update.push(action);
        }
      } else {
        create.push(action);
      }
    });

    // Figure out what needs to be updated vs created
    return {
      del,
      update,
      create
    };
  }

  @order('60')
  async processChanges(assets) {
    // eslint-disable-next-line prefer-destructuring
    const actions = assets.actions;

    // Do nothing if not set
    if (!actions) return {};

    const existing = await this.getType();

    const changes = await this.calcChanges(actions, existing);

    log.info(`Start processChanges for actions [delete:${changes.del.length}] [update:${changes.update.length}], [create:${changes.create.length}]`);
    const myChanges = [ { del: changes.del }, { create: changes.create }, { update: changes.update } ];
    await Promise.all(myChanges.map(async (change) => {
      switch (true) {
        case change.del && change.del.length > 0:
          await this.deleteActions(change.del);
          break;
        case change.create && change.create.length > 0:
          await this.createActions(changes.create);
          break;
        case change.update && change.update.length > 0:
          await this.updateActions(change.update, existing);
          break;
        default:
          break;
      }
    }));
  }
}
