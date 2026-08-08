import { createRequest } from '@jswork/universal-request-core';
import { AxiosAdapter } from '@jswork/universal-request-adapter-axios';
import { createLoggerInterceptor } from '@jswork/universal-request-interceptor-logger';

export const request = createRequest({
  adapter: new AxiosAdapter(),
  baseURL: 'https://jsonplaceholder.typicode.com',
  interceptors: [
    createLoggerInterceptor
  ]
});