import type { Response } from '@jswork/universal-request-core';
import { RequestError } from '@jswork/universal-request-core';

interface ResponsePanelProps {
  response: Response | null;
  error: RequestError | null;
  loading: boolean;
}

export function ResponsePanel({ response, error, loading }: ResponsePanelProps) {
  const renderError = (err: RequestError) => {
    const tag = err.isTimeoutError()
      ? 'TIMEOUT'
      : err.isAbortError()
        ? 'ABORT'
        : err.isNetworkError()
          ? 'NETWORK'
          : err.isHttpError()
            ? `HTTP ${err.status}`
            : 'ERROR';
    return (
      <div className="error-box">
        <div className="error-tag">{tag}</div>
        <div className="error-message">{err.message}</div>
      </div>
    );
  };

  return (
    <div className="card">
      <h2>响应</h2>
      {loading && <div className="placeholder">⏳ 请求中...</div>}
      {!loading && error && renderError(error)}
      {!loading && !error && !response && <div className="placeholder">尚未发送请求</div>}
      {!loading && !error && response && (
        <>
          <div className="response-meta">
            <span className={`status ${response.status < 400 ? 'status-ok' : 'status-err'}`}>
              {response.status} {response.statusText}
            </span>
          </div>
          <div className="response-section">
            <strong>Headers</strong>
            <pre>{JSON.stringify(response.headers, null, 2)}</pre>
          </div>
          <div className="response-section">
            <strong>Data</strong>
            <pre>
              {typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
