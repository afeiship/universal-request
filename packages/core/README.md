# @jswork/universal-request-core

Universal request core with adapter pattern.

## Installation

```bash
pnpm add @jswork/universal-request-core
```

## Usage

```typescript
import { createRequest } from '@jswork/universal-request-core';

const request = createRequest({
  adapter: yourAdapter,
  baseURL: 'https://api.example.com'
});
```

## License

MIT
