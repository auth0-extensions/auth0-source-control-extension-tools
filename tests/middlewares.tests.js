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

    it('should throw "clientName is required" error', function(done) {
      expect(function() {
        middlewares.dashboardAdmins('domain');
      })
        .toThrow(/clientName is required/);

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

      app.use('/', middlewares.requireUser);

      request(app)
        .get('/')
        .expect(401)
        .end(function(err, res) {
          if (err) throw err;
          expect(res.error).toMatch(/UnauthorizedError: Authentication required for this endpoint/);
          done();
        });
    });

    it('should work', function(done) {
      const app = express();
      const addUser = function(req, res, next) {
        req.user = { name: 'User' };
        next();
      };

      app.use('/', addUser, middlewares.requireUser, function(req, res) {
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
});
