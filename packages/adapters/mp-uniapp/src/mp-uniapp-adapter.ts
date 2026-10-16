import { BaseAdapter, RequestError, ErrorType } from '@jswork/universal-request-core';
import type { RequestConfig, Response } from '@jswork/universal-request-core';

/**
 * uni.request 成功回调数据
 */
interface MinaSuccessResult {
  data: any;
  statusCode: number;
  header?: Record<string, string>;
  cookies?: string[];
}

/**
 * uni.request 失败回调数据
 */
interface MinaFailResult {
  errMsg?: string;
  statusCode?: number;
}

/**
 * uni.request 返回的请求任务
 */
interface MinaRequestTask {
  abort(): void;
}

/**
 * uni.request 选项（仅声明本适配器用到的字段）
 */
interface MinaRequestOptions {
  url: string;
  method?: string;
  header?: Record<string, string>;
  data?: any;
  timeout?: number;
  responseType?: 'text' | 'arraybuffer';
  success: (res: MinaSuccessResult) => void;
  fail: (err: MinaFailResult) => void;
}

// 模块级声明，避免与业务项目中的全局 uni 类型产生冲突
declare const uni: {
  request(options: MinaRequestOptions): MinaRequestTask;
};

/**
 * Uniapp(微信小程序) 适配器
 * 基于 uni.request 实现，适用于 uni-app 编译到 mp-weixin 等小程序端
 */
export class MpUniappAdapter extends BaseAdapter {
  async request(config: RequestConfig): Promise<Response> {
    // 1. 构建完整 URL
    const url = this.buildURL(config);

    // 2. 序列化数据（GET/HEAD/DELETE 的 payload 已拼入 query，不再作为 body）
    const { body, headers } = this.serializeData(config);
    const isQueryMethod =
      config.method === 'GET' || config.method === 'HEAD' || config.method === 'DELETE';

    // 3. 发起请求，并响应 signal 取消（通过 RequestTask.abort 真正中断网络请求）
    const promise = new Promise<Response>((resolve, reject) => {
      const options: MinaRequestOptions = {
        url,
        method: config.method || 'GET',
        header: headers,
        data: isQueryMethod ? undefined : body,
        success: (res) => {
          resolve({
            data: this.parseData(res.data, config),
            status: res.statusCode,
            statusText: '',
            headers: res.header || {},
            config
          });
        },
        fail: (err) => {
          reject(this.normalizeFail(err, config));
        }
      };

      // uni.request 仅支持 text/arraybuffer，其余按 text 处理
      if (config.responseType === 'arrayBuffer') options.responseType = 'arraybuffer';
      if (config.timeout) options.timeout = config.timeout;

      const task = uni.request(options);

      if (config.signal) {
        if (config.signal.aborted) {
          task?.abort?.();
        } else {
          config.signal.addEventListener('abort', () => task?.abort?.());
        }
      }
    });

    // 4. 包装超时和取消（core 层兜底）
    return this.wrapRequest(promise, config);
  }

  /**
   * 解析响应数据：仅 responseType 为 json（默认）时做字符串解析，
   * 小程序在 content-type 为 json 时可能已自动解析为对象
   */
  private parseData(data: any, config: RequestConfig): any {
    const responseType = config.responseType || 'json';
    if (responseType !== 'json') return data;

    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    }

    return data;
  }

  /**
   * 标准化 fail 回调错误，便于 core 分类（abort/timeout/network）
   */
  private normalizeFail(err: MinaFailResult, config: RequestConfig): RequestError {
    const message = err?.errMsg || 'Network Error';

    if (message.includes('abort')) {
      return new RequestError(message, ErrorType.ABORT_ERROR, config);
    }

    if (message.includes('timeout')) {
      return new RequestError(message, ErrorType.TIMEOUT_ERROR, config);
    }

    return new RequestError(message, ErrorType.NETWORK_ERROR, config);
  }
}
