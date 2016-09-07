const Promise = require('bluebird');
const pages = require('../src/auth0/pages');


describe('#pages', () => {
  const progress = {
    log: () => null
  };

  const client = {
    clients: {
      getAll: () => Promise.resolve([ { global: true, client_id: 1 } ]),
      update: () => Promise.resolve({})
    },
    tenant: {
      tenant: {
        patch: () => Promise.resolve({})
      }
    }
  };

  const data = [
    {
      name: 'login.html',
      contents: 'login',
      meta: 'login.json'
    },
    {
      name: 'login.json',
      contents: '{"enabled": true}'
    },
    {
      name: 'password_reset.html',
      contents: 'password',
      meta: 'password_reset.json'
    },
    {
      name: 'password_reset.json',
      contents: { enabled: true }
    }
  ];

  it('should update password page', (done) => {
    pages.updatePasswordResetPage(progress, client, data).then(() => done());
  });

  it('should update login page', (done) => {
    pages.updateLoginPage(progress, client, data).then(() => done());
  });

  it('should update login page without meta', (done) => {
    pages.updateLoginPage(progress, client, [ { name: 'login.html', contents: 'login' } ]).then(() => done());
  });

  it('should return if there is no password page', (done) => {
    pages.updatePasswordResetPage(progress, client, []).then(() => done());
  });

  it('should return if there is no login page', (done) => {
    pages.updateLoginPage(progress, client, []).then(() => done());
  });
});

