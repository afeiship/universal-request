import type { UnifiedInterceptor } from '@jswork/universal-request-core';

export interface LoggerInterceptorOptions {
  prefix?: string;
  onRequest?: (config: any) => void;
  onResponse?: (response: any) => void;
  onError?: (error: any) => void;
}

export function createLoggerInterceptor(options?: LoggerInterceptorOptions): UnifiedInterceptor {
  const prefix = options?.prefix || '[UR]';
  const onRequest = options?.onRequest ?? ((config: any) => {
    console.log(`[request] ${prefix} → ${config.method} ${config.url}`, config.payload || '');
  });
  const onResponse = options?.onResponse ?? ((response: any) => {
    console.log(`[response] ${prefix} ← ${response.status} ${response.statusText}`);
  });
  const onError = options?.onError ?? ((error: any) => {
    console.error(`[error] ${prefix} ✗ ${error.name}: ${error.message}`);
  });

  return {
    id: 'logger',
    request: (config) => {
      onRequest(config);
      return config;
    },
    response: (res) => {
      onResponse(res);
      return res;
    },
    error: (err) => {
      onError(err);
      throw err;
    }
  };
}