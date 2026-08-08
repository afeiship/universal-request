import type { RequestConfig, RequestCoreConfig, Response } from './types';
import { InterceptorManager } from './interceptor-manager';
import { RequestError, ErrorType } from './errors';

/**
 * 核心请求类
 */
export class RequestCore {
  private defaultConfig: RequestCoreConfig;
  private interceptorManager: InterceptorManager = new InterceptorManager();

  /**
   * 统一的拦截器管理
   */
  interceptors = this.interceptorManager;

  constructor(config: RequestCoreConfig) {
    this.defaultConfig = {
      timeout: 0,
      headers: {},
      ...config
    };

    // 预置拦截器
    if (config.interceptors) {
      config.interceptors.forEach((interceptor) => {
        this.interceptorManager.use(interceptor);
      });
    }
  }

  /**
   * 发送请求
   */
  async request<T = any>(config: RequestConfig): Promise<Response<T>> {
    try {
      // 1. 合并配置
      const mergedConfig = this.mergeConfig(config);

      // 2. 执行请求拦截器
      const processedConfig = await this.interceptorManager.executeRequest(mergedConfig);

      // 3. 发送请求（通过适配器）
      const response = await this.defaultConfig.adapter.request(processedConfig);

      // 4. 执行响应拦截器
      const processedResponse = await this.interceptorManager.executeResponse(response);

      // 5. slim 处理
      if (config.slim) {
        return {
          data: processedResponse.data,
          status: processedResponse.status,
          statusText: processedResponse.statusText,
          headers: processedResponse.headers,
          config: processedResponse.config
        } as any;
      }

      return processedResponse;
    } catch (error: any) {
      // 处理错误
      const requestError = this.normalizeError(error, config);

      // resolveAble 处理
      if (config.resolveAble) {
        return {
          data: null,
          status: requestError.status || 0,
          statusText: requestError.message,
          headers: {},
          config,
          error: requestError
        } as any;
      }

      // 执行拦截器的错误处理
      try {
        return await this.interceptorManager.executeError(requestError);
      } catch (err) {
        throw err;
      }
    }
  }

  /**
   * GET 请求
   */
  async get<T = any>(url: string, params?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'params'>): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'GET', params });
  }

  /**
   * POST 请求
   */
  async post<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'POST', data });
  }

  /**
   * PUT 请求
   */
  async put<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', data });
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  /**
   * PATCH 请求
   */
  async patch<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', data });
  }

  /**
   * 合并配置
   */
  private mergeConfig(config: RequestConfig): RequestConfig {
    return {
      ...this.defaultConfig,
      ...config,
      headers: {
        ...this.defaultConfig.headers,
        ...config.headers
      }
    };
  }

  /**
   * 标准化错误
   */
  private normalizeError(error: any, config: RequestConfig): RequestError {
    // 已经是 RequestError
    if (error instanceof RequestError) {
      return error;
    }

    // 取消错误
    if (error.name === 'AbortError' || error.type === 'abort') {
      return new RequestError('Request aborted', ErrorType.ABORT_ERROR, config);
    }

    // 超时错误
    if (error.message?.toLowerCase().includes('timeout')) {
      return new RequestError(error.message, ErrorType.TIMEOUT_ERROR, config);
    }

    // HTTP 错误（有响应）
    if (error.response) {
      return new RequestError(
        error.message,
        ErrorType.HTTP_ERROR,
        config,
        error.response
      );
    }

    // 网络错误
    return new RequestError(
      error.message || 'Network Error',
      ErrorType.NETWORK_ERROR,
      config
    );
  }
}

/**
 * 工厂函数
 */
export function createRequest(config: RequestCoreConfig): RequestCore {
  return new RequestCore(config);
}