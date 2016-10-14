const expect = require('expect');
const request = require('supertest');
const express = require('express');

const middlewares = require('../src/middlewares');


describe('#middlewares', function() {
  describe('#dashboardAdmins', function() {
    it('should throw "Domain is required" error', function(done) {
      expect(function() {
        middlewares.dashboardAdmins();
      })
        .toThrow(/Domain is required/);

      done();
    });

    it('should throw "title is required" error', function(done) {
      expect(function() {
        middlewares.dashboardAdmins('domain');
      })
        .toThrow(/title is required/);

      done();
    });

    it('should work', function(done) {
      const app = express();
      const middle = middlewares.dashboardAdmins('example.com', 'Title');

      app.use('/', middle, function(req, res) {
        res.send();
      });

      request(app)
        .get('/')
        .expect(200)
        .end(function(err) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('#requireUser', function() {
    it('should return "Authentication required for this endpoint" error', function(done) {
      const app = express();

      app.use('/', middlewares.requireUser('foo.auth0.com'));

      request(app)
        .get('/')
        .expect(401)
        .end(function(err, res) {
          if (err) throw err;
          expect(res.text).toMatch(/UnauthorizedError: Authentication required for this endpoint/);
          done();
        });
    });

    it('should work', function(done) {
      const app = express();
      const addUser = function(req, res, next) {
        req.user = { name: 'User', aud: [ 'https://foo.auth0.com/api/v2/' ] };
        next();
      };

      app.use('/', addUser, middlewares.requireUser('foo.auth0.com'), function(req, res) {
        res.send();
      });

      request(app)
        .get('/')
        .expect(200)
        .end(function(err) {
          if (err) throw err;
          done();
        });
    });

    it('should validate the audience', function(done) {
      const app = express();
      const addUser = function(req, res, next) {
        req.user = { name: 'User', aud: [ 'https://somethingelse.auth0.com/api/v2/' ] };
        next();
      };

      app.use('/', addUser, middlewares.requireUser('foo.auth0.com'), function(req, res) {
        res.send();
      });

      request(app)
        .get('/')
        .expect(401)
        .end(function(err, res) {
          if (err) throw err;
          expect(res.text).toMatch(/Invalid token. Audience does not match: foo.auth0.com/);
          done();
        });
    });
  });
});
