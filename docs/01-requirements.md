# Universal Request - 详细需求文档

## 项目概述

**项目名**: universal-request
**描述**: 跨平台请求库，基于适配器模式，支持 Web、微信小程序、React Native 等多端环境。

---

## 需求背景

前端开发需要同时维护多端项目（Web、微信小程序、React Native），各平台网络 API 不一致：
- **Web**: fetch / axios
- **微信小程序**: wx.request
- **React Native**: fetch

**核心目标**: 提供统一调用语法，通过切换适配器适配不同平台，业务代码无需改动。

---

## 架构设计

### 整体架构

采用 **Core + Adapter** 双层架构：

```
┌─────────────────────────────────────────┐
│          业务代码层                      │
│  (统一 API: request.get/post/put/delete) │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Core 核心层                     │
│  - 拦截器管理 (基于 @jswork/pipe)        │
│  - 超时处理                              │
│  - 请求取消 (AbortController)            │
│  - 错误标准化                            │
│  - 配置管理                              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      Adapter 适配器层                    │
│  BaseAdapter (抽象基类)                  │
│    ├─ FetchAdapter                       │
│    ├─ AxiosAdapter                       │
│    ├─ MpWxAdapter                        │
│    └─ CustomAdapter (用户自定义)          │
└─────────────────────────────────────────┘
```

### 包结构设计

采用 monorepo 架构，每个适配器独立发布：

```
packages/
├── core/                           # @universal-request/core
│   ├── src/
│   │   ├── request-core.ts         # 核心请求类
│   │   ├── base-adapter.ts         # 适配器抽象基类
│   │   ├── interceptor-manager.ts  # 拦截器管理器
│   │   ├── types.ts                # 核心类型定义
│   │   └── errors.ts               # 统一错误定义
│   ├── package.json
│   └── tsconfig.json
│
├── adapters/
│   ├── fetch/                      # @universal-request/adapter-fetch
│   │   ├── src/
│   │   │   ├── fetch-adapter.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── axios/                      # @universal-request/adapter-axios
│   │   ├── src/
│   │   │   ├── axios-adapter.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── mp-wx/                      # @universal-request/adapter-mp-wx
│       ├── src/
│       │   ├── mp-wx-adapter.ts
│       │   └── index.ts
│       └── package.json
│
└── websites/                       # 文档和示例站点
    ├── docs/
    │   ├── getting-started.md
    │   ├── api-reference.md
    │   ├── adapters.md
    │   └── custom-adapter.md
    └── examples/
        ├── web-fetch/
        ├── web-axios/
        ├── mp-weixin/
        └── custom/
```

---

## 核心模块设计

### 1. 类型定义 (types.ts)

```typescript
/**
 * 请求方法枚举
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 响应数据类型
 */
export type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';

/**
 * 请求配置接口
 */
export interface RequestConfig {
  // 基础配置
  url: string;
  method?: HttpMethod;
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;      // URL 查询参数
  data?: any;                         // 请求体数据

  // 高级配置
  timeout?: number;                   // 超时时间（毫秒）
  responseType?: ResponseType;
  withCredentials?: boolean;

  // 适配器特定配置
  [key: string]: any;                 // 允许适配器扩展
}

/**
 * 响应接口
 */
export interface Response<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
}

/**
 * 拦截器接口
 */
export interface Interceptor<V, R = V> {
  fulfilled?: (value: V) => R | Promise<R>;
  rejected?: (error: any) => any;
}

/**
 * 适配器接口
 */
export interface Adapter {
  request(config: RequestConfig): Promise<Response>;
}

/**
 * RequestCore 配置接口
 */
export interface RequestCoreConfig {
  adapter: Adapter;
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}
```

### 2. 错误定义 (errors.ts)

```typescript
/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',         // 网络错误
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',         // 超时错误
  ABORT_ERROR = 'ABORT_ERROR',             // 请求取消
  HTTP_ERROR = 'HTTP_ERROR',               // HTTP 状态码错误
  TRANSFORM_ERROR = 'TRANSFORM_ERROR',     // 数据转换错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'          // 未知错误
}

/**
 * 统一错误类
 */
export class RequestError extends Error {
  public readonly type: ErrorType;
  public readonly status?: number;
  public readonly statusText?: string;
  public readonly config: RequestConfig;
  public readonly response?: Response;

  constructor(
    message: string,
    type: ErrorType,
    config: RequestConfig,
    response?: Response
  ) {
    super(message);
    this.name = 'RequestError';
    this.type = type;
    this.config = config;
    this.response = response;

    if (response) {
      this.status = response.status;
      this.statusText = response.statusText;
    }

    Object.setPrototypeOf(this, RequestError.prototype);
  }

  /**
   * 是否为网络错误
   */
  isNetworkError(): boolean {
    return this.type === ErrorType.NETWORK_ERROR;
  }

  /**
   * 是否为超时错误
   */
  isTimeoutError(): boolean {
    return this.type === ErrorType.TIMEOUT_ERROR;
  }

  /**
   * 是否为取消错误
   */
  isAbortError(): boolean {
    return this.type === ErrorType.ABORT_ERROR;
  }

  /**
   * 是否为 HTTP 错误
   */
  isHttpError(): boolean {
    return this.type === ErrorType.HTTP_ERROR;
  }
}
```

