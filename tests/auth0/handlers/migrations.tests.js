const { expect } = require('chai');
const migrations = require('../../../src/auth0/handlers/migrations');

describe('#migrations handler', () => {
  const mockClient = flags => ({
    migrations: {
      getMigrations: () => ({
        flags: {
          migration_flag: true
        }
      }),
      updateMigrations: (data) => {
        expect(data).to.be.an('object');
        expect(data).to.have.deep.property('flags', { migration_flag: false, ...flags });
        return Promise.resolve(data);
      }
    }
  });

  describe('#getType()', () => {
    it('should get migration flags', async () => {
      const client = mockClient();

      const handler = new migrations.default({ client });
      const data = await handler.getType();
      expect(data).to.deep.equal({
        migration_flag: true
      });
    });
  });

  describe('#migrations process', () => {
    it('should update available migration flags', async () => {
      const client = mockClient();
      const config = () => false;

      const handler = new migrations.default({ client, config });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ {
        migrations: {
          migration_flag: false
        }
      } ]);
    });

    describe('when AUTH0_IGNORE_UNAVAILABLE_MIGRATIONS=false (default)', () => {
      it('should ignore unavailable disabled migration flags', async () => {
        const client = mockClient();
        const config = () => false;

        const handler = new migrations.default({ client, config });
        const stageFn = Object.getPrototypeOf(handler).processChanges;

        await stageFn.apply(handler, [ {
          migrations: {
            migration_flag: false,
            disabled_flag: false
          }
        } ]);
      });

      it('should not ignore unavailable enabled migration flags', async () => {
        const client = mockClient({ disabled_flag: true });
        const config = () => false;

        const handler = new migrations.default({ client, config });
        const stageFn = Object.getPrototypeOf(handler).processChanges;

        await stageFn.apply(handler, [ {
          migrations: {
            migration_flag: false,
            disabled_flag: true
          }
        } ]);
      });
    });

    describe('when AUTH0_IGNORE_UNAVAILABLE_MIGRATIONS=true', () => {
      it('should ignore all unavailable migration flags', async () => {
        const client = mockClient();
        const config = name => name === 'AUTH0_IGNORE_UNAVAILABLE_MIGRATIONS';

        const handler = new migrations.default({ client, config });
        const stageFn = Object.getPrototypeOf(handler).processChanges;

        await stageFn.apply(handler, [ {
          migrations: {
            migration_flag: false,
            disabled_flag: true,
            another_disabled_flag: false
          }
        } ]);
      });
    });
  });
});
