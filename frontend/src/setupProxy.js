const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Get proxy target from environment variable
  const proxyTarget = process.env.REACT_APP_PROXY_TARGET || 'http://127.0.0.1:8893';
  
  app.use(
    '/api',
    createProxyMiddleware({
      target: proxyTarget,
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api', // no rewrite needed
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request:', req.method, req.url, 'to', proxyTarget + req.url);
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
      },
    })
  );
}; 