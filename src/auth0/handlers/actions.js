import DefaultHandler, { order } from './default';
import log from '../../logger';
import { areArraysEquals } from '../../utils';

const MAX_ACTION_DEPLOY_RETRY = 60;

// With this schema, we can only validate property types but not valid properties on per type basis
export const schema = {
  type: 'array',
  items: {
    type: 'object',
    required: [ 'name', 'supported_triggers', 'code' ],
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
      deployed: { type: 'boolean' }
    }
  }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class ActionHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'actions',
      functions: {
        create: (action) => this.createAction(action),
        delete: (action) => this.deleteAction(action)
      },
      stripUpdateFields: [
        'deployed'
      ]
    });
  }

  async createAction(action) {
    // Strip the deployed flag
    const addAction = { ...action };
    delete addAction.deployed;
    const createdAction = await this.client.actions.create(addAction);

    // Add the action id so we can deploy it later
    action.id = createdAction.id;
    return createdAction;
  }

  async deleteAction(action) {
    return this.client.actions.delete({ id: action.id, force: true });
  }

  objString(action) {
    return super.objString({ id: action.id, name: action.name });
  }

  async deployActions(actions) {
    await this.client.pool
      .addEachTask({
        data: actions || [],
        generator: (action) => this.deployAction(action)
          .then(() => {
            log.info(`Deployed [${this.type}]: ${this.objString(action)}`);
          })
          .catch((err) => {
            throw new Error(
              `Problem Deploying ${this.type} ${this.objString(action)}\n${err}`
            );
          })
      })
      .promise();
  }

  async deployAction(action) {
    try {
      await this.client.actions.deploy({ id: action.id });
    } catch (err) {
      // Retry if pending build.
      if (err.message && err.message.includes('must be in the \'built\' state')) {
        if (!action.retry_count) {
          log.info(`[${this.type}]: Waiting for build to complete ${this.objString(action)}`);
          action.retry_count = 1;
        }
        if (action.retry_count > MAX_ACTION_DEPLOY_RETRY) {
          throw err;
        }
        await sleep(1000);
        action.retry_count += 1;
        await this.deployAction(action);
      }
    }
  }

  async actionChanges(action, found) {
    const actionChanges = {};

    // if action is deployed, should compare against curren_version - calcDeployedVersionChanges method
    if (!action.deployed) {
      // name or secrets modifications are not supported yet
      if (action.code !== found.code) {
        actionChanges.code = action.code;
      }

      if (!areArraysEquals(action.dependencies, found.dependencies)) {
        actionChanges.dependencies = action.dependencies;
      }
    }

    if (!areArraysEquals(action.supported_triggers, found.supported_triggers)) {
      actionChanges.supported_triggers = action.supported_triggers;
    }

    return actionChanges;
  }

  async getType() {
    if (this.existing) return this.existing;
    // Actions API does not support include_totals param like the other paginate API's.
    // So we set it to false otherwise it will fail with "Additional properties not allowed: include_totals"
    this.existing = await this.client.actions.getAll({ paginate: true });
    return this.existing;
  }

  @order('60')
  async processChanges(assets) {
    const changes = await this.calcChanges(assets);
    await super.processChanges(assets, changes);

    // Deploy actions
    const deployActions = [];
    deployActions.push(...changes.create.filter((action) => action.deployed));
    deployActions.push(...changes.update.filter((action) => action.deployed));
    await this.deployActions(deployActions);
  }
}
