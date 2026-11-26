require('express');
const app = require('./backend.js');

if (typeof app !== 'function') {
  throw new TypeError('Express app was not exported from backend.js');
}

module.exports = app;
