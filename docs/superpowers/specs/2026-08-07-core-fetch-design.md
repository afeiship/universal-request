# Core + Fetch Adapter 设计文档

日期：2026-08-07
范围：先实现 `@universal-request/core` 和 `@universal-request/adapter-fetch` 两个包

---

## 1. 核心决策

| 决策项 | 结论 |
|--------|------|
| slim / resolveAble | 作为 RequestConfig 内置配置项 |
| 单例模式 | 只保留构造函数，不提供 getInstance/getSingleton |
| dataType | core 内置，自实现，不依赖 @jswork/next-* |
| 拦截器机制 | 基于 @jswork/pipe |
| 实现范围 | core + adapter-fetch |

---

## 2. 包结构

```
packages/
├── core/                                # @jswork/universal-request-core
│   ├── src/
│   │   ├── types.ts                    # 所有类型定义
│   │   ├── errors.ts                   # RequestError + ErrorType
│   │   ├── interceptor-manager.ts      # 拦截器管理器
│   │   ├── with-timeout-abort.ts       # 超时+取消模块
│   │   ├── base-adapter.ts             # 抽象基类
│   │   ├── request-core.ts             # 核心请求类
│   │   └── index.ts                    # 统一导出
│   ├── package.json
│   └── tsconfig.json
│
└── adapters/
    └── fetch/                           # @jswork/universal-request-adapter-fetch
        ├── src/
        │   ├── fetch-adapter.ts        # Fetch 适配器实现
        │   └── index.ts                # 导出
        └── package.json
```

---

## 3. 数据流

```
用户调用 request.get(url, data, config)
  │
  ▼
RequestCore.request()
  1. 合并配置 (实例默认 + 请求级)
  2. 请求拦截器链 (pipe.async)
  3. adapter.request(config)
     ├── buildURL()           — 拼接 baseURL + params
     ├── serializeData()      — 根据 dataType 序列化
     ├── withTimeoutAbort()   — 超时/取消竞速包装
     └── 平台网络调用         — fetch
  4. 响应拦截器链 (pipe.async)
  5. slim 处理 / resolveAble 处理
  │
  ▼
返回 Response<T>
```

---

## 4. 模块设计

### 4.1 types.ts

所有类型定义，无运行时依赖。

```typescript
// HTTP 方法
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

// 响应类型
export type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';

// 数据类型（用于序列化）
export type DataType = 'json' | 'urlencoded' | 'multipart' | 'text' | 'blob' | 'auto';

// 请求配置
export interface RequestConfig {
  url: string;
  method?: HttpMethod;
  baseURL?: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  
  // 功能配置
  timeout?: number;
  responseType?: ResponseType;
  dataType?: DataType;
  signal?: AbortSignal;
  
  // 老版本特性
  slim?: boolean;
  resolveAble?: boolean;
  
  // 扩展字段
  [key: string]: any;
}

// 响应
export interface Response<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
}

// 拦截器
export interface Interceptor<V, R = V> {
  fulfilled?: (value: V) => R | Promise<R>;
  rejected?: (error: any) => any;
}

// 适配器接口
export interface Adapter {
  request(config: RequestConfig): Promise<Response>;
}

// RequestCore 配置
export interface RequestCoreConfig {
  adapter: Adapter;
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  dataType?: DataType;
}
```

### 4.2 errors.ts

统一错误类型。

```typescript
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  ABORT_ERROR = 'ABORT_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  TRANSFORM_ERROR = 'TRANSFORM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

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

  isNetworkError(): boolean { return this.type === ErrorType.NETWORK_ERROR; }
  isTimeoutError(): boolean { return this.type === ErrorType.TIMEOUT_ERROR; }
  isAbortError(): boolean { return this.type === ErrorType.ABORT_ERROR; }
  isHttpError(): boolean { return this.type === ErrorType.HTTP_ERROR; }
}
```

### 4.3 interceptor-manager.ts

基于 `@jswork/pipe` 的拦截器管理器。

```typescript
import pipe from '@jswork/pipe';
import type { Interceptor } from './types';

export class InterceptorManager<V, R = V> {
  private interceptors: Array<{ id: number; interceptor: Interceptor<V, R> }> = [];
  private idCounter = 0;

  use(fulfilled?: (value: V) => R | Promise<R>, rejected?: (error: any) => any): number {
    const id = this.idCounter++;
    this.interceptors.push({ id, interceptor: { fulfilled, rejected } });
    return id;
  }

  eject(id: number): void {
    const index = this.interceptors.findIndex(item => item.id === id);
    if (index !== -1) this.interceptors.splice(index, 1);
  }

  clear(): void {
    this.interceptors = [];
  }

  async execute(value: V): Promise<R> {
    const fns = this.interceptors
      .map(item => item.interceptor.fulfilled)
      .filter(Boolean) as Array<(value: any) => any>;
    const pipeline = pipe.async(...fns);
    return await pipeline(value);
  }

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
```

### 4.4 with-timeout-abort.ts

独立的超时+取消模块，后续可扩展其他功能模块。

```typescript
import { RequestError, ErrorType } from './errors';
import type { RequestConfig, Response } from './types';

export function withTimeoutAbort(
  promise: Promise<Response>,
  config: RequestConfig
): Promise<Response> {
  const promises: Promise<Response>[] = [promise];

  // 超时
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

  // 取消
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
```

### 4.5 base-adapter.ts

抽象基类，提供通用工具方法供子类使用。

