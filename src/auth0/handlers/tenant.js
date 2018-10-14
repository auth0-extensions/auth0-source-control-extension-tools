import { ValidationError } from 'auth0-extension-tools';

import DefaultHandler, { order } from './default';
import { supportedPages, pageNameMap } from './pages';
import { dumpJSON } from '../../utils';

export const schema = {
  type: 'object'
};

const blockPageKeys = [ ...Object.keys(pageNameMap), ...Object.values(pageNameMap), ...supportedPages ];

export default class TenantHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'tenant'
    });
  }

  async getType() {
    const tenant = await this.client.tenant.getSettings();
    blockPageKeys.forEach((key) => {
      if (tenant[key]) delete tenant[key];
    });

    return tenant;
  }

  async validate(assets) {
    const { tenant } = assets;

    // Nothing to validate?
    if (!tenant) return;

    const pageKeys = Object.keys(tenant).filter(k => blockPageKeys.includes(k));
    if (pageKeys.length > 0) {
      throw new ValidationError(`The following pages ${dumpJSON(pageKeys)} were found in tenant settings. Pages should be set separately. Please refer to the documentation.`);
    }
  }

  // Run after other updates so objected can be referenced such as default directory
  @order('100')
  async processChanges(assets) {
    const { tenant } = assets;

    if (tenant && Object.keys(tenant).length > 0) {
      await this.client.tenant.updateSettings(tenant);
      this.updated += 1;
      this.didUpdate(tenant);
    }
  }
}
