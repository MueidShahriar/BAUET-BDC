
const { app } = require('./chat-handler.cjs');

if (!app) {
  throw new Error('Express app could not be loaded');
}

module.exports = app;
