import { useRef, useState } from 'react';
import { RequestError, ErrorType } from '@jswork/universal-request-core';
import type { Response } from '@jswork/universal-request-core';
import { request } from '../request/axios-instance';
import type { RequestState } from '../types';
import { RequestPanel } from '../components/request-panel';
import { ResponsePanel } from '../components/response-panel';
import { LogPanel } from '../components/log-panel';

const DEFAULT_STATE: RequestState = {
  method: 'GET',
  url: '/posts?_limit=5',
  headersText: '',
  paramsText: '',
  bodyText: '{}',
  timeout: 0,
  resolveError: false,
  dataType: 'json',
  responseType: 'json'
};

export default function AxiosPage() {
  const [state, setState] = useState<RequestState>(DEFAULT_STATE);
  const [response, setResponse] = useState<Response | null>(null);
  const [error, setError] = useState<RequestError | null>(null);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  const handleChange = (patch: Partial<RequestState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  const parseJson = (text: string, field: string): Record<string, any> | undefined => {
    if (!text.trim()) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`${field} JSON 解析失败，请检查格式`);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    const controller = new AbortController();
    controllerRef.current = controller;
    const start = performance.now();

    try {
      const headers = parseJson(state.headersText, 'headers');
      const payload = parseJson(state.bodyText, 'body');

      const res = await request.request({
        url: state.url,
        method: state.method,
        headers,
        payload,
        timeout: state.timeout > 0 ? state.timeout : undefined,
        resolveError: state.resolveError,
        dataType: state.dataType,
        responseType: state.responseType,
        signal: controller.signal
      });

      const maybeError = (res as any).error;
      if (maybeError instanceof RequestError) {
        setError(maybeError);
      } else {
        setResponse(res);
      }
    } catch (err: any) {
      if (err instanceof RequestError) {
        setError(err);
      } else {
        setError(
          new RequestError(err?.message || 'Unknown error', ErrorType.UNKNOWN_ERROR, {} as any)
        );
      }
    } finally {
      setDuration(performance.now() - start);
      setLoading(false);
    }
  };

  const handleAbort = () => {
    controllerRef.current?.abort();
  };

  return (
    <section className="page-content">
      <section className="panel-left">
        <RequestPanel
          config={state}
          onChange={handleChange}
          onSend={handleSend}
          onAbort={handleAbort}
          loading={loading}
        />
      </section>
      <section className="panel-right">
        <ResponsePanel response={response} error={error} loading={loading} duration={duration} />
        <LogPanel />
      </section>
    </section>
  );
}