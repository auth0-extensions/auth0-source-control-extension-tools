import DefaultHandler from './default';

const ALLOWED_TRIGGER_IDS = [ 'credentials-exchange', 'pre-user-registration', 'post-user-registration' ];

export const excludeSchema = {
  type: 'array',
  items: { type: 'string' }
};

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    default: [],
    properties: {
      code: {
        type: 'string',
        description: 'A script that contains the hook\'s code',
        default: ''
      },
      name: {
        type: 'string',
        description: 'The name of the hook. Can only contain alphanumeric characters, spaces and \'-\'. Can neither start nor end with \'-\' or spaces',
        pattern: '^[^-\\s][a-zA-Z0-9-\\s]+[^-\\s]$'
      },
      active: {
        type: 'boolean',
        description: 'true if the hook is active, false otherwise',
        default: false
      },
      triggerId: {
        type: 'string',
        description: 'The hooks\'s trigger ID',
        enum: ALLOWED_TRIGGER_IDS
      },
      secrets: {
        type: 'object',
        description: 'List of key-value pairs containing secrets available to the hook.',
        default: {}
      },
      dependencies: {
        type: 'object',
        default: {},
        description: 'List of key-value pairs of NPM dependencies available to the hook.'
      }
    },
    required: [ 'code', 'name', 'triggerId' ]
  }
};

const getActive = (hooks) => {
  const result = {};

  ALLOWED_TRIGGER_IDS.forEach((type) => {
    result[type] = hooks.filter(h => h.active && h.triggerId === type);
  });

  return result;
};

export default class HooksHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'hooks',
      stripUpdateFields: [ 'id' ] // TODO: decide if we want to restrict changing triggerId
    });
  }

  objString(hook) {
    return super.objString({ name: hook.name, triggerId: hook.triggerId });
  }

  async getType() {
    if (this.existing) {
      return this.existing;
    }

    // in case client version does not support hooks
    if (!this.client.hooks || typeof this.client.hooks.getAll !== 'function') {
      return null;
    }

    const hooks = await this.client.hooks.getAll();

    // hooks.getAll does not return code and secrets, we have to fetch hooks one-by-one
    this.existing = await Promise.all(hooks.map(hook => this.client.hooks.get({ id: hook.id })));

    return this.existing;
  }

  async calcChanges(assets) {
    const {
      del, update, create, conflicts
    } = await super.calcChanges(assets);

    // If ALLOW_DELETE is set to TRUE, the app will remove all hooks that are not in the assets
    if (this.config('AUTH0_ALLOW_DELETE') === 'true' || this.config('AUTH0_ALLOW_DELETE') === true) {
      return {
        del,
        update,
        create,
        conflicts
      };
    }

    // Otherwise we have to make sure that existing hooks will be deactivated
    const active = getActive([ ...create, ...update, ...conflicts ]);
    const filtered = del.filter((hook) => {
      const activeOfType = active[hook.triggerId] && active[hook.triggerId][0] && active[hook.triggerId][0].name;

      // deactivating the existing hook only if we have another active hook in the same category
      if (hook.active && activeOfType && hook.name !== activeOfType) {
        hook.active = false;
        update.push(hook);
        return false;
      }

      return true;
    });

    return {
      del: filtered,
      update,
      create,
      conflicts
    };
  }

  async validate(assets) {
    const { hooks } = assets;

    // Do nothing if not set
    if (!hooks) return;

    const activeHooks = getActive(hooks);

    ALLOWED_TRIGGER_IDS.forEach((type) => {
      if (activeHooks[type].length > 1) { // There can be only one!
        const conflict = activeHooks[type].map(h => h.name).join(', ');
        const err = new Error(`Only one active hook allowed for "${type}" extensibility point. Conflicting hooks: ${conflict}`);
        err.status = 409;
        throw err;
      }
    });

    await super.validate(assets);
  }

  async processChanges(assets) {
    const { hooks } = assets;

    // Do nothing if not set
    if (!hooks) return;

    // Figure out what needs to be updated vs created
    const changes = await this.calcChanges(assets);
    await super.processChanges(assets, {
      del: changes.del,
      create: changes.create,
      update: changes.update,
      conflicts: changes.conflicts
    });
  }
}
