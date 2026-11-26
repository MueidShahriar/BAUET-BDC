const app = require('../backend.js');

module.exports = function vercelHandler(req, res) {
  const requestUrl = new URL(req.url, 'http://localhost');
  const routedPath = requestUrl.searchParams.get('__route');

  if (routedPath) {
    requestUrl.searchParams.delete('__route');
    const query = requestUrl.searchParams.toString();
    req.url = `${routedPath}${query ? `?${query}` : ''}`;
    if (req.query && typeof req.query === 'object') delete req.query.__route;
    delete req.originalUrl;
  }

  return app(req, res);
};
