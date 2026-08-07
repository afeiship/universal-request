# Core + Fetch Adapter 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `@jswork/universal-request-core` 核心包和 `@jswork/universal-request-adapter-fetch` 适配器包

**Architecture:** Core + Adapter 双层架构，core 提供拦截器、配置管理、错误处理，adapter 提供平台特定网络实现

**Tech Stack:** TypeScript, @jswork/pipe, fetch API

---

## 文件结构

```
packages/
├── core/                           # @jswork/universal-request-core
│   ├── src/
│   │   ├── types.ts               # 类型定义
│   │   ├── errors.ts              # 错误类
│   │   ├── interceptor-manager.ts # 拦截器管理器
│   │   ├── with-timeout-abort.ts  # 超时+取消模块
│   │   ├── base-adapter.ts        # 适配器基类
│   │   ├── request-core.ts        # 核心请求类
│   │   └── index.ts               # 统一导出
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
└── adapters/
    └── fetch/                      # @jswork/universal-request-adapter-fetch
        ├── src/
        │   ├── fetch-adapter.ts    # Fetch 适配器
        │   └── index.ts            # 导出
        ├── package.json
        ├── tsconfig.json
        └── README.md
```

---

## Task 1: 创建 core 包基础结构

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/README.md`

- [ ] **Step 1: 创建 core 包目录**

```bash
mkdir -p packages/core/src
```

- [ ] **Step 2: 创建 core/package.json**

```json
{
  "name": "@jswork/universal-request-core",
  "version": "1.0.0",
  "description": "Universal request core with adapter pattern",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@jswork/pipe": "^1.1.2"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "keywords": ["request", "http", "adapter", "fetch", "axios"],
  "author": "afeiship",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/afeiship/universal-request"
  }
}
```

- [ ] **Step 3: 创建 core/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: 创建 core/README.md**

```markdown
# @jswork/universal-request-core

Universal request core with adapter pattern.

## Installation

\`\`\`bash
pnpm add @jswork/universal-request-core
\`\`\`

## Usage

\`\`\`typescript
import { createRequest } from '@jswork/universal-request-core';

const request = createRequest({
  adapter: yourAdapter,
  baseURL: 'https://api.example.com'
});
\`\`\`

## License

MIT
```

- [ ] **Step 5: 提交 core 包基础结构**

```bash
git add packages/core
git commit -m "feat(core): add core package structure"
```

---

## Task 2: 实现 types.ts - 类型定义

**Files:**
- Create: `packages/core/src/types.ts`

- [ ] **Step 1: 创建 types.ts 文件**

```typescript
/**
 * HTTP 方法枚举
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 响应数据类型
 */
export type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';

/**
 * 数据类型（用于序列化）
 */
export type DataType = 'json' | 'urlencoded' | 'multipart' | 'text' | 'blob' | 'auto';

/**
 * 请求配置接口
 */
export interface RequestConfig {
  // 基础配置
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
  withCredentials?: boolean;

  // 老版本特性
  slim?: boolean;
  resolveAble?: boolean;

  // 扩展字段
  [key: string]: any;
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
  dataType?: DataType;
}
```

- [ ] **Step 2: 提交 types.ts**

```bash
git add packages/core/src/types.ts
git commit -m "feat(core): add type definitions"
```

---

## Task 3: 实现 errors.ts - 错误类

**Files:**
- Create: `packages/core/src/errors.ts`

- [ ] **Step 1: 创建 errors.ts 文件**

```typescript
import type { RequestConfig, Response } from './types';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  ABORT_ERROR = 'ABORT_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  TRANSFORM_ERROR = 'TRANSFORM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
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

- [ ] **Step 2: 提交 errors.ts**

```bash
git add packages/core/src/errors.ts
git commit -m "feat(core): add RequestError class"
```

---

## Task 4: 实现 interceptor-manager.ts - 拦截器管理器

**Files:**
- Create: `packages/core/src/interceptor-manager.ts`

- [ ] **Step 1: 创建 interceptor-manager.ts 文件**

```typescript
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
```

- [ ] **Step 2: 提交 interceptor-manager.ts**

```bash
git add packages/core/src/interceptor-manager.ts
git commit -m "feat(core): add InterceptorManager with pipe"
```

---

## Task 5: 实现 with-timeout-abort.ts - 超时取消模块

**Files:**
- Create: `packages/core/src/with-timeout-abort.ts`

- [ ] **Step 1: 创建 with-timeout-abort.ts 文件**

```typescript
import { RequestError, ErrorType } from './errors';
import type { RequestConfig, Response } from './types';

