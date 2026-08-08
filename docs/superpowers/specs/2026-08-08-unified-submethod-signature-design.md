# 统一子方法签名设计

## 背景

`RequestCore` 类的子方法 `get`/`post`/`put`/`delete`/`patch` 签名不统一：

| 方法 | 当前签名 | 参数数 |
|---|---|---|
| `get` | `(url, params?, config?)` | 3 |
| `post` | `(url, data?, config?)` | 3 |
| `put` | `(url, data?, config?)` | 3 |
| `delete` | `(url, config?)` | 2 |
| `patch` | `(url, data?, config?)` | 3 |

目标：统一为 `(url, payload?, config?)`，不兼容旧签名。

## 设计

### 统一签名

```ts
// 所有方法完全一致，三个参数
get<T = any>(url: string, payload?: any, config?: RequestConfig): Promise<Response<T>>
post<T = any>(url: string, payload?: any, config?: RequestConfig): Promise<Response<T>>
put<T = any>(url: string, payload?: any, config?: RequestConfig): Promise<Response<T>>
delete<T = any>(url: string, payload?: any, config?: RequestConfig): Promise<Response<T>>
patch<T = any>(url: string, payload?: any, config?: RequestConfig): Promise<Response<T>>
```

### 三个参数的意义

| 参数 | 说明 |
|---|---|
| `url` | 请求地址，需要 query string 时直接拼入 URL |
| `payload` | 请求数据，method 决定路由方式（query / body） |
| `config` | 其他配置：`headers`、`timeout`、`signal`、`responseType`、`dataType` 等 |

### RequestConfig 变化

| 字段 | 状态 | 说明 |
|---|---|---|
| `data` | 移除 | 被 `payload` 参数替代 |
| `params` | 移除 | 用户自行拼入 URL |
| `payload` | 移除 | 从 config 中移除，改为独立参数 |

### payload 路由规则

| HTTP Method | payload 处理方式 |
|---|---|
| GET / HEAD / DELETE | → 序列化为 query string 拼入 URL |
| POST / PUT / PATCH | → 序列化为请求 body |

### 常见场景

```ts
// GET → payload 自动变 query
get('/users', { page: 1, size: 10 })
// 结果: GET /users?page=1&size=10

// GET 无参数
get('/users')
// 结果: GET /users

// POST → payload 自动变 body
post('/users', { name: 'foo', email: 'bar@baz.com' })
// 结果: POST /users, body: {"name":"foo","email":"bar@baz.com"}

// 混合场景（query + body），用户自行拼 URL
post('/users?page=1', { name: 'foo' })
// 结果: POST /users?page=1, body: {"name":"foo"}

// 带其他配置
get('/users', { page: 1 }, { headers: { 'X-Auth': 'abc' }, timeout: 5000 })

// 无 payload，只有 config
get('/users', undefined, { headers: { 'X-Auth': 'abc' } })
delete('/users/1')
```

### 内部实现

子方法将 payload 透传到 `request()` 的 config 中：

```ts
async get<T>(url: string, payload?: any, config?: RequestConfig): Promise<Response<T>> {
  return this.request<T>({ ...config, url, method: 'GET', payload });
}
```

`BaseAdapter.buildURL` 对 GET/HEAD/DELETE 方法将 `config.payload` 序列化为 query string 拼入 URL。

`BaseAdapter.serializeData` 对 POST/PUT/PATCH 方法将 `config.payload` 序列化为请求 body。

### 改动的文件

| 文件 | 改动内容 |
|---|---|
| `core/src/types.ts` | `RequestConfig` 移除 `data`、`params`，新增 `payload` |
| `core/src/base-adapter.ts:buildURL` | GET 时从 `config.payload` 拼 query string |
| `core/src/base-adapter.ts:serializeData` | 非 GET 时从 `config.payload` 序列化 body |
| `core/src/request-core.ts` | 子方法签名统一为 `(url, payload?, config?)` |
| `core/test/basic.test.ts` | 更新所有调用为新签名 |
| `adapters/axios/src/axios-adapter.ts` | `config.data` → `config.payload` |
| `adapters/fetch/src/fetch-adapter.ts` | `config.data` → `config.payload` |
| `apps/react-playground/src/**` | 更新调用方式 |

### 不变部分

- `Response` 接口（响应 `data` 字段名不动）
- 拦截器接口
- 适配器接口
- `BaseAdapter` 抽象方法签名

## 边界情况

- `payload` 为 `undefined`/`null`：不处理，与当前无 `data` 行为一致
- URL 已有 query string 且 payload 也有数据：payload 序列化后追加到现有 query string 后
- 批量上传 / `FormData`：`payload` 传 `FormData` 对象，`dataType: 'multipart'` 或 `'auto'`