### 3. 拦截器管理器 (InterceptorManager.ts)

基于 `@jswork/pipe` 实现：

```typescript
import pipe from '@jswork/pipe';
import type { Interceptor, RequestConfig, Response } from './types';

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
    // 构建拦截器函数数组
    const fns = this.interceptors
      .map(item => item.interceptor.fulfilled)
      .filter(Boolean) as Array<(value: any) => any>;

    // 使用 pipe.async 执行
    const pipeline = pipe.async(...fns);
    return await pipeline(value);
  }

  /**
   * 处理错误（反向查找第一个有 rejected 的拦截器）
   */
  async handleError(error: any): Promise<any> {
    // 从后往前找
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
```

### 4. 适配器抽象基类 (BaseAdapter.ts)

```typescript
import type { Adapter, RequestConfig, Response } from './types';
import { RequestError, ErrorType } from './errors';

/**
 * 适配器抽象基类
 *
 * 子类只需实现 request 方法即可
 */
export abstract class BaseAdapter implements Adapter {
  /**
   * 发送请求（子类必须实现）
   */
  abstract request(config: RequestConfig): Promise<Response>;

  /**
   * 创建超时 Promise
   */
  protected createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new RequestError(
          `Timeout of ${timeout}ms exceeded`,
          ErrorType.TIMEOUT_ERROR,
          {} as RequestConfig
        ));
      }, timeout);
    });
  }

  /**
   * 创建请求取消 Promise
   */
  protected createAbortPromise<T>(signal?: AbortSignal): Promise<T> {
    if (!signal) return Promise.race([]);

    return new Promise((_, reject) => {
      signal.addEventListener('abort', () => {
        reject(new RequestError(
          'Request aborted',
          ErrorType.ABORT_ERROR,
          {} as RequestConfig
        ));
      });
    });
  }

  /**
   * 处理超时和取消
   */
  protected async withTimeoutAndAbort<T>(
    promise: Promise<T>,
    config: RequestConfig
  ): Promise<T> {
    const promises: Promise<T>[] = [promise];

    // 添加超时
    if (config.timeout) {
      promises.push(this.createTimeoutPromise<T>(config.timeout));
    }

    // 添加取消
    if (config.signal) {
      promises.push(this.createAbortPromise<T>(config.signal));
    }

    return Promise.race(promises);
  }
}
```

### 5. 核心请求类 (RequestCore.ts)

```typescript
import type { RequestConfig, RequestCoreConfig, Response } from './types';
import { InterceptorManager } from './InterceptorManager';
import { RequestError, ErrorType } from './errors';

/**
 * 核心请求类
 */
export class RequestCore {
  private defaultConfig: RequestCoreConfig;
  private requestInterceptors: InterceptorManager<RequestConfig, RequestConfig>;
  private responseInterceptors: InterceptorManager<Response, Response>;

  constructor(config: RequestCoreConfig) {
    this.defaultConfig = {
      timeout: 5000,
      headers: {},
      ...config
    };

    this.requestInterceptors = new InterceptorManager();
    this.responseInterceptors = new InterceptorManager();
  }

  /**
   * 拦截器管理
   */
  interceptors = {
    request: this.requestInterceptors,
    response: this.responseInterceptors
  };

  /**
   * 发送请求
   */
  async request<T = any>(config: RequestConfig): Promise<Response<T>> {
    try {
      // 1. 合并配置
      const mergedConfig = this.mergeConfig(config);

      // 2. 执行请求拦截器
      const processedConfig = await this.requestInterceptors.execute(mergedConfig);

      // 3. 发送请求（通过适配器）
      const response = await this.defaultConfig.adapter.request(processedConfig);

      // 4. 执行响应拦截器
      const processedResponse = await this.responseInterceptors.execute(response);

      return processedResponse;
    } catch (error: any) {
      // 处理错误
      const requestError = this.normalizeError(error, config);

      // 执行响应拦截器的错误处理
      try {
        return await this.responseInterceptors.handleError(requestError);
      } catch (err) {
        throw err;
      }
    }
  }

  /**
   * GET 请求
   */
  async get<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
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

    // 超时错误
    if (error.message?.includes('timeout')) {
      return new RequestError(error.message, ErrorType.TIMEOUT_ERROR, config);
    }

    // 取消错误
    if (error.name === 'AbortError') {
      return new RequestError('Request aborted', ErrorType.ABORT_ERROR, config);
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
```

---

## 适配器实现示例

### 1. FetchAdapter

```typescript
import { BaseAdapter } from '@universal-request/core';
import type { RequestConfig, Response } from '@universal-request/core';

export class FetchAdapter extends BaseAdapter {
  async request(config: RequestConfig): Promise<Response> {
    const { url, method, headers, data, params, signal, timeout } = config;

    // 1. 处理 URL 和查询参数
    let fullUrl = url;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      fullUrl += (url.includes('?') ? '&' : '?') + queryString;
    }

    // 2. 发送请求
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal
    });

    // 3. 处理响应
    const responseData = await response.json();

    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: this.parseHeaders(response.headers),
      config
    };
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}
```

