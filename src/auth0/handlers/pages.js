import DefaultHandler from './default';
import constants from '../../constants';

const supportedPages = constants.PAGE_NAMES.filter(p => p.includes('.json')).map(p => p.replace('.json', ''));

export const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string', enum: supportedPages },
      html: { type: 'string', default: '' },
      enabled: { type: 'boolean', default: true }
    },
    require: [ 'html', 'name' ]
  }
};


export default class PageHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'pages'
    });
  }

  async getType() {
    return [];
  }

  async processChanges() {
  }
}
