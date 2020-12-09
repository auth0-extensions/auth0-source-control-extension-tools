/* eslint-disable consistent-return */
import DefaultHandler, { order } from './default';
import log from '../../logger';
import ActionVersionHandler from './actionVersions';
import ActionBindingsHandler from './actionBindings';

// With this schema, we can only validate property types but not valid properties on per type basis
export const schema = {
  type: 'array',
  items: {
    type: 'object',
    required: [ 'name', 'supported_triggers' ],
    additionalProperties: false,
    properties: {
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
        },
        required: [ 'code', 'dependencies', 'runtime' ]
      },
      bindings: {
        type: 'array',
        items: {
          type: 'object',
          required: [ 'trigger_id' ],
          properties: {
            trigger_id: { type: 'string' }
          }
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
    this.actionVersionHandler = new ActionVersionHandler(options);
    this.actionBindingsHandler = new ActionBindingsHandler(options);
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
      // need to get complete current version and all bindings for each action
      // the current_version inside the action doesn't have all the necessary information
      this.existing = await Promise.all(actions.actions.map(action => this.actionVersionHandler.getVersionById(action.id, action.current_version)
        .then(async (currentVersion) => {
          const bindings = await this.getActionBinding(action.id);
          return ({ ...action, current_version: currentVersion, bindings: bindings });
        })));
      return this.existing;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 501) {
        return [];
      }
      throw err;
    }
  }

  async createAction(data) {
    const action = { ...data };
    const currentVersion = action.current_version;
    // eslint-disable-next-line prefer-destructuring
    const bindings = action.bindings;
    delete action.current_version;
    delete action.updated_at;
    delete action.created_at;
    delete action.bindings;

    const created = await this.client.actions.create(action);
    if (currentVersion) {
      await this.actionVersionHandler.createActionVersions([ { ...currentVersion, action_id: created.id } ]);
    }

    if (bindings) {
      const bindingsToCreate = [];
      bindings.forEach(f => bindingsToCreate.push({ trigger_id: f.trigger_id, display_name: action.name, action_id: created.id }));
      await this.actionBindingsHandler.createActionBindings(bindingsToCreate);
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
    await this.actionBindingsHandler.deleteActionBindings(action.bindings);
    await this.client.actions.delete({ action_id: action.id });
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
    const currentVersionChanges = this.actionVersionHandler.calcCurrentVersionChanges(found.id, action.current_version, found.current_version);
    if (currentVersionChanges.del.length > 0 || currentVersionChanges.create.length > 0) {
      await this.actionVersionHandler.processChanges(currentVersionChanges);
    }

    const bindingChanges = await this.actionBindingsHandler.calcChanges(found, action.bindings, found.bindings);
    if (bindingChanges.del.length > 0 || bindingChanges.create.length > 0) {
      await this.actionBindingsHandler.processChanges(bindingChanges);
    }

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

  async getActionBinding(actionId) {
    const bindings = await this.actionBindingsHandler.getType();
    return bindings.filter(b => b.action.id === actionId);
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
        const currentVersionChanges = this.actionVersionHandler.calcCurrentVersionChanges(found.id, action.current_version, found.current_version);
        const hasCurrentVersionChanges = currentVersionChanges.del.length > 0 || currentVersionChanges.create.length > 0;
        // bindings changes
        const bindingChanges = await this.actionBindingsHandler.calcChanges(found, action.bindings, found.bindings);
        const hasBindingChanges = bindingChanges.del.length > 0 || bindingChanges.create.length > 0;
        if (action.name !== found.name
          || hasCurrentVersionChanges
          || hasBindingChanges) {
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
