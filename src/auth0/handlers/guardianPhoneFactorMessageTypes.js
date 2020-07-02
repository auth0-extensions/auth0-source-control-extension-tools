import DefaultHandler from './default';
import constants from '../../constants';

export const schema = {
  type: 'object',
  properties: {
    message_types: {
      type: 'array',
      items: {
        type: 'string',
        enum: constants.GUARDIAN_PHONE_MESSAGE_TYPES
      }
    }
  },
  required: [ 'message_types' ],
  additionalProperties: false
};


export default class GuardianPhoneMessageTypesHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'guardianPhoneFactorMessageTypes'
    });
  }

  async getType() {
    // in case client version does not support the operation
    if (!this.client.guardian || typeof this.client.guardian.getPhoneFactorMessageTypes !== 'function') {
      return null;
    }

    if (this.existing) return this.existing;
    this.existing = await this.client.guardian.getPhoneFactorMessageTypes();
    return this.existing;
  }

  async processChanges(assets) {
    // No API to delete or create guardianPhoneFactorMessageTypes, we can only update.
    const { guardianPhoneFactorMessageTypes } = assets;

    // Do nothing if not set
    if (!guardianPhoneFactorMessageTypes) return;

    const params = {};
    const data = guardianPhoneFactorMessageTypes;
    await this.client.guardian.updatePhoneFactorMessageTypes(params, data);
    this.updated += 1;
    this.didUpdate(guardianPhoneFactorMessageTypes);
  }
}
