const app = require('../backend.js');

module.exports = function vercelHandler(req, res) {
  const requestUrl = new URL(req.url, 'http://localhost');
  const routedPath = requestUrl.pathname === '/api/index'
    ? requestUrl.searchParams.get('path')
    : '';

  if (routedPath) {
    requestUrl.searchParams.delete('path');
    const query = requestUrl.searchParams.toString();
    req.url = `/api/${routedPath.replace(/^\/+/, '')}${query ? `?${query}` : ''}`;
    if (req.query && typeof req.query === 'object') delete req.query.path;
    delete req.originalUrl;
  }

  return app(req, res);
};
