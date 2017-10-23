const Promise = require('bluebird');

const idle = function(timeout) {
  return new Promise(function(resolve) {
    setTimeout(resolve, timeout * 1000);
  });
};

module.exports = function(context, promise, args, retry) {
  var retriesLeft = retry || 2;

  const tryRequest = function() {
    return promise.apply(context, args)
      .then(Promise.resolve)
      .catch(function(err) {
        const originalError = err.originalError || {};
        const ratelimitReset = (originalError.response && originalError.response.header && originalError.response.header['x-ratelimit-reset']) || 0;
        const currentTime = Math.round(new Date().getTime() / 1000);
        const maxTimeout = 10; // wait for 10 seconds max
        var timeout = parseInt(ratelimitReset, 10) - currentTime;

        if (originalError.status === 429 && retriesLeft > 0 && ratelimitReset && timeout <= maxTimeout) {
          retriesLeft -= 1;
          if (timeout <= 0) {
            timeout = 1;
          }

          return idle(timeout).then(tryRequest);
        }

        return Promise.reject(err);
      });
  };

  return tryRequest();
};
