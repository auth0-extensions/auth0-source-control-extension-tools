import DefaultHandler from './default';
import constants from '../../constants';

export const supportedTemplates = constants.EMAIL_TEMPLATES_NAMES
  .filter(p => p.includes('.json'))
  .map(p => p.replace('.json', ''));

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      template: { type: 'string', enum: supportedTemplates },
      body: { type: 'string', default: '' }
    },
    require: [ 'template', 'body' ]
  }
};


export default class EmailTemplateHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'emailTemplates',
      id: 'template'
    });
  }

  async updateOrCreate(emailTemplate) {
    try {
      const params = { name: emailTemplate[this.id] };
      const updated = await this.client.emailTemplates.update(params, emailTemplate);
      delete updated.body;
      this.didUpdate(updated);
      this.updated += 1;
    } catch (err) {
      if (err.statusCode === 404) {
        // Create if it does not exist
        const created = await this.client.emailTemplates.create(emailTemplate);
        delete created.body;
        this.didCreate(created);
        this.created += 1;
      } else {
        throw err;
      }
    }
  }

  async processChanges(assets) {
    const { emailTemplates } = assets;

    // Do nothing if not set
    if (!emailTemplates) return;

    await Promise.all(emailTemplates.map(async (emailTemplate) => {
      await this.updateOrCreate(emailTemplate);
    }));
  }
}
