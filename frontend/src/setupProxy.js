const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Force proxy to use port 8183 for recommendation service
  const proxyTarget = 'http://127.0.0.1:8183';
  
  console.log('Proxy enabled for backend testing:', proxyTarget);
  app.use(
    '/api',
    createProxyMiddleware({
      target: proxyTarget,
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api',
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