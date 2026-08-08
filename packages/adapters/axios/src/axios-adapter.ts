import { BaseAdapter } from '@jswork/universal-request-core';
import type { RequestConfig, Response } from '@jswork/universal-request-core';
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Axios 适配器
 * 将 axios 作为底层请求库，复用其拦截器、取消、超时等能力
 */
export class AxiosAdapter extends BaseAdapter {
  private instance: AxiosInstance;

  /**
   * @param instance 可选的 axios 实例，不传则内部创建
   */
  constructor(instance?: AxiosInstance) {
    super();
    this.instance = instance || axios.create();
  }

  /**
   * 获取底层 axios 实例，方便直接配置 axios 拦截器等
   */
  get axiosInstance(): AxiosInstance {
    return this.instance;
  }

  async request(config: RequestConfig): Promise<Response> {
    // 1. 构建完整 URL
    const url = this.buildURL(config);

    // 2. 序列化数据
    const { body, headers } = this.serializeData(config);

    // 3. 构造 axios 配置
    const axiosConfig: AxiosRequestConfig = {
      url,
      method: config.method?.toLowerCase() as any,
      headers,
      data: config.method !== 'GET' && config.method !== 'HEAD' ? body : undefined,
      signal: config.signal as any,
      timeout: config.timeout,
      withCredentials: config.withCredentials,
      responseType: config.responseType as any
    };

    // 4. 发起请求
    const axiosResponse: AxiosResponse = await this.instance.request(axiosConfig);

    // 5. 转换为通用 Response 格式
    return {
      data: axiosResponse.data,
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
      headers: axiosResponse.headers as Record<string, string>,
      config
    };
  }
}