import DefaultHandler from './default';
import constants from '../../constants';

export const schema = {
  type: 'array',
  items: {
    type: 'string',
    enum: constants.GUARDIAN_POLICIES
  },
  minLength: 0,
  maxLength: 1
};


export default class GuardianPoliciesHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'guardianPolicies'
    });
  }

  async getType() {
    // in case client version does not support the operation
    if (!this.client.guardian || typeof this.client.guardian.getPolicies !== 'function') {
      return null;
    }

    if (this.existing) return this.existing;
    this.existing = await this.client.guardian.getPolicies();
    return this.existing;
  }

  async processChanges(assets) {
    // No API to delete or create guardianPolicies, we can only update.
    const { guardianPolicies } = assets;

    // Do nothing if not set
    if (!guardianPolicies) return;

    const params = {};
    const data = guardianPolicies;
    await this.client.guardian.updatePolicies(params, data);
    this.updated += 1;
    this.didUpdate(guardianPolicies);
  }
}
