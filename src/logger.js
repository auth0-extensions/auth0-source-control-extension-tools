const winston = require('winston');

winston.emitErrs = true;

const level = process.env.AUTH0_DEBUG === 'true' ? 'debug' : 'info';

const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      timestamp: true,
      level: level,
      handleExceptions: true,
      json: false,
      colorize: true
    })
  ],
  exitOnError: false
});

module.exports = logger;
