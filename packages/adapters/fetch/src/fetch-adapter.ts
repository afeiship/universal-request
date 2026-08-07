import { BaseAdapter } from '@jswork/universal-request-core';
import type { RequestConfig, Response } from '@jswork/universal-request-core';

/**
 * Fetch 适配器
 */
export class FetchAdapter extends BaseAdapter {
  async request(config: RequestConfig): Promise<Response> {
    // 1. 构建完整 URL
    const url = this.buildURL(config);

    // 2. 序列化数据
    const { body, headers } = this.serializeData(config);

    // 3. 发起 fetch 请求
    const fetchPromise = fetch(url, {
      method: config.method,
      headers,
      body: config.method !== 'GET' && config.method !== 'HEAD' ? body : undefined,
      signal: config.signal,
      credentials: config.withCredentials ? 'include' : 'same-origin'
    }).then(async (response) => {
      // 解析响应
      let data: any;
      const responseType = config.responseType || 'json';

      switch (responseType) {
        case 'json':
          data = await response.json();
          break;
        case 'text':
          data = await response.text();
          break;
        case 'blob':
          data = await response.blob();
          break;
        case 'arrayBuffer':
          data = await response.arrayBuffer();
          break;
        case 'formData':
          data = await response.formData();
          break;
        default:
          data = await response.json();
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
        config
      };
    });

    // 4. 包装超时和取消
    return this.wrapRequest(fetchPromise, config);
  }

  /**
   * 解析响应头
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}
