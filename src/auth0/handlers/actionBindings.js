import DefaultHandler from './default';
import log from '../../logger';

const triggers = [
  'post-login',
  'credentials-exchange'
];

function wait(n) { return new Promise(resolve => setTimeout(resolve, n)); }

async function createBindingWithRetryAndTimeout(client, params, data, retry) {
  let binding = {};
  try {
    if (retry > 0) {
      binding = await client.createActionBinding(params, data);
    }
  } catch (err) {
    await wait(1000);
    binding = await createBindingWithRetryAndTimeout(client, params, data, retry - 1);
  }
  return binding;
}

export default class ActionBindingHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'actionBindings'
    });
  }

  async getType() {
    if (this.existing) {
      return this.existing;
    }

    // in case client version does not support actions
    if (
      !this.client.actionBindings
      || typeof this.client.actionBindings.getAll !== 'function'
    ) {
      return [];
    }
    const bindingsResult = [];
    try {
      await Promise.all(
        triggers.map(trigger => this.client.actionBindings
          .getAll({ trigger_id: trigger, detached: true })
          .then(b => b.bindings.forEach(binding => bindingsResult.push({ detached: true, ...binding }))))
      );
      // get all attached bindings
      await Promise.all(
        triggers.map(trigger => this.client.actionBindings
          .getAll({ trigger_id: trigger, detached: false })
          .then(b => b.bindings.forEach(binding => bindingsResult.push({ detached: false, ...binding }))))
      );
      this.existing = bindingsResult;
      return this.existing;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 501) {
        return [];
      }
      throw err;
    }
  }

  async detachBinding(binding, detached) {
    const params = { trigger_id: binding.trigger_id };
    const existing = await this.getType();
    let atacchedList = [];
    existing.forEach((existingBinding) => {
      if (!existingBinding.detached) {
        atacchedList.push({ id: existingBinding.id });
      }
    });
    if (!detached) {
      atacchedList.push({ id: binding.id });
    } else {
      atacchedList = atacchedList.filter(id => id === binding.id);
    }
    delete params.binding_id;
    await this.client.actionBindings.updateList(params, {
      bindings: atacchedList
    });
  }

  // Create Binding creates a atacched binding
  async createActionBinding(data) {
    const retries = 10;
    const params = { trigger_id: data.trigger_id };
    const actionBinding = { ...data };

    delete actionBinding.created_at;
    delete actionBinding.detached;
    delete actionBinding.id;
    delete actionBinding.trigger_id;
    delete actionBinding.name;
    delete actionBinding.version_id;
    delete actionBinding.action_name;

    const created = await createBindingWithRetryAndTimeout(this.client, params, actionBinding, retries);

    if (!created) {
      throw new Error(`Couldn't create binding after ${retries} retries`);
    }
    // connect binding
    await this.detachBinding(created, false);

    return created;
  }

  async createActionBindings(creates) {
    await this.client.pool
      .addEachTask({
        data: creates || [],
        generator: item => this.createActionBinding(item)
          .then((data) => {
            this.didCreate({ binding_id: data.id });
            this.created += 1;
          })
          .catch((err) => {
            throw new Error(
              `Problem creating ${this.type} ${this.objString(item)}\n${err}`
            );
          })
      })
      .promise();
  }

  async deleteActionBinding(binding) {
    // detach binding
    await this.detachBinding(binding, true);
    // delete binding
    await this.client.actionBindings.delete({
      trigger_id: binding.trigger_id,
      binding_id: binding.id
    });
  }

  async deleteActionBindings(dels) {
    if (this.config('AUTH0_ALLOW_DELETE') === 'true' || this.config('AUTH0_ALLOW_DELETE') === true) {
      await this.client.pool
        .addEachTask({
          data: dels || [],
          generator: item => this.deleteActionBinding(item)
            .then(() => {
              this.didDelete({ binding_id: item.id });
              this.deleted += 1;
            })
            .catch((err) => {
              throw new Error(`Problem deleting ${this.type} ${this.objString(item)}\n${err}`);
            })
        })
        .promise();
    } else {
      log.warn(`Detected the following actions bindings should be deleted. Doing so may be destructive.\nYou can enable deletes by setting 'AUTH0_ALLOW_DELETE' to true in the config
      \n${dels.map(i => this.objString(i)).join('\n')}`);
    }
  }

  async calcChanges(action, bindingsTriggers, existing) {
    // Calculate the changes required between two sets of assets.
    let del = [ ...existing ];
    const create = [];

    bindingsTriggers.forEach((binding) => {
      const found = existing.find(
        existingActionBinding => existingActionBinding.trigger_id === binding.trigger_id
      );
      if (found) {
        del = del.filter(e => e !== found);
      } else {
        create.push({
          display_name: action.name,
          action_id: action.id,
          trigger_id: binding.trigger_id
        });
      }
    });
    // Figure out what needs to be deleted and created
    return { del, create };
  }

  async processChanges(changes) {
    log.info(
      `Start processChanges for actions bindings [delete:${changes.del.length}], [create:${changes.create.length}]`
    );
    const myChanges = [ { del: changes.del }, { create: changes.create } ];
    await Promise.all(
      myChanges.map(async (change) => {
        switch (true) {
          case change.del && change.del.length > 0:
            await this.deleteActionBindings(change.del);
            break;
          case change.create && change.create.length > 0:
            await this.createActionBindings(changes.create);
            break;
          default:
            break;
        }
      })
    );
  }
}
