import DefaultHandler from './default';
import constants from '../../constants';

export const schema = {
  type: 'object',
  properties: {
    provider: {
      type: 'string',
      enum: constants.GUARDIAN_PHONE_PROVIDERS
    }
  },
  required: [ 'provider' ],
  additionalProperties: false
};


export default class GuardianPhoneSelectedProviderHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'guardianPhoneFactorSelectedProvider'
    });
  }

  async getType() {
    // in case client version does not support the operation
    if (!this.client.guardian || typeof this.client.guardian.getPhoneFactorSelectedProvider !== 'function') {
      return null;
    }

    if (this.existing) return this.existing;
    this.existing = await this.client.guardian.getPhoneFactorSelectedProvider();
    return this.existing;
  }

  async processChanges(assets) {
    // No API to delete or create guardianPhoneFactorSelectedProvider, we can only update.
    const { guardianPhoneFactorSelectedProvider } = assets;

    // Do nothing if not set
    if (!guardianPhoneFactorSelectedProvider) return;

    const params = {};
    const data = guardianPhoneFactorSelectedProvider;
    await this.client.guardian.updatePhoneFactorSelectedProvider(params, data);
    this.updated += 1;
    this.didUpdate(guardianPhoneFactorSelectedProvider);
  }
}
