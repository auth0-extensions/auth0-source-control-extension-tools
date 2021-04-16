/* eslint-disable consistent-return */
import _ from 'lodash';
import DefaultHandler, { order } from './default';
import log from '../../logger';
import { areArraysEquals } from '../../utils';

export const schema = {
  type: 'object',
  items: {
    type: 'object',
    additionalProperties: true,
    properties: {
      trigger_id: {
        type: 'object',
        properties: {
          action_name: { type: 'string', default: '' },
          display_name: { type: 'string', default: '' }
        }
      }
    }
  }
};

export default class TriggersHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'triggers'
    });
  }

  async getType() {
    if (this.existing) {
      return this.existing;
    }

    // in case client version does not support actions
    if (
      !this.client.actions
      || typeof this.client.actions.getAllTriggers !== 'function'
    ) {
      return [];
    }

    const res = await this.client.actions.getAllTriggers();

    const triggers = _(res.triggers).map('id').uniq().value();

    const triggerBindings = {};

    for (let i = 0; i < triggers.length; i++) {
      const triggerId = triggers[i];

      try {
        const { bindings } = await this.client.actions.getTriggerBindings({ trigger_id: triggerId });
        triggerBindings[triggerId] = bindings.map(binding => ({ action_name: binding.action.name, display_name: binding.display_name }));
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 501) {
          return null;
        }
        throw err;
      }
    }

    return triggerBindings;
  }

  async updateTrigger(updates) {
    const triggerId = updates.trigger_id;
    const bindings = updates.bindings.map(binding => ({ ref: { type: 'action_name', value: binding.action_name }, display_name: binding.display_name }));
    const data = { bindings: bindings };
    const params = { trigger_id: triggerId };
    try {
      await this.client.actions.updateTriggerBindings(params, data);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 501) {
        return null;
      }
      throw err;
    }
    return triggerId;
  }

  async updateTriggers(updates) {
    await this.client.pool.addEachTask({
      data: updates || [],
      generator: item => this.updateTrigger(item).then((triggerId) => {
        this.didUpdate({ trigger: triggerId });
        this.updated += 1;
      }).catch((err) => {
        throw new Error(`Problem updating ${this.type} ${this.objString(item)}\n${err}`);
      })
    }).promise();
  }

  async calcChanges(triggerId, bindings, existing) {
    // Calculate the changes required between two sets of assets.
    const update = [];

    if (!areArraysEquals(bindings, existing)) {
      update.push({ trigger_id: triggerId, bindings: bindings });
    }
    // Figure out what needs to be deleted and created
    return { update };
  }

  @order('80')
  async processChanges(assets) {
    // eslint-disable-next-line prefer-destructuring
    const triggers = assets.triggers;

    // Do nothing if not set
    if (!triggers) return {};

    const existing = await this.getType();

    /* eslint-disable guard-for-in */
    /* eslint-disable no-restricted-syntax */
    for (const triggerId in existing) {
      const changes = await this.calcChanges(triggerId, triggers[triggerId], existing[triggerId]);

      log.info(`Start processChanges for trigger ${triggerId} [update:${changes.update.length}]`);
      const myChanges = [ { update: changes.update } ];
      await Promise.all(myChanges.map(async (change) => {
        switch (true) {
          case change.update && change.update.length > 0:
            await this.updateTriggers(change.update);
            break;
          default:
            break;
        }
      }));
    }
  }
}
