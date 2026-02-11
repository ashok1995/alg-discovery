const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy for Kite Token Management Service (port 8079)
  app.use(
    '/api/token',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8079',
      changeOrigin: true,
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying Kite Token request:', req.method, req.url, 'to', 'http://127.0.0.1:8079' + req.url);
      },
      onError: (err, req, res) => {
        console.error('Kite Token proxy error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Kite Token proxy error', message: err.message }));
      },
    })
  );

  // Proxy for Chartink Authentication Service (port 8081)
  app.use(
    '/api/chartink',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8081',  // Force IPv4
      changeOrigin: true,
      pathRewrite: {
        '^/api/chartink': '/api/v1/auth',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying Chartink request:', req.method, req.url, 'to', 'http://127.0.0.1:8081' + req.url.replace('/api/chartink', '/api/v1/auth'));
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

  // Proxy for Seed Service (port 8082)  
  app.use(
    '/api/seed',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8082',  // Force IPv4
      changeOrigin: true,
      pathRewrite: {
        '^/api/seed': '/api/v2/stocks',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying Seed request:', req.method, req.url, 'to', 'http://127.0.0.1:8082' + req.url.replace('/api/seed', '/api/v2/stocks'));
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