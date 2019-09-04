import { calcChanges } from '../../utils';
import DefaultHandler from './default';

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
      id: {
        type: 'string',
        description: 'The ulid of the hook.',
        pattern: '^[^-\\s][a-zA-Z0-9-\\s]+[^-\\s]$'
      },
      name: {
        type: 'string',
        description: 'The name of the hook. Can only contain alphanumeric characters, spaces and \'-\'. Can neither start nor end with \'-\' or spaces',
        pattern: '^[^-\\s][a-zA-Z0-9-\\s]+[^-\\s]$'
      },
      active: {
        type: 'boolean',
        description: 'true if the hook is active, false otherwise',
        default: true
      },
      triggerId: {
        type: 'string',
        description: 'The hooks\'s trigger ID',
        default: 'credentials-exchange',
        enum: [ 'credentials-exchange', 'pre-user-registration', 'post-user-registration' ]
      },
      secrets: {
        type: 'object',
        default: {},
        description: 'List of key-value pairs containing secrets available to the hook.'
      },
      dependencies: {
        type: 'object',
        default: {},
        description: 'List of key-value pairs of NPM dependencies available to the hook.'
      }
    },
    required: [ 'code', 'name', 'active', 'triggerId' ]
  }
};


export default class HooksHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'hooks',
      stripUpdateFields: [ 'triggerId' ] // Fields not allowed in updates
    });
  }

  objString(hook) {
    return super.objString({ name: hook.name, triggerId: hook.triggerId });
  }

  async calcChanges(assets) {
    const { hooks } = assets;

    // Figure out what needs to be updated vs created
    // const {
    //   del, update, create, conflicts
    // } = calcChanges(hooks, [], [ 'triggerId', 'name' ]);
    const {
      del, update, create, conflicts
    } = calcChanges(hooks, [], [ 'id' ]);

    return {
      del,
      update,
      create,
      conflicts
    };
  }

  async validate(assets) {
    const { hooks } = assets;

    // Do nothing if not set
    if (!hooks) return;

    // TODO: Implement when adding CRUD

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
