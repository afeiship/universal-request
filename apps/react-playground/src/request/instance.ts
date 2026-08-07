import { createRequest } from '@jswork/universal-request-core';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import { logStore } from './log-store';

let seq = 0;
const now = () => new Date().toLocaleTimeString();

export const request = createRequest({
  adapter: new FetchAdapter(),
  baseURL: 'https://jsonplaceholder.typicode.com'
});

request.interceptors.request.use((config) => {
  logStore.add({
    id: ++seq,
    kind: 'request',
    message: `→ ${config.method} ${config.url}`,
    time: now()
  });
  return config;
});

request.interceptors.response.use(
  (res) => {
    logStore.add({
      id: ++seq,
      kind: 'response',
      message: `← ${res.status} ${res.statusText}`,
      time: now()
    });
    return res;
  },
  (err) => {
    logStore.add({
      id: ++seq,
      kind: 'error',
      message: `✗ ${err.name}: ${err.message}`,
      time: now()
    });
    throw err;
  }
);
