import DefaultHandler from './default';

export const schema = { type: 'object' };

export default class PromptsHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'prompts'
    });
  }

  async getType() {
    try {
      return await this.client.prompts.getSettings();
    } catch (err) {
      if (err.statusCode === 404) return {};
      throw err;
    }
  }

  async processChanges(assets) {
    const { prompts } = assets;

    // Do nothing if not set
    if (!prompts) return;

    await this.client.prompts.updateSettings(prompts);
    this.updated += 1;
    this.didUpdate(prompts);
  }
}
