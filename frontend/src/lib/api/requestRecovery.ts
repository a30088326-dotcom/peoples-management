import { CanceledError, type AxiosError } from 'axios';

export function canRetryRead(error: AxiosError, attempts: number): boolean {
  if (!error.config || attempts >= 2 || error.config.signal?.aborted || error.code === 'ERR_CANCELED') return false;
  if (!['get', 'head'].includes((error.config.method || 'get').toLowerCase())) return false;
  return error.response
    ? [500, 502, 503, 504].includes(error.response.status)
    : ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET'].includes(error.code || '');
}

export function waitForReadRetry(attempts: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new CanceledError()); return; }
    const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new CanceledError()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, 250 * (attempts + 1));
    signal?.addEventListener('abort', abort, { once: true });
  });
}
