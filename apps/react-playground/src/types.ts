import type { HttpMethod, DataType, ResponseType } from '@jswork/universal-request-core';

export interface RequestState {
  method: HttpMethod;
  url: string;
  headersText: string;
  paramsText: string;
  bodyText: string;
  timeout: number;
  slim: boolean;
  resolveError: boolean;
  dataType: DataType;
  responseType: ResponseType;
}
