# 拦截器统一化设计

日期：2026-08-08
状态：已批准

## 背景

当前 `@jswork/universal-request-core` 的拦截器使用 `axios` 风格：`request.interceptors.request.use(...)` 与 `request.interceptors.response.use(...)` 分属两个独立的管理器，且注册时传入分离的 `fulfilled` / `rejected` 回调。

用户（包作者）希望：
1. 常用拦截器可以独立打成 npm 包复用。
2. 不再使用当前 `.request.use()` / `.response.use()` 分离的注册方式。
3. request / response（及 error）统一成一种拦截器对象。
4. 初始化时可以通过配置预置一部分拦截器。

## 目标

- 引入统一的 `Interceptor` 拦截器对象，一个对象覆盖 request / response / error 三个阶段。
- 提供单一的 `InterceptorManager`，用统一的 `use()` 注册。
- 支持在 `createRequest` 配置中通过 `interceptors` 数组预置。
- 拦截器对象必须有唯一 `id`，可选 `tags` 元数据（由用户自行处理内部逻辑，框架不做自动匹配）。

## 非目标

- 不实现 tags 的自动匹配/过滤逻辑 —— tags 仅作为元数据，用户自行根据需求查询或过滤。
- 不在此设计中实现任何具体拦截器包的内容（auth / logger / retry 等），仅定义接口与机制。

## 接口定义

### 拦截器对象

```ts
interface Interceptor {
  id: string;                                          // 必需，唯一标识符
  tags?: string[];                                     // 可选，元数据标记，用户自行处理
  request?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  response?: (res: Response<any>) => Response<any> | Promise<Response<any>>;
  error?: (err: any) => any;                           // 统一错误处理
}
```

- `request`、`response`、`error` 均为可选，可单独实现或同时实现。
- `id` 用于 `eject` / `get` 等操作，必须唯一。

### 统一的拦截器管理器

```ts
class InterceptorManager {
  use(interceptor: Interceptor): void;
  eject(id: string): boolean;
  clear(): void;
  get(id: string): Interceptor | undefined;
  getAll(): Interceptor[];

  // 内部执行
  executeRequest(value: RequestConfig): Promise<RequestConfig>;
  executeResponse(value: Response): Promise<Response>;
  executeError(error: any): Promise<any>;
}
```

### 配置预置

```ts
interface RequestCoreConfig {
  adapter: Adapter;
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  dataType?: DataType;
  interceptors?: Interceptor[];   // 新增：初始化时预置
}
```

## 执行流程

```
request(config)
  │
  ├─ mergeConfig(config)
  ├─ interceptors.executeRequest(config)   ← 按注册顺序依次执行每个 interceptor.request
  ├─ adapter.request(config)               ← 发请求
  ├─ interceptors.executeResponse(res)     ← 按注册顺序依次执行每个 interceptor.response
  └─ return res
       │
       └─ 出错时 → interceptors.executeError(err)   ← 反向执行 error 处理
```

- request 阶段：按注册顺序（先注册先执行）执行每个拦截器的 `request`。
- response 阶段：按注册顺序执行每个拦截器的 `response`。
- error 阶段：出错时反向（后注册先执行）执行 `error` 处理。

## 使用示例

### 定义可复用的拦截器（npm 包）

```ts
// @jswork/universal-request-interceptor-auth
export const authInterceptor: Interceptor = {
  id: 'auth',
  tags: ['auth', 'security'],
  request: (config) => {
    config.headers = { ...config.headers, Authorization: 'Bearer xxx' };
    return config;
  },
  error: (err) => {
    if (err.status === 401) { /* redirect to login */ }
    throw err;
  }
};
```

### 初始化时预置

```ts
const request = createRequest({
  adapter: new FetchAdapter(),
  baseURL: 'https://api.example.com',
  interceptors: [
    authInterceptor,
    loggerInterceptor,
    retryInterceptor
  ]
});
```

### 运行时动态添加 / 移除

```ts
request.interceptors.use({
  id: 'custom-header',
  request: (config) => ({ ...config, headers: { ...config.headers, 'X-Custom': 'foo' } })
});

request.interceptors.eject('auth');
```

### 按 tags 查询（用户自行处理）

```ts
const authInterceptors = request.interceptors
  .getAll()
  .filter(i => i.tags?.includes('auth'));
```

## 向后兼容 / 迁移

本设计为 breaking change。

- `@jswork/universal-request-core` 发 major 版本（2.0）。
- 拦截器作为独立包发布时遵循 `@jswork/universal-request-interceptor-*` 命名规范。

## 测试要点

- 拦截器按注册顺序执行 request。
- 拦截器按注册顺序执行 response。
- 出错时按反向顺序执行 error。
- `use` / `eject` / `clear` / `get` / `getAll` 行为正确。
- 配置中预置的拦截器在首个请求前已生效。
- 无 request / response 阶段的拦截器在对应阶段被跳过。