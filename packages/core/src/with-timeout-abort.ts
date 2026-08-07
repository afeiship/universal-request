import { RequestError, ErrorType } from './errors';
import type { RequestConfig, Response } from './types';

/**
 * 包装请求：添加超时和取消功能
 */
export function withTimeoutAbort(
  promise: Promise<Response>,
  config: RequestConfig
): Promise<Response> {
  const promises: Promise<Response>[] = [promise];

  // 超时处理
  if (config.timeout && config.timeout > 0) {
    promises.push(
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new RequestError(
            `Timeout of ${config.timeout}ms exceeded`,
            ErrorType.TIMEOUT_ERROR,
            config
          ));
        }, config.timeout);
      })
    );
  }

  // 取消处理
  if (config.signal) {
    promises.push(
      new Promise((_, reject) => {
        config.signal!.addEventListener('abort', () => {
          reject(new RequestError(
            'Request aborted',
            ErrorType.ABORT_ERROR,
            config
          ));
        });
      })
    );
  }

  return Promise.race(promises);
}
