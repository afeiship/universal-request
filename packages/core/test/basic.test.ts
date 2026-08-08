import { createRequest, RequestCore, RequestError, ErrorType, BaseAdapter } from '../src';
import type { RequestConfig, Response } from '../src';

// 模块级控制标志：Mock 适配器通过它模拟失败
let shouldFail = false;

// 内联 Mock 适配器，用于测试 core 逻辑，不依赖真实网络
class MockAdapter extends BaseAdapter {
  public lastConfig: RequestConfig | null = null;

  async request(config: RequestConfig): Promise<Response> {
    this.lastConfig = config;
    if (shouldFail) {
      throw new Error('Network Error');
    }
    return {
      data: { ok: true, url: config.url },
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      config
    };
  }
}

describe('RequestCore Basic', () => {
  beforeEach(() => {
    shouldFail = false;
  });

  test('should create request instance via createRequest', () => {
    const request = createRequest({ adapter: new MockAdapter() });
    expect(request).toBeInstanceOf(RequestCore);
    expect(request.get).toBeInstanceOf(Function);
    expect(request.post).toBeInstanceOf(Function);
    expect(request.put).toBeInstanceOf(Function);
    expect(request.delete).toBeInstanceOf(Function);
    expect(request.patch).toBeInstanceOf(Function);
  });

  test('should create request instance via constructor', () => {
    const request = new RequestCore({ adapter: new MockAdapter() });
    expect(request).toBeInstanceOf(RequestCore);
  });

  test('should add and use request interceptor', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({ adapter });

    request.interceptors.use({
      id: 'auth',
      request: (config) => {
        config.headers = { ...config.headers, Authorization: 'Bearer token' };
        return config;
      }
    });

    await request.get('/users');
    expect(adapter.lastConfig?.headers?.Authorization).toBe('Bearer token');
  });

  test('should execute request interceptors in order (pipe)', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({ adapter });

    request.interceptors.use({
      id: 'first',
      request: (config) => {
        config.headers = { ...config.headers, 'X-First': '1' };
        return config;
      }
    });
    request.interceptors.use({
      id: 'second',
      request: (config) => {
        config.headers = { ...config.headers, 'X-Second': '2' };
        return config;
      }
    });

    await request.get('/users');
    expect(adapter.lastConfig?.headers?.['X-First']).toBe('1');
    expect(adapter.lastConfig?.headers?.['X-Second']).toBe('2');
  });

  test('should add response interceptor', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({ adapter });

    request.interceptors.use({
      id: 'resp',
      response: (response) => {
        response.data = { ...response.data, intercepted: true };
        return response;
      }
    });

    const response = await request.get('/users');
    expect(response.data.intercepted).toBe(true);
  });

  test('should eject interceptor', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({ adapter });

    request.interceptors.use({
      id: 'removed',
      request: (config) => {
        config.headers = { ...config.headers, 'X-Removed': 'yes' };
        return config;
      }
    });

    request.interceptors.eject('removed');
    await request.get('/users');
    expect(adapter.lastConfig?.headers?.['X-Removed']).toBeUndefined();
  });

  test('should preset interceptors via config', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({
      adapter,
      interceptors: [
        {
          id: 'preset',
          request: (config) => {
            config.headers = { ...config.headers, 'X-Preset': 'yes' };
            return config;
          }
        }
      ]
    });

    await request.get('/users');
    expect(adapter.lastConfig?.headers?.['X-Preset']).toBe('yes');
  });

  test('should execute error interceptors in reverse order', async () => {
    const adapter = new MockAdapter();
    const order: string[] = [];
    const request = createRequest({ adapter });

    request.interceptors.use({
      id: 'err1',
      error: (err) => {
        order.push('err1');
        throw err;
      }
    });
    request.interceptors.use({
      id: 'err2',
      error: (err) => {
        order.push('err2');
        throw err;
      }
    });

    shouldFail = true;
    await expect(request.get('/users')).rejects.toBeInstanceOf(RequestError);
    expect(order).toEqual(['err2', 'err1']);
  });

  test('should get and list interceptors', () => {
    const request = createRequest({ adapter: new MockAdapter() });

    request.interceptors.use({ id: 'a', tags: ['auth'] });
    request.interceptors.use({ id: 'b' });

    expect(request.interceptors.get('a')?.tags).toEqual(['auth']);
    expect(request.interceptors.getAll().map((i) => i.id)).toEqual(['a', 'b']);
  });

  test('should normalize network error into RequestError', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({ adapter });

    shouldFail = true;
    await expect(request.get('/users')).rejects.toMatchObject({
      name: 'RequestError',
      type: ErrorType.NETWORK_ERROR
    });
  });

  test('should handle resolveAble: resolve instead of reject', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({ adapter });

    shouldFail = true;
    const response: any = await request.get('/users', undefined, { resolveAble: true });
    expect(response.status).toBe(0);
    expect(response.error).toBeInstanceOf(RequestError);
  });

  test('should support slim response', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({ adapter });

    const response = await request.get('/users', undefined, { slim: true });
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ ok: true, url: '/users' });
  });

  test('should pass params to adapter', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({ adapter });

    await request.get('/users', { page: 1, size: 10 });
    expect(adapter.lastConfig?.params).toEqual({ page: 1, size: 10 });
  });
});

describe('RequestError', () => {
  test('should create RequestError with correct type', () => {
    const config = { url: 'https://example.com' } as RequestConfig;
    const error = new RequestError('Test error', ErrorType.NETWORK_ERROR, config);

    expect(error.message).toBe('Test error');
    expect(error.type).toBe(ErrorType.NETWORK_ERROR);
    expect(error.isNetworkError()).toBe(true);
    expect(error.isTimeoutError()).toBe(false);
    expect(error.isAbortError()).toBe(false);
    expect(error.isHttpError()).toBe(false);
  });

  test('should preserve instanceof Error', () => {
    const config = { url: 'https://example.com' } as RequestConfig;
    const error = new RequestError('test', ErrorType.TIMEOUT_ERROR, config);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(RequestError);
    expect(error.isTimeoutError()).toBe(true);
  });

  test('should carry response status', () => {
    const config = { url: 'https://example.com' } as RequestConfig;
    const response = {
      data: null,
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config
    } as Response;
    const error = new RequestError('Not Found', ErrorType.HTTP_ERROR, config, response);

    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.isHttpError()).toBe(true);
  });
});
