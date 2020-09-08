import DefaultHandler, { order } from './default';
import { calcChanges } from '../../utils';
import log from '../../logger';

const SUPPORTED_TRIGGER_IDS = ['post-login'];

// With this schema, we can only validate property types but not valid properties on per type basis
export const schema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['name', 'supported_triggers'],
    properties: {
      name: { type: 'string', default: '' },
      supported_triggers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              default: ''
            },
            version: {
              type: 'string',
              description: 'version points to the trigger version.',
            },
            url: {
              type: 'string',
              description: 'url refers to some documentation or reference for this trigger.',
            }
          }
        }
      },
      required_configuration: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'label', 'type'],
          properties: {
            name: {
              type: 'string',
              description: 'name is analogous to the name attribute in an input form element.',
            },
            label: {
              type: 'string',
              description: 'label is analogous to what you put in the label form element.',
            },
            type: {
              type: 'string',
              description: 'type will dictate how the form element is displayed.',
              enum: ['string'],
            },
            placeholder: {
              type: 'string',
              description: 'placeholder is analogous to the placeholder attribute in an input form element.',
            },
            description: {
              type: 'string',
              description: 'description provides more context for certain fields which requires more explanation.',
            },
            default_value: {
              type: 'string',
              description: 'default_value becomes the pre-filled value for a given input. Useful to provide smart defaults.',
            },
          }
        }
      },
      required_secrets: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'label', 'type'],
          properties: {
            name: {
              type: 'string',
              description: 'name is analogous to the name attribute in an input form element.',
            },
            label: {
              type: 'string',
              description: 'label is analogous to what you put in the label form element.',
            },
            type: {
              type: 'string',
              description: 'type will dictate how the form element is displayed.',
              enum: ['string'],
            },
            placeholder: {
              type: 'string',
              description: 'placeholder is analogous to the placeholder attribute in an input form element.',
            },
            description: {
              type: 'string',
              description: 'description provides more context for certain fields which requires more explanation.',
            },
            default_value: {
              type: 'string',
              description: 'default_value becomes the pre-filled value for a given input. Useful to provide smart defaults.',
            },
          }
        }
      },
      versions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string', default: '' },
            dependencies: {  
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  name: {
                    type: 'string',
                    description: 'name is the name of the npm module, e.g. lodash',
                  },
                  version: {
                    type: 'string',
                    description: 'description is the version of the npm module, e.g. 4.17.1',
                  },
                  registry_url: {
                    type: 'string',
                    description: 'registry_url is an optional value used primarily for private npm registries.',
                  },
                }
              },
              description: 'dependencies lists all the third party npm module this particular version depends on. ',
          },
            runtime: { type: 'string', default: '' },
          },
          required: ['code', 'dependencies', 'runtime']
        }
      }
    }
  }
};


export default class ActionHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'actions'
    });
  }

  async getType() {
    if (this.existing && !reload) {
      return this.existing;
    }

    // in case client version does not support actions
    if (!this.client.actions || typeof this.client.actions.getAll !== 'function') {
      return [];
    }

    try {
      const actions = await this.client.actions.getAll({ triggerId: 'post-login' });

      // need to get all versions for each action
      this.existing = await Promise.all(actions.actions.map(action => this.client.actionVersions.getAll({ action_id: action.id })
        .then(actionVersions => ({ ...action, versions: actionVersions.versions }))));

      return this.existing;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 403 || err.statusCode === 501) {
        return [];
      }
      throw err;
    }
  }

  async createActionVersion(actionId, version) {
    return await this.client.actionVersions.create({action_id : actionId}, version);
  }


  async createAction(data) {
    const action = { ...data };
    const versions = data.versions;

    delete action.versions;

    const created = await this.client.actions.create(action);

    if (typeof versions !== 'undefined' && versions.length > 0) {
      version.forEach(version =>  createActionVersion(action.id, version))
    }

    return created;
  }

  async createActions(creates) {
    await this.client.pool.addEachTask({
      data: creates || [],
      generator: item => this.createAction(item).then((data) => {
        this.didCreate(data);
        this.created += 1;
      }).catch((err) => {
        throw new Error(`Problem creating ${this.type} ${this.objString(item)}\n${err}`);
      })
    }).promise();
  }

  async deleteActionVersion(actionId, versionId) {
    await this.client.actionVersions.delete({ action_id: actionId, version_id: versionId });
  }

  async deleteAction(action) {
    action.versions.forEach(version => this.deleteActionVersion(action.id, version));
    await this.client.actions.delete({ action_id: action.id});
  }

  async deleteActions(dels) {
    if (this.config('AUTH0_ALLOW_DELETE') === 'true' || this.config('AUTH0_ALLOW_DELETE') === true) {
      await this.client.pool.addEachTask({
        data: dels || [],
        generator: item => this.deleteAction(item).then(() => {
          this.didDelete(item);
          this.deleted += 1;
        }).catch((err) => {
          throw new Error(`Problem deleting ${this.type} ${this.objString(item)}\n${err}`);
        })
      }).promise();
    } else {
      log.warn(`Detected the following actions should be deleted. Doing so may be destructive.\nYou can enable deletes by setting 'AUTH0_ALLOW_DELETE' to true in the config
      \n${dels.map(i => this.objString(i)).join('\n')}`);
    }
  }

  async updateAction(data, actions) {
    // TODO: review update logic
    
    // const existingAction = await actions.find(actionDataForUpdate => actionDataForUpdate.name === data.name);

    const params = { action_id: data.id };

    await this.client.actions.update(params, data);

    return params;
  }

  async updateActions(updates, actions) {
    await this.client.pool.addEachTask({
      data: updates || [],
      generator: item => this.updateAction(item, actions).then((data) => {
        this.didUpdate(data);
        this.updated += 1;
      }).catch((err) => {
        throw new Error(`Problem updating ${this.type} ${this.objString(item)}\n${err}`);
      })
    }).promise();
  }

  @order('60')
  async processChanges(assets) {

    console.log('INITIATIN PROCESS CHANGES', assets)

    const { actions } = assets;
    // Do nothing if not set
    if (!actions) return;
    // Gets actions from destination tenant
    const existing = await this.getType();

    const changes = calcChanges(actions, existing);
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
