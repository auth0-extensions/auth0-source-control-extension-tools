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
    const ignoreUnavailableMigrations = this.config('AUTH0_IGNORE_UNAVAILABLE_MIGRATIONS');

    if (migrations && Object.keys(migrations).length > 0) {
      const existingMigrations = await this.client.migrations.getMigrations();
      const supportedMigrations = Object.keys(existingMigrations.flags);
      const unavailableMigrations = Object.keys(migrations).filter(flag => !supportedMigrations.includes(flag));
      const unavailableDisabledMigrations = unavailableMigrations.filter(flag => migrations[flag] === false);

      if (ignoreUnavailableMigrations && unavailableMigrations.length > 0) {
        log.info(`The following migrations are not available '${unavailableDisabledMigrations.join(',')}'. The migrations will be ignored because you have AUTH0_IGNORE_UNAVAILABLE_MIGRATIONS=true in your configuration.`);
        unavailableMigrations.forEach(flag => delete migrations[flag]);
      } else if (unavailableDisabledMigrations.length > 0) {
        log.warn(`The following disabled migrations are not available '${unavailableDisabledMigrations.join(',')}'. The migrations will be ignored, remove the migrations to avoid future warnings.`);
        unavailableDisabledMigrations.forEach(flag => delete migrations[flag]);
      }

      await this.client.migrations.updateMigrations({ flags: migrations });
      this.updated += 1;
      this.didUpdate(migrations);
    }
  }
}
