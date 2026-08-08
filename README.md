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

// GET 请求（payload 自动作为 query string）
const response = await request.get('/users', { page: 1, size: 10 });
// 实际请求: GET /users?page=1&size=10

// POST 请求（payload 自动作为请求体）
await request.post('/users', { name: 'test' });
// 实际请求: POST /users, body: {"name":"test"}

// 带其他配置
await request.get('/users', { page: 1 }, {
  headers: { 'X-Auth': 'token' },
  timeout: 5000
});
```

### 统一签名

所有子方法（`get`/`post`/`put`/`delete`/`patch`）签名一致，均为 `(url, payload?, config?)`：

| 方法 | payload 处理方式 |
|---|---|
| GET / HEAD / DELETE | 序列化为 query string 拼入 URL |
| POST / PUT / PATCH | 序列化为请求 body |

需要同时传 query 和 body 时，直接在 URL 中拼接 query string：

```typescript
await request.post('/users?page=1', { name: 'test' });
```

## 文档

- [需求文档](./docs/01-requirements.md)
- [老版本分析](./docs/02-old-version-analysis.md)
- [设计文档](./docs/superpowers/specs/2026-08-07-core-fetch-design.md)

## License

MIT
