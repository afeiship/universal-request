# @jswork/universal-request-interceptor-logger

Logger interceptor for universal-request.

## Installation

```bash
pnpm add @jswork/universal-request-interceptor-logger
```

## Usage

```ts
import { createRequest } from '@jswork/universal-request-core';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import { createLoggerInterceptor } from '@jswork/universal-request-interceptor-logger';

const request = createRequest({
  adapter: new FetchAdapter(),
  baseURL: 'https://api.example.com',
  interceptors: [
    createLoggerInterceptor()
  ]
});
```

## Customization

```ts
const logger = createLoggerInterceptor({
  prefix: '[API]',
  onRequest: (config) => { /* custom */ },
  onResponse: (res) => { /* custom */ },
  onError: (err) => { /* custom */ }
});
```

## License

MIT