### 2. AxiosAdapter

```typescript
import axios from 'axios';
import { BaseAdapter } from '@universal-request/core';
import type { RequestConfig, Response } from '@universal-request/core';

export class AxiosAdapter extends BaseAdapter {
  async request(config: RequestConfig): Promise<Response> {
    const response = await axios.request({
      url: config.url,
      method: config.method,
      headers: config.headers,
      params: config.params,
      data: config.data,
      timeout: config.timeout,
      signal: config.signal
    });

    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      config
    };
  }
}
```

### 3. MpWxAdapter（微信小程序）

```typescript
import { BaseAdapter } from '@universal-request/core';
import type { RequestConfig, Response } from '@universal-request/core';

export class MpWxAdapter extends BaseAdapter {
  async request(config: RequestConfig): Promise<Response> {
    return new Promise((resolve, reject) => {
      wx.request({
        url: config.url,
        method: config.method,
        header: config.headers,
        data: config.data,
        timeout: config.timeout,
        success: (res) => {
          resolve({
            data: res.data,
            status: res.statusCode,
            statusText: '',
            headers: res.header || {},
            config
          });
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }
}
```

---

## 使用示例

### 1. Web 端使用 FetchAdapter

```typescript
import { createRequest } from '@universal-request/core';
import { FetchAdapter } from '@universal-request/adapter-fetch';

// 创建请求实例
const request = createRequest({
  adapter: new FetchAdapter(),
  baseURL: 'https://api.example.com',
  timeout: 5000
});

// 添加请求拦截器
request.interceptors.request.use(
  (config) => {
    config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
    return config;
  }
);

// 添加响应拦截器
request.interceptors.response.use(
  (response) => {
    // 统一处理响应数据
    return response;
  },
  (error) => {
    if (error.isTimeoutError()) {
      console.error('请求超时');
    }
    return Promise.reject(error);
  }
);

// 发送请求
async function getUserInfo() {
  const response = await request.get<UserInfo>('/user/1');
  console.log(response.data);
}
```

### 2. 微信小程序使用 MpWxAdapter

```typescript
import { createRequest } from '@universal-request/core';
import { MpWxAdapter } from '@universal-request/adapter-mp-wx';

const request = createRequest({
  adapter: new MpWxAdapter(),
  baseURL: 'https://api.example.com'
});

// 使用方式完全相同
Page({
  onLoad() {
    request.get('/user/1').then(response => {
      console.log(response.data);
    });
  }
});
```

### 3. 自定义适配器示例

```typescript
import { BaseAdapter, RequestConfig, Response } from '@universal-request/core';

// 自定义 JSONP 适配器
export class JsonpAdapter extends BaseAdapter {
  async request(config: RequestConfig): Promise<Response> {
    return new Promise((resolve) => {
      const callbackName = `jsonp_${Date.now()}`;
      const script = document.createElement('script');

      script.src = `${config.url}?callback=${callbackName}`;
      document.body.appendChild(script);

      (window as any)[callbackName] = (data: any) => {
        resolve({
          data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        });
        document.body.removeChild(script);
        delete (window as any)[callbackName];
      };
    });
  }
}
```

---

## 测试策略

### 1. 单元测试

- 使用 Jest + TypeScript
- Mock 不同平台的网络 API
- 测试覆盖率要求：≥80%

### 2. 集成测试

- 在真实环境中测试各适配器
- 测试拦截器链的正确性
- 测试错误处理流程

### 3. E2E 测试

- 在真实平台测试（Web、小程序、RN）
- 使用 Cypress（Web）、miniprogram-simulate（小程序）

---

## 发布策略

### 版本管理

- 使用语义化版本（Semantic Versioning）
- 使用 Lerna 管理多包版本
- 使用 Changesets 管理 CHANGELOG

### NPM 包发布

- 核心包：`@universal-request/core`
- 适配器包：`@universal-request/adapter-*`
- 所有包统一版本号

---

## 后续优化方向

### 1. 性能优化
- 请求缓存机制
- 请求去重
- 并发控制

### 2. 功能增强
- 请求重试机制
- 请求节流/防抖
- 上传/下载进度监控

### 3. 开发体验
- 提供命令行工具快速创建适配器
- 提供 TypeScript 类型提示
- 提供完整的 API 文档

---

## 总结

本需求文档详细定义了 universal-request 的架构设计、核心模块、适配器实现和使用方式。核心特点：

1. **架构清晰**：Core + Adapter 双层架构，职责分明
2. **拦截器机制**：基于 `@jswork/pipe` 实现，支持同步/异步
3. **错误处理**：统一错误类型，便于业务处理
4. **TypeScript 支持**：完整的类型定义，开发体验好
5. **易于扩展**：用户可以快速实现自定义适配器