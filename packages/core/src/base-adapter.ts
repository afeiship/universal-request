import type { Adapter, RequestConfig, Response } from './types';
import { withTimeoutAbort } from './with-timeout-abort';
import { safeStringify } from './safe-stringify';

/**
 * 适配器抽象基类
 * 子类只需实现 request 方法即可
 */
export abstract class BaseAdapter implements Adapter {
  /**
   * 发送请求（子类必须实现）
   */
  abstract request(config: RequestConfig): Promise<Response>;

  /**
   * 构建完整 URL（baseURL + url + params）
   */
  protected buildURL(config: RequestConfig): string {
    let url = config.url;

    // 拼接 baseURL
    if (config.baseURL && !url.startsWith('http')) {
      url = config.baseURL.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
    }

    // 拼接查询参数
    if (config.params && Object.keys(config.params).length > 0) {
      const queryString = new URLSearchParams(config.params).toString();
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    return url;
  }

  /**
   * 序列化请求数据（根据 dataType）
   */
  protected serializeData(config: RequestConfig): { body?: any; headers: Record<string, string> } {
    const { data, dataType = 'json', headers = {} } = config;

    if (data === undefined || data === null) {
      return { headers };
    }

    const result: { body?: any; headers: Record<string, string> } = { headers: { ...headers } };

    switch (dataType) {
      case 'json':
        result.body = safeStringify(data);
        result.headers['Content-Type'] = 'application/json;charset=utf-8';
        break;

      case 'urlencoded':
        result.body = new URLSearchParams(data).toString();
        result.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        break;

      case 'multipart': {
        const fd = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          fd.append(key, value as any);
        });
        result.body = fd;
        // 不设置 Content-Type，让浏览器自动设置 boundary
        break;
      }

      case 'text':
        result.body = String(data);
        result.headers['Content-Type'] = 'text/plain';
        break;

      case 'blob':
        result.body = data;
        break;

      case 'auto': {
        // 自动判断：有文件用 multipart，否则用 json
        const hasFile = Object.values(data).some(v =>
          v instanceof File || v instanceof Blob || v instanceof FormData
        );
        if (hasFile) {
          const fd = new FormData();
          Object.entries(data).forEach(([key, value]) => {
            fd.append(key, value as any);
          });
          result.body = fd;
        } else {
          result.body = safeStringify(data);
          result.headers['Content-Type'] = 'application/json;charset=utf-8';
        }
        break;
      }

      default:
        result.body = data;
    }

    return result;
  }

  /**
   * 包装请求：超时 + 取消
   */
  protected wrapRequest(promise: Promise<Response>, config: RequestConfig): Promise<Response> {
    return withTimeoutAbort(promise, config);
  }
}
