/**
 * HTTP 方法枚举
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 响应数据类型
 */
export type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';

/**
 * 数据类型（用于序列化）
 */
export type DataType = 'json' | 'urlencoded' | 'multipart' | 'text' | 'blob' | 'auto';

/**
 * 请求配置接口
 */
export interface RequestConfig {
  // 基础配置
  url: string;
  method?: HttpMethod;
  baseURL?: string;
  headers?: Record<string, string>;
  payload?: any;

  // 功能配置
  timeout?: number;
  responseType?: ResponseType;
  dataType?: DataType;
  signal?: AbortSignal;
  withCredentials?: boolean;

  // 老版本特性
  resolveError?: boolean;

  // 元数据（透传到拦截器）
  meta?: Record<string, any>;

  // 扩展字段
  [key: string]: any;
}

/**
 * 响应接口
 */
export interface Response<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
}

/**
 * 拦截器接口（旧版，兼容用）
 */
export interface Interceptor<V, R = V> {
  fulfilled?: (value: V) => R | Promise<R>;
  rejected?: (error: any) => any;
}

/**
 * 统一拦截器接口
 */
export interface UnifiedInterceptor {
  id: string;
  tags?: string[];
  request?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  response?: (res: Response<any>) => Response<any> | Promise<Response<any>>;
  error?: (err: any) => any;
}

/**
 * 适配器接口
 */
export interface Adapter {
  request(config: RequestConfig): Promise<Response>;
}

/**
 * 拦截器定义：可以是拦截器对象，或返回拦截器对象的工厂函数
 */
export type InterceptorLike = UnifiedInterceptor | (() => UnifiedInterceptor);

/**
 * RequestCore 配置接口
 */
export interface RequestCoreConfig {
  adapter: Adapter;
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  dataType?: DataType;
  interceptors?: InterceptorLike[];
}
