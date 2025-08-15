/**
 * Meta utilities for attaching source and trace information to API requests
 */

let defaultTrace: string | undefined;

const deriveTraceFromLocation = (): string => {
  try {
    if (typeof window !== 'undefined' && window.location && window.location.pathname) {
      const path = window.location.pathname.replace(/\/$/, '');
      return path || '/';
    }
  } catch (_) {
    // noop
  }
  return 'unknown';
};

export const setDefaultTrace = (trace: string): void => {
  defaultTrace = trace || 'unknown';
};

export const getDefaultTrace = (): string => {
  return defaultTrace || deriveTraceFromLocation();
};

export const getMetaHeaders = (traceOverride?: string): Record<string, string> => {
  const trace = traceOverride || getDefaultTrace();
  return {
    'x-source': 'frontend',
    'x-trace': trace,
  };
};

export const withMetaQuery = (params?: Record<string, any>, traceOverride?: string): Record<string, any> => {
  return {
    ...(params || {}),
    _source: 'frontend',
    _trace: traceOverride || getDefaultTrace(),
  };
};


