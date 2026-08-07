# @jswork/universal-request-adapter-fetch

Fetch adapter for universal-request.

## Installation

```bash
pnpm add @jswork/universal-request-adapter-fetch @jswork/universal-request-core
```

## Usage

```typescript
import { createRequest } from '@jswork/universal-request-core';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';

const request = createRequest({
  adapter: new FetchAdapter(),
  baseURL: 'https://api.example.com'
});
```

## License

MIT