/**
 * 包装请求：添加超时和取消功能
 */
export function withTimeoutAbort(
  promise: Promise<Response>,
  config: RequestConfig
): Promise<Response> {
  const promises: Promise<Response>[] = [promise];

  // 超时处理
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

  // 取消处理
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

- [ ] **Step 2: 提交 with-timeout-abort.ts**

```bash
git add packages/core/src/with-timeout-abort.ts
git commit -m "feat(core): add timeout and abort module"
```

---

## Task 6: 实现 base-adapter.ts - 适配器基类

**Files:**
- Create: `packages/core/src/base-adapter.ts`

- [ ] **Step 1: 创建 base-adapter.ts 文件**

```typescript
import type { Adapter, RequestConfig, Response } from './types';
import { withTimeoutAbort } from './with-timeout-abort';

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

- [ ] **Step 2: 提交 base-adapter.ts**

```bash
git add packages/core/src/base-adapter.ts
git commit -m "feat(core): add BaseAdapter with serialize and buildURL"
```

---

## Task 7: 实现 request-core.ts - 核心请求类

**Files:**
- Create: `packages/core/src/request-core.ts`

- [ ] **Step 1: 创建 request-core.ts 文件**

```typescript
import type { RequestConfig, RequestCoreConfig, Response } from './types';
import { InterceptorManager } from './interceptor-manager';
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
      timeout: 0,
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
```

- [ ] **Step 2: 提交 request-core.ts**

```bash
git add packages/core/src/request-core.ts
git commit -m "feat(core): add RequestCore class with interceptors"
```

---

## Task 8: 创建 core/index.ts - 统一导出

**Files:**
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: 创建 index.ts 文件**

```typescript
// Types
export type { HttpMethod, ResponseType, DataType, RequestConfig, Response, Interceptor, Adapter, RequestCoreConfig } from './types';

// Errors
export { ErrorType, RequestError } from './errors';

// Interceptor Manager
export { InterceptorManager } from './interceptor-manager';

// Base Adapter
export { BaseAdapter } from './base-adapter';

// Request Core
export { RequestCore, createRequest } from './request-core';

// Utility functions
export { withTimeoutAbort } from './with-timeout-abort';
```

- [ ] **Step 2: 提交 index.ts**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): add index.ts exports"
```

---

## Task 9: 创建 adapter-fetch 包基础结构

**Files:**
- Create: `packages/adapters/fetch/package.json`
- Create: `packages/adapters/fetch/tsconfig.json`
- Create: `packages/adapters/fetch/README.md`

- [ ] **Step 1: 创建 fetch adapter 目录**

```bash
mkdir -p packages/adapters/fetch/src
```

- [ ] **Step 2: 创建 adapter-fetch/package.json**

```json
{
  "name": "@jswork/universal-request-adapter-fetch",
  "version": "1.0.0",
  "description": "Fetch adapter for universal-request",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "peerDependencies": {
    "@jswork/universal-request-core": "^1.0.0"
  },
  "devDependencies": {
    "@jswork/universal-request-core": "^1.0.0",
    "typescript": "^5.0.0"
  },
  "keywords": ["request", "fetch", "adapter", "http"],
  "author": "afeiship",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/afeiship/universal-request"
  }
}
```

- [ ] **Step 3: 创建 adapter-fetch/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: 创建 adapter-fetch/README.md**

```markdown
# @jswork/universal-request-adapter-fetch

Fetch adapter for universal-request.

## Installation

\`\`\`bash
pnpm add @jswork/universal-request-adapter-fetch @jswork/universal-request-core
\`\`\`

## Usage

\`\`\`typescript
import { createRequest } from '@jswork/universal-request-core';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';

const request = createRequest({
  adapter: new FetchAdapter(),
  baseURL: 'https://api.example.com'
});
\`\`\`

## License

MIT
```

- [ ] **Step 5: 提交 fetch adapter 基础结构**

```bash
git add packages/adapters/fetch
git commit -m "feat(adapter-fetch): add package structure"
```

---

## Task 10: 实现 fetch-adapter.ts - Fetch 适配器

**Files:**
- Create: `packages/adapters/fetch/src/fetch-adapter.ts`

- [ ] **Step 1: 创建 fetch-adapter.ts 文件**

```typescript
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
```

- [ ] **Step 2: 提交 fetch-adapter.ts**

```bash
git add packages/adapters/fetch/src/fetch-adapter.ts
git commit -m "feat(adapter-fetch): implement FetchAdapter"
```

---

## Task 11: 创建 adapter-fetch/index.ts - 导出

**Files:**
- Create: `packages/adapters/fetch/src/index.ts`

- [ ] **Step 1: 创建 index.ts 文件**

```typescript
export { FetchAdapter } from './fetch-adapter';
```

- [ ] **Step 2: 提交 index.ts**

```bash
git add packages/adapters/fetch/src/index.ts
git commit -m "feat(adapter-fetch): add index.ts exports"
```

---

## Task 12: 安装依赖并构建测试

**Files:**
- 无文件修改

- [ ] **Step 1: 在项目根目录安装依赖**

```bash
cd /Users/afei/github/universal-request
pnpm install
```

- [ ] **Step 2: 构建 core 包**

```bash
cd packages/core
pnpm run build
```

- [ ] **Step 3: 构建 adapter-fetch 包**

```bash
cd ../adapters/fetch
pnpm run build
```

- [ ] **Step 4: 验证构建产物**

```bash
ls packages/core/dist
ls packages/adapters/fetch/dist
```

- [ ] **Step 5: 提交构建配置**

```bash
git add .
git commit -m "chore: install dependencies and build packages"
```

---

## Task 13: 创建简单测试验证功能

**Files:**
- Create: `packages/core/test/basic.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
// packages/core/test/basic.test.ts
import { createRequest, RequestError, ErrorType } from '../src';
import { FetchAdapter } from '../../adapters/fetch/src';

describe('RequestCore Basic', () => {
  test('should create request instance', () => {
    const request = createRequest({
      adapter: new FetchAdapter()
    });
    expect(request).toBeDefined();
    expect(request.get).toBeInstanceOf(Function);
    expect(request.post).toBeInstanceOf(Function);
  });

  test('should merge config correctly', () => {
    const request = createRequest({
      adapter: new FetchAdapter(),
      baseURL: 'https://api.example.com',
      timeout: 5000
    });

    // 这里只验证实例创建成功，实际网络请求需要 mock
    expect(request).toBeDefined();
  });

  test('should add request interceptor', () => {
    const request = createRequest({
      adapter: new FetchAdapter()
    });

    const id = request.interceptors.request.use((config) => {
      config.headers.Authorization = 'Bearer token';
      return config;
    });

    expect(id).toBe(0);
  });

  test('should add response interceptor', () => {
    const request = createRequest({
      adapter: new FetchAdapter()
    });

    const id = request.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error)
    );

    expect(id).toBe(0);
  });

  test('should eject interceptor', () => {
    const request = createRequest({
      adapter: new FetchAdapter()
    });

    const id = request.interceptors.request.use((config) => config);
    request.interceptors.request.eject(id);

    // 应该没有报错
    expect(true).toBe(true);
  });
});

describe('RequestError', () => {
  test('should create RequestError with correct type', () => {
    const config = { url: 'https://example.com' } as any;
    const error = new RequestError('Test error', ErrorType.NETWORK_ERROR, config);

    expect(error.message).toBe('Test error');
    expect(error.type).toBe(ErrorType.NETWORK_ERROR);
    expect(error.isNetworkError()).toBe(true);
    expect(error.isTimeoutError()).toBe(false);
  });
});
```

- [ ] **Step 2: 提交测试文件**

```bash
git add packages/core/test
git commit -m "test(core): add basic unit tests"
```

---

## Task 14: 创建使用示例文档

**Files:**
- Create: `examples/basic-usage.ts`

- [ ] **Step 1: 创建示例文件**

```typescript
/**
 * 基础使用示例
 */

import { createRequest } from '@jswork/universal-request-core';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';

// 创建请求实例
const request = createRequest({
  adapter: new FetchAdapter(),
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 5000
});

// 添加请求拦截器
request.interceptors.request.use((config) => {
  console.log('Request:', config.url);
  config.headers['X-Custom-Header'] = 'custom-value';
  return config;
});

// 添加响应拦截器
request.interceptors.response.use(
  (response) => {
    console.log('Response:', response.status);
    return response;
  },
  (error) => {
    console.error('Error:', error.message);
    return Promise.reject(error);
  }
);

// 示例函数
async function example() {
  try {
    // GET 请求
    const users = await request.get('/users');
    console.log('Users:', users.data);

    // POST 请求
    const newUser = await request.post('/users', {
      name: 'Test User',
      email: 'test@example.com'
    });
    console.log('New User:', newUser.data);

    // slim 响应
    const { status, data } = await request.get('/users/1', null, { slim: true });
    console.log('Slim response:', status, data);

  } catch (error: any) {
    if (error.isTimeoutError?.()) {
      console.error('请求超时');
    } else if (error.isNetworkError?.()) {
      console.error('网络错误');
    } else {
      console.error('其他错误:', error.message);
    }
  }
}

// 运行示例
// example();
```

- [ ] **Step 2: 提交示例文件**

```bash
git add examples
git commit -m "docs: add basic usage example"
```

---

## Task 15: 更新主 README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 更新 README.md**

```markdown
# Universal Request

跨平台请求库，基于适配器模式，支持 Web、微信小程序、React Native 等多端环境。

## 特性

- 🎯 **统一 API** - 一套代码，多端运行
- 🔌 **适配器模式** - 灵活切换底层实现
- 🔄 **拦截器机制** - 基于 @jswork/pipe
- ⏱️ **超时控制** - 内置超时处理
- 🚫 **请求取消** - AbortController 支持
- 📦 **TypeScript** - 完整类型支持
- 🎨 **多种数据格式** - json/urlencoded/multipart

## 安装

```bash
pnpm add @jswork/universal-request-core @jswork/universal-request-adapter-fetch
```

## 快速开始

```typescript
import { createRequest } from '@jswork/universal-request-core';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';

const request = createRequest({
  adapter: new FetchAdapter(),
  baseURL: 'https://api.example.com'
});

// GET 请求
const response = await request.get('/users');

// POST 请求
await request.post('/users', { name: 'test' });
```

## 文档

- [需求文档](./docs/01-requirements.md)
- [老版本分析](./docs/02-old-version-analysis.md)
- [设计文档](./docs/superpowers/specs/2026-08-07-core-fetch-design.md)

## License

MIT
```

- [ ] **Step 2: 提交 README 更新**

```bash
git add README.md
git commit -m "docs: update main README"
```

---

## Task 16: 最终验证和清理

**Files:**
- 无文件修改

- [ ] **Step 1: 运行完整构建**

```bash
cd /Users/afei/github/universal-request
pnpm run build:all
```

- [ ] **Step 2: 验证包结构**

```bash
ls -R packages/core/dist
ls -R packages/adapters/fetch/dist
```

- [ ] **Step 3: 确认所有文件已提交**

```bash
git status
```

- [ ] **Step 4: 最终提交**

```bash
git add .
git commit -m "chore: final verification and cleanup"
```

---

## 实施要点

1. **TDD 原则**：每个模块先写测试（如果有），再实现
2. **频繁提交**：每个小功能点提交一次
3. **类型安全**：确保所有类型定义正确
4. **文档同步**：代码和文档保持一致
5. **构建验证**：每完成一个包就构建验证

## 后续任务

完成 core 和 fetch adapter 后，后续可以：
1. 添加更完善的单元测试
2. 实现 axios adapter
3. 实现 mp-wx adapter (微信小程序)
4. 添加更多内置功能模块 (retry, cache, throttle)
