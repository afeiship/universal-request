import { createRequest } from '@jswork/universal-request-core';
import { MpUniappAdapter } from '../src';

describe('MpUniappAdapter', () => {
  let originalUni: any;
  let mockRequest: jest.Mock;

  beforeEach(() => {
    mockRequest = jest.fn();
    originalUni = (globalThis as any).uni;
    (globalThis as any).uni = {
      request: mockRequest
    };
  });

  afterEach(() => {
    (globalThis as any).uni = originalUni;
  });

  test('should send GET request with query params', async () => {
    mockRequest.mockImplementation((options) => {
      options.success({
        statusCode: 200,
        data: { id: 1, name: 'afei' },
        header: { 'content-type': 'application/json' }
      });
      return { abort: jest.fn() };
    });

    const adapter = new MpUniappAdapter();
    const request = createRequest({
      adapter,
      baseURL: 'https://api.example.com'
    });

    const res = await request.get('/users', { page: 1, limit: 10 });

    expect(mockRequest).toHaveBeenCalledTimes(1);
    const callArgs = mockRequest.mock.calls[0][0];
    expect(callArgs.url).toBe('https://api.example.com/users?page=1&limit=10');
    expect(callArgs.method).toBe('GET');
    expect(callArgs.data).toBeUndefined();
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: 1, name: 'afei' });
    expect(res.headers).toEqual({ 'content-type': 'application/json' });
  });

  test('should send POST request with body and headers', async () => {
    mockRequest.mockImplementation((options) => {
      options.success({
        statusCode: 201,
        data: JSON.stringify({ success: true }),
        header: { 'content-type': 'application/json' }
      });
      return { abort: jest.fn() };
    });

    const adapter = new MpUniappAdapter();
    const request = createRequest({
      adapter,
      baseURL: 'https://api.example.com'
    });

    const res = await request.post(
      '/users',
      { name: 'john' },
      { headers: { Authorization: 'Bearer token' } }
    );

    const callArgs = mockRequest.mock.calls[0][0];
    expect(callArgs.url).toBe('https://api.example.com/users');
    expect(callArgs.method).toBe('POST');
    expect(callArgs.data).toBe(JSON.stringify({ name: 'john' }));
    expect(callArgs.header['Authorization']).toBe('Bearer token');
    expect(callArgs.header['Content-Type']).toBe('application/json;charset=utf-8');
    // 自动将 JSON 字符串解析为对象
    expect(res.data).toEqual({ success: true });
    expect(res.status).toBe(201);
  });

  test('should support text responseType without parsing JSON', async () => {
    mockRequest.mockImplementation((options) => {
      expect(options.responseType).toBeUndefined();
      options.success({
        statusCode: 200,
        data: '{"raw":"string"}'
      });
      return { abort: jest.fn() };
    });

    const adapter = new MpUniappAdapter();
    const request = createRequest({ adapter });
    const res = await request.get('https://api.example.com/raw', undefined, {
      responseType: 'text'
    });

    expect(res.data).toBe('{"raw":"string"}');
  });

  test('should map arrayBuffer responseType to uniapp arraybuffer', async () => {
    mockRequest.mockImplementation((options) => {
      expect(options.responseType).toBe('arraybuffer');
      options.success({
        statusCode: 200,
        data: new ArrayBuffer(8)
      });
      return { abort: jest.fn() };
    });

    const adapter = new MpUniappAdapter();
    const request = createRequest({ adapter });
    const res = await request.get('https://api.example.com/buffer', undefined, {
      responseType: 'arrayBuffer'
    });

    expect(res.data).toBeInstanceOf(ArrayBuffer);
  });

  test('should handle fail callback with network error', async () => {
    mockRequest.mockImplementation((options) => {
      options.fail({ errMsg: 'request:fail net::ERR_CONNECTION_REFUSED' });
      return { abort: jest.fn() };
    });

    const adapter = new MpUniappAdapter();
    const request = createRequest({ adapter });

    await expect(request.get('https://api.example.com')).rejects.toMatchObject({
      name: 'RequestError',
      type: 'NETWORK_ERROR'
    });
  });

  test('should handle fail callback with timeout', async () => {
    mockRequest.mockImplementation((options) => {
      options.fail({ errMsg: 'request:fail timeout' });
      return { abort: jest.fn() };
    });

    const adapter = new MpUniappAdapter();
    const request = createRequest({ adapter });

    await expect(request.get('https://api.example.com')).rejects.toMatchObject({
      name: 'RequestError',
      type: 'TIMEOUT_ERROR'
    });
  });

  test('should abort request task when signal is triggered', async () => {
    const abortMock = jest.fn();
    mockRequest.mockImplementation((options) => {
      return {
        abort: () => {
          abortMock();
          options.fail({ errMsg: 'request:fail abort' });
        }
      };
    });

    const controller = new AbortController();
    const adapter = new MpUniappAdapter();
    const request = createRequest({ adapter });

    const promise = request.get('https://api.example.com', undefined, {
      signal: controller.signal
    });

    controller.abort();

    await expect(promise).rejects.toMatchObject({
      name: 'RequestError',
      type: 'ABORT_ERROR'
    });

    expect(abortMock).toHaveBeenCalledTimes(1);
  });
});
