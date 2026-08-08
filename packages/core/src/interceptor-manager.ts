import type { UnifiedInterceptor, RequestConfig, Response } from './types';

/**
 * 统一的拦截器管理器
 */
export class InterceptorManager {
  private interceptors: UnifiedInterceptor[] = [];

  /**
   * 添加拦截器
   */
  use(interceptor: UnifiedInterceptor): void {
    this.interceptors.push(interceptor);
  }

  /**
   * 移除拦截器
   */
  eject(id: string): boolean {
    const index = this.interceptors.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.interceptors.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 清空所有拦截器
   */
  clear(): void {
    this.interceptors = [];
  }

  /**
   * 获取指定拦截器
   */
  get(id: string): UnifiedInterceptor | undefined {
    return this.interceptors.find((item) => item.id === id);
  }

  /**
   * 获取所有拦截器
   */
  getAll(): UnifiedInterceptor[] {
    return [...this.interceptors];
  }

  /**
   * 执行请求阶段拦截器
   */
  async executeRequest(value: RequestConfig): Promise<RequestConfig> {
    let result = value;
    for (const interceptor of this.interceptors) {
      if (interceptor.request) {
        result = await interceptor.request(result);
      }
    }
    return result;
  }

  /**
   * 执行响应阶段拦截器
   */
  async executeResponse(value: Response): Promise<Response> {
    let result = value;
    for (const interceptor of this.interceptors) {
      if (interceptor.response) {
        result = await interceptor.response(result);
      }
    }
    return result;
  }

  /**
   * 执行错误处理（反向执行）
   */
  async executeError(error: any): Promise<any> {
    let currentError = error;
    for (let i = this.interceptors.length - 1; i >= 0; i--) {
      const interceptor = this.interceptors[i];
      if (interceptor.error) {
        try {
          return await interceptor.error(currentError);
        } catch (err) {
          currentError = err;
        }
      }
    }
    throw currentError;
  }
}