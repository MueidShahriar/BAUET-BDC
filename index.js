const { app } = require('./server.js');

if (typeof app !== 'function') {
  throw new Error('Express app was not exported from server.js');
}

module.exports = app;