```typescript
import type { Adapter, RequestConfig, Response, DataType } from './types';
import { withTimeoutAbort } from './with-timeout-abort';

export abstract class BaseAdapter implements Adapter {
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
        result.body = JSON.stringify(data);
        result.headers['Content-Type'] = 'application/json;charset=utf-8';
        break;
      
      case 'urlencoded':
        result.body = new URLSearchParams(data).toString();
        result.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        break;
      
      case 'multipart':
        const fd = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          fd.append(key, value as any);
        });
        result.body = fd;
        // 不设置 Content-Type，让浏览器自动设置 boundary
        break;
      
      case 'text':
        result.body = String(data);
        result.headers['Content-Type'] = 'text/plain';
        break;
      
      case 'blob':
        result.body = data;
        break;
      
      case 'auto':
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
          result.body = JSON.stringify(data);
          result.headers['Content-Type'] = 'application/json;charset=utf-8';
        }
        break;
      
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
```

### 4.6 request-core.ts

核心请求类，处理拦截器链、配置合并、slim/resolveAble。

```typescript
import type { RequestConfig, RequestCoreConfig, Response } from './types';
import { InterceptorManager } from './interceptor-manager';
import { RequestError, ErrorType } from './errors';

export class RequestCore {
  private defaultConfig: RequestCoreConfig;
  private requestInterceptors: InterceptorManager<RequestConfig, RequestConfig>;
  private responseInterceptors: InterceptorManager<Response, Response>;

  constructor(config: RequestCoreConfig) {
    this.defaultConfig = {
      timeout: 0,
      headers: {},
      ...config
    };
    this.requestInterceptors = new InterceptorManager();
    this.responseInterceptors = new InterceptorManager();
  }

  interceptors = {
    request: this.requestInterceptors,
    response: this.responseInterceptors
  };

  async request<T = any>(config: RequestConfig): Promise<Response<T>> {
    try {
      // 1. 合并配置
      const mergedConfig = this.mergeConfig(config);

      // 2. 请求拦截器
      const processedConfig = await this.requestInterceptors.execute(mergedConfig);

      // 3. 通过适配器发送请求
      const response = await this.defaultConfig.adapter.request(processedConfig);

      // 4. 响应拦截器
      const processedResponse = await this.responseInterceptors.execute(response);

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

      // 响应拦截器的错误处理
      try {
        return await this.responseInterceptors.handleError(requestError);
      } catch (err) {
        throw err;
      }
    }
  }

  async get<T = any>(url: string, params?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'params'>): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'GET', params });
  }

  async post<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'POST', data });
  }

  async put<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', data });
  }

  async delete<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  async patch<T = any>(url: string, data?: any, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', data });
  }

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

  private normalizeError(error: any, config: RequestConfig): RequestError {
    if (error instanceof RequestError) return error;

    if (error.name === 'AbortError' || error.type === 'abort') {
      return new RequestError('Request aborted', ErrorType.ABORT_ERROR, config);
    }

    if (error.message?.toLowerCase().includes('timeout')) {
      return new RequestError(error.message, ErrorType.TIMEOUT_ERROR, config);
    }

    if (error.response) {
      return new RequestError(
        error.message,
        ErrorType.HTTP_ERROR,
        config,
        error.response
      );
    }

    return new RequestError(
      error.message || 'Network Error',
      ErrorType.NETWORK_ERROR,
      config
    );
  }
}

export function createRequest(config: RequestCoreConfig): RequestCore {
  return new RequestCore(config);
}
```

### 4.7 fetch-adapter.ts

Web fetch 适配器实现。

```typescript
import { BaseAdapter } from '@jswork/universal-request-core';
import type { RequestConfig, Response } from '@jswork/universal-request-core';

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

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}
```

---

## 5. 使用示例

```typescript
import { createRequest } from '@jswork/universal-request-core';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';

const request = createRequest({
  adapter: new FetchAdapter(),
  baseURL: 'https://api.example.com',
  timeout: 5000
});

// 添加请求拦截器
request.interceptors.request.use((config) => {
  config.headers.Authorization = 'Bearer token';
  return config;
});

// 添加响应拦截器
request.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(error.message);
    return Promise.reject(error);
  }
);

// GET 请求
const response = await request.get('/users', { page: 1 });

// POST 请求（json）
await request.post('/users', { name: 'test' });

// POST 请求（multipart）
await request.post('/upload', formData, { dataType: 'multipart' });

// slim 响应
const { status, data } = await request.get('/users', null, { slim: true });

// resolveAble
const result = await request.get('/users', null, { resolveAble: true });
```

---

## 6. 后续扩展方向

### 6.1 内置功能模块扩展

```
core/src/
├── with-timeout-abort.ts    ✅ 已实现
├── with-retry.ts            📋 待实现
├── with-cache.ts            📋 待实现
└── with-throttle.ts         📋 待实现
```

### 6.2 其他适配器

```
packages/adapters/
├── fetch/       ✅ 本 spec        # @jswork/universal-request-adapter-fetch
├── axios/       📋 待实现         # @jswork/universal-request-adapter-axios
└── mp-wx/       📋 待实现         # @jswork/universal-request-adapter-mp-wx
```

---

## 7. 测试要点

1. **类型安全**：所有泛型正确传递
2. **拦截器链**：顺序执行、错误传递
3. **超时/取消**：竞速正确、错误类型正确
4. **dataType**：各种类型序列化正确
5. **slim/resolveAble**：返回结构符合预期
6. **FetchAdapter**：GET/POST/文件上传等场景
