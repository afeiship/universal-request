# @jswork/universal-request-adapter-mp-uniapp

Uniapp(微信小程序) adapter for universal-request, based on `uni.request`.

## Installation

```bash
pnpm add @jswork/universal-request-adapter-mp-uniapp @jswork/universal-request-core
```

## Usage

```typescript
import { createRequest } from '@jswork/universal-request-core';
import { MpUniappAdapter } from '@jswork/universal-request-adapter-mp-uniapp';

const request = createRequest({
  adapter: new MpUniappAdapter(),
  baseURL: 'https://api.example.com'
});

const response = await request.get('/users', { page: 1 });
await request.post('/users', { name: 'test' }, { timeout: 5000 });
```

## Notes

- 基于 `uni.request`，适用于 uni-app 编译到微信小程序（mp-weixin）等小程序端。
- `timeout` 走 `uni.request` 原生超时（真正中断请求），core 层超时做兜底。
- `signal` 取消通过 `RequestTask.abort()` 真正中断网络请求。
- `responseType` 仅 `json`（默认）/`text`/`arrayBuffer` 有效，`blob`/`formData` 小程序端不支持。
- HTTP 状态码 4xx/5xx 不会 reject（与 fetch 适配器一致），可在响应拦截器中统一处理。

## License

MIT
