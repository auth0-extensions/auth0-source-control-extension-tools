const { expect } = require('chai');
const migrations = require('../../../src/auth0/handlers/migrations');

describe('#migrations handler', () => {
  describe('#migrations process', () => {
    it('should get migration flags', async () => {
      const auth0 = {
        migrations: {
          getMigrations: () => ({
            flags: {
              migration_flag: true
            }
          })
        }
      };

      const handler = new migrations.default({ client: auth0 });
      const data = await handler.getType();
      expect(data).to.deep.equal({
        migration_flag: true
      });
    });

    it('should update migration flags', async () => {
      const auth0 = {
        migrations: {
          updateMigrations: (data) => {
            expect(data).to.be.an('object');
            expect(data).to.have.deep.property('flags', { new_migration_flag: true });
            return Promise.resolve(data);
          }
        }
      };

      const handler = new migrations.default({ client: auth0 });
      const stageFn = Object.getPrototypeOf(handler).processChanges;

      await stageFn.apply(handler, [ {
        migrations: {
          new_migration_flag: true
        }
      } ]);
    });
  });
});
