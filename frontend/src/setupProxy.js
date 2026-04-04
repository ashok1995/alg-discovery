const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy for Kite Services (Swagger: http://35.232.205.155:8179/docs)
  // Override with REACT_APP_KITE_SERVICES_TARGET for dev/stage
  const kiteTarget = process.env.REACT_APP_KITE_SERVICES_TARGET || 'http://35.232.205.155:8179';
  // Proxy /api/redirect for Kite OAuth callback (so callback lands in app when using localhost)
  app.use(
    '/api/redirect',
    createProxyMiddleware({
      target: kiteTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/redirect': '/api/redirect' },
    })
  );
  app.use(
    '/api/kite',
    createProxyMiddleware({
      target: kiteTarget,
      changeOrigin: true,
      pathRewrite: {
        '^/api/kite/health': '/health',
        '^/api/kite': '/api',
      },
      onProxyReq: (proxyReq, req, res) => {
        const dest = req.url.startsWith('/api/kite/health') ? req.url.replace('/api/kite/health', '/health') : req.url.replace('/api/kite', '/api');
        console.log('Proxying Kite request:', req.method, req.url, '->', dest);
      },
      onError: (err, req, res) => {
        console.error('Kite Services proxy error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Kite Services proxy error', message: err.message }));
      },
    })
  );

  // Query execution API (same host as auth - 8181: execute, session-status); path /api/chartink-query
  const chartinkQueryTarget = process.env.REACT_APP_CHARTINK_AUTH_TARGET || 'http://35.232.205.155:8181';
  app.use(
    '/api/chartink-query',
    createProxyMiddleware({
      target: chartinkQueryTarget,
      changeOrigin: true,
      pathRewrite: {
        '^/api/chartink-query': '/api/v1',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying query-execution request:', req.method, req.url, 'to', chartinkQueryTarget + req.url.replace('/api/chartink-query', '/api/v1'));
      },
      onError: (err, req, res) => {
        console.error('Query execution proxy error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Query execution proxy error', message: err.message }));
      },
    })
  );

  // Internal market context (Kite host 8179)
  app.use(
    '/api/internal-market-context',
    createProxyMiddleware({
      target: kiteTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/internal-market-context': '/api/internal-market-context' },
      onError: (err, req, res) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal market context unavailable', message: err.message }));
      },
    })
  );

  // Global context (Yahoo host 8185)
  const yahooTarget = process.env.REACT_APP_YAHOO_SERVICE_TARGET || 'http://203.57.85.201:8185';
  app.use(
    '/api/global-context',
    createProxyMiddleware({
      target: yahooTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/global-context': '/api/v1/global-context' },
      onError: (err, req, res) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Global context unavailable', message: err.message }));
      },
    })
  );

  // Yahoo Service health (203.57.85.201:8185) - no auth, status only
  app.use(
    '/api/yahoo-health',
    createProxyMiddleware({
      target: yahooTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/yahoo-health': '/health' },
      onError: (err, req, res) => {
        console.error('Yahoo health proxy error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Yahoo health check failed', message: err.message }));
      },
    })
  );

  // Query execution auth proxy – 8181 (session-status, vnc-url, force-update, cookie/status, clear); path /api/chartink
  const chartinkAuthTarget = process.env.REACT_APP_CHARTINK_AUTH_TARGET || 'http://35.232.205.155:8181';
  console.log('[setupProxy] Query execution auth target:', chartinkAuthTarget);
  // Health: GET /health at service root
  app.use(
    '/api/chartink-health',
    createProxyMiddleware({
      target: chartinkAuthTarget,
      changeOrigin: true,
      pathRewrite: { '^/api/chartink-health': '/health' },
      onError: (err, req, res) => {
        console.error('Query execution health proxy error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Query execution health check failed', message: err.message }));
      },
    })
  );
  app.use(
    '/api/chartink',
    createProxyMiddleware({
      target: chartinkAuthTarget,
      changeOrigin: true,
      pathRewrite: {
        '^/api/chartink': '/api/v1/auth',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying query-execution auth request:', req.method, req.url, 'to', chartinkAuthTarget + req.url.replace('/api/chartink', '/api/v1/auth'));
      },
      onError: (err, req, res) => {
        console.error('Query execution auth proxy error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Query execution auth proxy error', message: err.message }));
      },
    })
  );

  // Proxy for Seed V2 Recommendations - 203.57.85.201:8182 (has intraday_sell data)
  const seedV2Target = process.env.REACT_APP_SEED_V2_TARGET || 'http://203.57.85.201:8182';
  app.use(
    '/api/seed-v2',
    createProxyMiddleware({
      target: seedV2Target,
      changeOrigin: true,
      pathRewrite: { '^/api/seed-v2': '' },
      onProxyReq: (proxyReq, req) => {
        console.log('Proxying Seed V2 request:', req.method, req.url, '->', seedV2Target + req.url.replace('/api/seed-v2', ''));
      },
      onError: (err, req, res) => {
        console.error('Seed V2 proxy error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Seed V2 proxy error', message: err.message }));
      },
    })
  );

  // Proxy for Seed Service - 203.57.85.201:8182 (Seed Stocks Service - /docs)
  const seedTarget = process.env.REACT_APP_SEED_TARGET || 'http://203.57.85.201:8182';
  app.use(
    '/api/seed',
    createProxyMiddleware({
      target: seedTarget,
      changeOrigin: true,
      pathRewrite: {
        '^/api/seed/market/registry/top_gainers': '/api/market/registry/top_gainers',
        '^/api/seed/market/registry/top_losers': '/api/market/registry/top_losers', 
        '^/api/seed/market/registry/top_traded': '/api/market/registry/top_traded',
        '^/api/seed/market/registry': '/api/market/registry',
        '^/api/seed/stocks/unified-recommendations': '/api/v2/recommendations',  // Map to production endpoint
        '^/api/seed/stocks/recommendations': '/api/v2/recommendations',
        '^/api/seed/recommendations': '/api/v2/recommendations',
        '^/api/seed/stocks': '/api/stocks',
        '^/api/seed/health': '/health',
        '^/api/seed': '/api',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying Seed request:', req.method, req.url, '->', seedTarget);
      },
      onError: (err, req, res) => {
        console.error('Seed proxy error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Seed proxy error', message: err.message }));
      },
    })
  );


  // Note: Legacy proxy removed - all services now have specific proxy configurations above
}; 