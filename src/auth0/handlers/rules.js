import { ValidationError } from 'auth0-extension-tools';
import { dumpJSON, calcChanges, stripFields, duplicateItems } from '../../utils';
import DefaultHandler from './default';

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    default: [],
    properties: {
      script: {
        type: 'string',
        description: 'A script that contains the rule\'s code',
        default: ''
      },
      name: {
        type: 'string',
        description: 'The name of the rule. Can only contain alphanumeric characters, spaces and \'-\'. Can neither start nor end with \'-\' or spaces',
        pattern: '^[^-][a-zA-Z0-9-]+[^-]$'
      },
      order: {
        type: 'number',
        description: 'The rule\'s order in relation to other rules. A rule with a lower order than another rule executes first.',
        default: null
      },
      enabled: {
        type: 'boolean',
        description: 'true if the rule is enabled, false otherwise',
        default: true
      },
      stage: {
        type: 'string',
        description: 'The rule\'s execution stage',
        default: 'login_success',
        enum: [ 'login_success', 'login_failure', 'pre_authorize' ]
      }
    }
  }
};


export default class RulesHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'rules',
      stripUpdateFields: [ 'stage' ] // Fields not allowed in updates
    });
  }

  async getType() {
    if (this.existing) return this.existing;
    this.existing = await this.client.rules.getAll({ paginate: true });
    return this.existing;
  }

  didDelete(rule) {
    return super.didDelete({ name: rule.name, order: rule.order });
  }

  didCreate(rule) {
    return super.didCreate({ name: rule.name, order: rule.order });
  }

  didUpdate(rule) {
    return super.didUpdate({ name: rule.name, order: rule.order });
  }

  async calcChanges(assets, includeExcluded = false) {
    let existing = await this.getType();
    let { rules } = assets;

    // Filter excluded rules
    if (!includeExcluded) {
      rules = rules.filter(r => !assets.excludedRules.includes(r.name));
      existing = existing.filter(r => !assets.excludedRules.includes(r.name));
    }

    // Figure out what needs to be updated vs created
    const {
      del, update, create, conflicts
    } = calcChanges(rules, existing, [ 'id', 'name' ]);

    // Figure out the rules that need to be re-ordered
    const futureRules = [ ...create, ...update ];
    let nextOrderNo = Math.max(...existing.map(r => r.order)) + 1;

    const reOrder = futureRules.reduce((accum, r) => {
      const conflict = existing.filter(f => r.order === f.order && r.name !== f.name)[0];
      if (conflict) {
        nextOrderNo += 1;
        accum.push({
          ...conflict,
          order: nextOrderNo
        });
      }
      return accum;
    }, []);

    return {
      del,
      update,
      create,
      reOrder,
      conflicts
    };
  }

  async validate(assets) {
    // Figure out what needs to be updated vs created
    const { update, create, del } = await this.calcChanges(assets, true);
    // Include del rules which are actually not going to be deleted but are excluded
    // they can still muck up the ordering so we must take it into consideration.
    const futureRules = [ ...create, ...update, ...del.filter(r => assets.excludedRules.includes(r.name)) ];

    // Detect rules with the same order
    const rulesSameOrder = duplicateItems(futureRules, 'order');
    if (rulesSameOrder.length > 0) {
      const formatted = rulesSameOrder.map(dups => dups.map(d => `${d.name}`));
      throw new ValidationError(`There are multiple rules for the following stage-order combinations
      ${dumpJSON(formatted)}.
       Only one rule must be defined for the same order number in a stage.`);
    }

    // Detect Rules that are changing stage as it's not allowed.
    const existing = await this.getType();
    const stateChanged = futureRules.reduce((changed, rule) => ([
      ...changed,
      ...existing.filter(r => rule.name.toLowerCase() === r.name.toLowerCase() && r.stage !== rule.stage)
    ]), []).map(r => r.name);

    if (stateChanged.length > 0) {
      throw new ValidationError(`The following rules changed stage which is not allowed:
      ${dumpJSON(stateChanged)}.
      Rename the rules to recreate them and avoid this error.`);
    }

    await super.validate(assets);
  }

  async processChanges(assets) {
    // Figure out what needs to be updated vs created
    const {
      del,
      update,
      create,
      reOrder,
      conflicts
    } = await this.calcChanges(assets);

    // Temporally re-order rules with conflicting ordering
    await this.client.pool.addEachTask({
      data: reOrder,
      generator: rule => this.client.updateRule({ id: rule.id }, stripFields(rule, this.stripUpdateFields)).then(() => {
        const updated = {
          name: rule.name, stage: rule.stage, order: rule.order, id: rule.id
        };
        this.log(`Temporally re-order Rule ${dumpJSON(updated)}`);
      })
    }).promise();

    await super.processChanges(assets, {
      del, create, update, conflicts
    });
  }
}
