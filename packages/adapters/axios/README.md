# @jswork/universal-request-adapter-axios

Axios adapter for universal-request. 将 axios 作为底层请求库，复用其拦截器、取消、超时等能力。

## Installation

```bash
pnpm add @jswork/universal-request-adapter-axios
```

## Usage

```typescript
import { createRequest } from '@jswork/universal-request-core';
import { AxiosAdapter } from '@jswork/universal-request-adapter-axios';

const request = createRequest({
  adapter: new AxiosAdapter(),
  baseURL: 'https://api.example.com'
});
```

## 使用自定义 axios 实例

```typescript
import axios from 'axios';
import { AxiosAdapter } from '@jswork/universal-request-adapter-axios';

// 创建自定义 axios 实例
const myAxios = axios.create({
  timeout: 10000,
  headers: { 'X-Custom': 'foo' }
});

// 给 axios 实例加拦截器
myAxios.interceptors.request.use((config) => {
  console.log('axios request:', config.url);
  return config;
});

const request = createRequest({
  adapter: new AxiosAdapter(myAxios),
  baseURL: 'https://api.example.com'
});

// 也可以直接获取底层 axios 实例
const adapter = new AxiosAdapter();
adapter.axiosInstance.interceptors.request.use(/* ... */);
```

## License

MIT