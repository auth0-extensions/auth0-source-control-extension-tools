import DefaultHandler from './default';

export const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' }
  },
  required: [ 'name' ]
};

export default class EmailProviderHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'emailProvider'
    });
  }

  async getType() {
    try {
      return await this.client.emailProvider.get();
    } catch (err) {
      if (err.statusCode === 404) return {};
      throw err;
    }
  }

  async processChanges(assets) {
    const { emailProvider } = assets;
    if (Object.keys(emailProvider).length > 0) {
      let existing = await this.getType();

      // Check for existing Email Provider
      if (existing.name) {
        if (existing.name !== emailProvider.name) {
          // Delete the current provider as it's different
          await this.client.emailProvider.delete();
          this.didDelete(existing);
          existing = {};
        }
      }

      // Now configure or update depending if it is configured already
      if (existing.name) {
        const provider = { name: emailProvider.name, enabled: emailProvider.enabled };
        const updated = await this.client.emailProvider.update(provider, emailProvider);
        this.updated += 1;
        this.didUpdate(updated);
      } else {
        const provider = { name: emailProvider.name, enabled: emailProvider.enabled };
        const created = await this.client.emailProvider.configure(provider, emailProvider);
        this.created += 1;
        this.didCreate(created);
      }
    }
  }
}
