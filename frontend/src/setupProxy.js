const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy for Kite Services (Production - API ref: 203.57.85.72:8179)
  // Use prod by default for CI/CD; override with REACT_APP_KITE_SERVICES_TARGET for dev/stage
  const kiteTarget = process.env.REACT_APP_KITE_SERVICES_TARGET || 'http://203.57.85.72:8179';
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

  // Proxy for Chartink Query Service (Production - websyssoft:8081)
  app.use(
    '/api/chartink-query',
    createProxyMiddleware({
      target: 'http://203.57.85.72:8081',  // Production Chartink Service
      changeOrigin: true,
      pathRewrite: {
        '^/api/chartink-query': '/api/v1',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying Chartink Query request:', req.method, req.url, 'to', 'http://203.57.85.72:8081' + req.url.replace('/api/chartink-query', '/api/v1'));
      },
      onError: (err, req, res) => {
        console.error('Chartink Query proxy error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Chartink Query proxy error', message: err.message }));
      },
    })
  );

  // Proxy for Chartink Authentication Service – always prod 8181 (vnc-url, check, force-update)
  const chartinkAuthTarget = 'http://203.57.85.72:8181';
  console.log('[setupProxy] Chartink Auth target:', chartinkAuthTarget);
  app.use(
    '/api/chartink',
    createProxyMiddleware({
      target: chartinkAuthTarget,
      changeOrigin: true,
      pathRewrite: {
        '^/api/chartink': '/api/v1/auth',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying Chartink Auth request:', req.method, req.url, 'to', chartinkAuthTarget + req.url.replace('/api/chartink', '/api/v1/auth'));
      },
      onError: (err, req, res) => {
        console.error('Chartink proxy error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Chartink proxy error', message: err.message }));
      },
    })
  );

  // Proxy for Seed Service - Production (websyssoft:8182)
  app.use(
    '/api/seed',
    createProxyMiddleware({
      target: 'http://203.57.85.72:8182',  // Production Seed Stocks Service
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
        console.log('Proxying Seed request:', req.method, req.url, 'to', 'http://203.57.85.72:8182' + req.url.replace('/api/seed', '/api'));
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