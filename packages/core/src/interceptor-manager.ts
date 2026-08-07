import pipe from '@jswork/pipe';
import type { Interceptor } from './types';

/**
 * 拦截器管理器
 */
export class InterceptorManager<V, R = V> {
  private interceptors: Array<{
    id: number;
    interceptor: Interceptor<V, R>;
  }> = [];
  private idCounter = 0;

  /**
   * 添加拦截器
   */
  use(fulfilled?: (value: V) => R | Promise<R>, rejected?: (error: any) => any): number {
    const id = this.idCounter++;
    this.interceptors.push({
      id,
      interceptor: { fulfilled, rejected }
    });
    return id;
  }

  /**
   * 移除拦截器
   */
  eject(id: number): void {
    const index = this.interceptors.findIndex(item => item.id === id);
    if (index !== -1) {
      this.interceptors.splice(index, 1);
    }
  }

  /**
   * 清空所有拦截器
   */
  clear(): void {
    this.interceptors = [];
  }

  /**
   * 执行拦截器链（基于 pipe）
   */
  async execute(value: V): Promise<R> {
    const fns = this.interceptors
      .map(item => item.interceptor.fulfilled)
      .filter(Boolean) as Array<(value: any) => any>;

    if (fns.length === 0) {
      return value as any;
    }

    const pipeline = pipe.async(...fns);
    return await pipeline(value);
  }

  /**
   * 处理错误（反向查找第一个有 rejected 的拦截器）
   */
  async handleError(error: any): Promise<any> {
    for (let i = this.interceptors.length - 1; i >= 0; i--) {
      const interceptor = this.interceptors[i].interceptor;
      if (interceptor.rejected) {
        try {
          return await interceptor.rejected(error);
        } catch (err) {
          error = err;
        }
      }
    }
    throw error;
  }
}
