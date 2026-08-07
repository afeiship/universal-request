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
