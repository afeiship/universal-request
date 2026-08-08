import { createRequest } from '@jswork/universal-request-core';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import { createLoggerInterceptor } from '@jswork/universal-request-interceptor-logger';

export const request = createRequest({
  adapter: new FetchAdapter(),
  baseURL: 'https://jsonplaceholder.typicode.com',
  interceptors: [
    createLoggerInterceptor()
  ]
});