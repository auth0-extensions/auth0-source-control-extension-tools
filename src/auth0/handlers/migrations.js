import DefaultHandler, { order } from './default';
import log from '../../logger';

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
      const flags = await this.removeUnavailableMigrations(migrations);

      await this.client.migrations.updateMigrations({ flags });
      this.updated += 1;
      this.didUpdate(migrations);
    }
  }

  logUnavailableMigrations(ignoreUnavailableMigrations, unavailableMigrations) {
    if (ignoreUnavailableMigrations) {
      log.info(`The following migrations are not available '${unavailableMigrations.join(',')}'. The migrations will be ignored because you have AUTH0_IGNORE_UNAVAILABLE_MIGRATIONS=true in your configuration.`);
    } else {
      log.warn(`The following disabled migrations are not available '${unavailableMigrations.join(',')}'. The migrations will be ignored, remove the migrations to avoid future warnings.`);
    }
  }

  async removeUnavailableMigrations(migrations) {
    const flags = Object.assign({}, migrations);
    const ignoreUnavailableMigrations = !!this.config('AUTH0_IGNORE_UNAVAILABLE_MIGRATIONS');
    const existingMigrations = await this.getType();
    const unavailableMigrations = Object.keys(flags).filter(flag => !(flag in existingMigrations) && (ignoreUnavailableMigrations || flags[flag] === false));

    if (unavailableMigrations.length > 0) {
      this.logUnavailableMigrations(ignoreUnavailableMigrations, unavailableMigrations);
      unavailableMigrations.forEach(flag => delete flags[flag]);
    }
    return flags;
  }
}
