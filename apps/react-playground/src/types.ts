import type { HttpMethod, DataType, ResponseType } from '@jswork/universal-request-core';

export interface RequestState {
  method: HttpMethod;
  url: string;
  headersText: string;
  paramsText: string;
  bodyText: string;
  timeout: number;
  slim: boolean;
  resolveAble: boolean;
  dataType: DataType;
  responseType: ResponseType;
}
