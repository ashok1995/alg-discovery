import { useEffect } from 'react';
import { setDefaultTrace } from '../utils/meta';

export const usePageTrace = (trace?: string): void => {
  useEffect(() => {
    const value = trace || (typeof window !== 'undefined' ? window.location.pathname : 'unknown');
    setDefaultTrace(value);
  }, [trace]);
};

export default usePageTrace;


