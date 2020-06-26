import DefaultHandler, { order } from './default';

export const schema = {
  type: 'object',
  additionalProperties: { type: 'boolean' }
};


export default class MigrationsHandler extends DefaultHandler {
  constructor(options) {
    super({
      ...options,
      type: 'migrations'
    });
  }

  async getType() {
    const migrations = await this.client.migrations.getMigrations();
    return migrations.flags;
  }

  // Run at the end since switching a flag will depend on other applying other changes
  @order('150')
  async processChanges(assets) {
    const { migrations } = assets;

    if (migrations && Object.keys(migrations).length > 0) {
      await this.client.migrations.updateMigrations({ flags: migrations });
      this.updated += 1;
      this.didUpdate(migrations);
    }
  }
}
