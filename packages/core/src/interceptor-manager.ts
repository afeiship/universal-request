import type { UnifiedInterceptor, RequestConfig, Response } from './types';

/**
 * Unified interceptor manager
 */
export class InterceptorManager {
  private interceptors: UnifiedInterceptor[] = [];

  /**
   * Add an interceptor
   */
  use(interceptor: UnifiedInterceptor): void {
    this.interceptors.push(interceptor);
  }

  /**
   * Remove an interceptor
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
   * Clear all interceptors
   */
  clear(): void {
    this.interceptors = [];
  }

  /**
   * Get a specific interceptor
   */
  get(id: string): UnifiedInterceptor | undefined {
    return this.interceptors.find((item) => item.id === id);
  }

  /**
   * Get all interceptors
   */
  getAll(): UnifiedInterceptor[] {
    return [...this.interceptors];
  }

  /**
   * Execute request-phase interceptors
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
   * Execute response-phase interceptors
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
   * Execute error handling (in reverse order)
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