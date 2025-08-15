import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const now = () => new Date().toISOString();

const buildFullUrl = (config: AxiosRequestConfig): string => {
  const base = (config.baseURL || '').replace(/\/$/, '');
  const path = (config.url || '').replace(/^\//, '/');
  return `${base}${path}` || path || '';
};

export const attachAxiosLogging = (instance: AxiosInstance, label: string = 'HTTP'): void => {
  const timings = new Map<string, number>();

  instance.interceptors.request.use((config) => {
    const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    (config as any)._requestId = requestId;
    timings.set(requestId, performance.now());

    const fullUrl = buildFullUrl(config);
    const method = (config.method || 'get').toUpperCase();

    // Dev note if relying on CRA proxy
    if (process.env.NODE_ENV !== 'production' && !config.baseURL) {
      console.warn(`[${label}] ${now()} PROXY mode (no baseURL). Request will go via CRA proxy.`, {
        requestId,
        proxyTarget: (window as any)?.__env_proxy || 'package.json "proxy"',
      });
    }

    console.groupCollapsed(`[%s] %s %s`, label, method, fullUrl);
    console.log('time:', now());
    console.log('requestId:', requestId);
    console.log('baseURL:', config.baseURL || '(empty)');
    console.log('url:', config.url);
    console.log('headers:', config.headers);
    console.log('params:', config.params);
    console.log('data:', config.data);
    console.groupEnd();

    return config;
  });

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      const requestId = (response.config as any)._requestId as string;
      const start = timings.get(requestId) || performance.now();
      const durationMs = Math.round(performance.now() - start);
      const fullUrl = buildFullUrl(response.config);
      const method = (response.config.method || 'get').toUpperCase();

      console.groupCollapsed(`[%s] %s %s → %s (%dms)`, label, method, fullUrl, response.status, durationMs);
      console.log('time:', now());
      console.log('requestId:', requestId);
      console.log('response headers:', response.headers);
      console.log('response data size:', typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data || {}).length);
      console.groupEnd();

      timings.delete(requestId);
      return response;
    },
    (error: any) => {
      const cfg: AxiosRequestConfig | undefined = error?.config;
      const requestId = cfg ? (cfg as any)._requestId : 'unknown';
      const start = timings.get(requestId) || performance.now();
      const durationMs = Math.round(performance.now() - start);
      const fullUrl = cfg ? buildFullUrl(cfg) : '(unknown)';
      const method = cfg?.method ? cfg.method.toUpperCase() : 'UNKNOWN';
      const status = error?.response?.status ?? 'NO_RESPONSE';

      console.groupCollapsed(`[%s] %s %s → ERROR %s (%dms)`, label, method, fullUrl, String(status), durationMs);
      console.log('time:', now());
      console.log('requestId:', requestId);
      console.log('baseURL:', cfg?.baseURL || '(empty)');
      console.log('url:', cfg?.url);
      console.log('headers:', cfg?.headers);
      console.log('params:', cfg?.params);
      console.log('data:', cfg?.data);
      console.log('error message:', error?.message);
      console.log('error response:', error?.response?.data);
      console.groupEnd();

      timings.delete(requestId);
      return Promise.reject(error);
    }
  );
};

export default attachAxiosLogging;


