import DefaultHandler from './default';
import constants from '../../constants';


export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', enum: constants.GUARDIAN_FACTOR_TEMPLATES }
    },
    require: [ 'name' ]
  }
};


export default class GuardianFactorTemplatesHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'guardianFactorTemplates',
      id: 'name'
    });
  }

  async getType() {
    if (this.existing) return this.existing;

    const data = await Promise.all(constants.GUARDIAN_FACTOR_TEMPLATES.map(async (name) => {
      const templates = await this.client.guardian.getFactorTemplates({ name });
      return { name, ...templates };
    }));

    // Filter out empty, should have more then 1 keys (name)
    return data.filter(d => Object.keys(d).length > 1);
  }

  async processChanges(assets) {
    // No API to delete or create guardianFactorTemplates, we can only update.
    const { guardianFactorTemplates } = assets;

    // Do nothing if not set
    if (!guardianFactorTemplates || !guardianFactorTemplates.length) return;

    // Process each factor templates
    await Promise.all(guardianFactorTemplates.map(async (fatorTemplates) => {
      const data = { ...fatorTemplates };
      const params = { name: fatorTemplates.name };
      delete data.name;
      await this.client.guardian.updateFactorTemplates(params, data);
      this.didUpdate(params);
      this.updated += 1;
    }));
  }
}
