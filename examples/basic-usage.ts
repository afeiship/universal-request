/**
 * 基础使用示例
 */

import { createRequest } from '@jswork/universal-request-core';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';

// 创建请求实例
const request = createRequest({
  adapter: new FetchAdapter(),
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 5000
});

// 添加请求拦截器
request.interceptors.request.use((config) => {
  console.log('Request:', config.url);
  config.headers['X-Custom-Header'] = 'custom-value';
  return config;
});

// 添加响应拦截器
request.interceptors.response.use(
  (response) => {
    console.log('Response:', response.status);
    return response;
  },
  (error) => {
    console.error('Error:', error.message);
    return Promise.reject(error);
  }
);

// 示例函数
async function example() {
  try {
    // GET 请求
    const users = await request.get('/users');
    console.log('Users:', users.data);

    // POST 请求
    const newUser = await request.post('/users', {
      name: 'Test User',
      email: 'test@example.com'
    });
    console.log('New User:', newUser.data);

    // slim 响应
    const { status, data } = await request.get('/users/1', undefined, { slim: true });
    console.log('Slim response:', status, data);

  } catch (error: any) {
    if (error.isTimeoutError?.()) {
      console.error('请求超时');
    } else if (error.isNetworkError?.()) {
      console.error('网络错误');
    } else {
      console.error('其他错误:', error.message);
    }
  }
}

// 运行示例
// example();
