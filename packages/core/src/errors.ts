import type { RequestConfig, Response } from './types';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  ABORT_ERROR = 'ABORT_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  TRANSFORM_ERROR = 'TRANSFORM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 统一错误类
 */
export class RequestError extends Error {
  public readonly type: ErrorType;
  public readonly status?: number;
  public readonly statusText?: string;
  public readonly config: RequestConfig;
  public readonly response?: Response;

  constructor(
    message: string,
    type: ErrorType,
    config: RequestConfig,
    response?: Response
  ) {
    super(message);
    this.name = 'RequestError';
    this.type = type;
    this.config = config;
    this.response = response;

    if (response) {
      this.status = response.status;
      this.statusText = response.statusText;
    }

    Object.setPrototypeOf(this, RequestError.prototype);
  }

  /**
   * 是否为网络错误
   */
  isNetworkError(): boolean {
    return this.type === ErrorType.NETWORK_ERROR;
  }

  /**
   * 是否为超时错误
   */
  isTimeoutError(): boolean {
    return this.type === ErrorType.TIMEOUT_ERROR;
  }

  /**
   * 是否为取消错误
   */
  isAbortError(): boolean {
    return this.type === ErrorType.ABORT_ERROR;
  }

  /**
   * 是否为 HTTP 错误
   */
  isHttpError(): boolean {
    return this.type === ErrorType.HTTP_ERROR;
  }
}
