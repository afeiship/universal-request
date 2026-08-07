import { useState } from 'react';
import type { Response } from '@jswork/universal-request-core';
import { RequestError } from '@jswork/universal-request-core';

interface ResponsePanelProps {
  response: Response | null;
  error: RequestError | null;
  loading: boolean;
  duration: number;
}

const formatSize = (data: any): string => {
  const raw = typeof data === 'string' ? data : JSON.stringify(data);
  const bytes = new Blob([raw]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
};

export function ResponsePanel({ response, error, loading, duration }: ResponsePanelProps) {
  const [tab, setTab] = useState<'data' | 'headers'>('data');

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

  const renderMeta = () => {
    if (!response) return null;
    const bodySize = formatSize(response.data);
    return (
      <div className="response-meta">
        <span className={`status ${response.status < 400 ? 'status-ok' : 'status-err'}`}>
          {response.status} {response.statusText}
        </span>
        <span className="meta-sep">·</span>
        <span className="meta-duration">{formatDuration(duration)}</span>
        <span className="meta-sep">·</span>
        <span className="meta-size">{bodySize}</span>
      </div>
    );
  };

  const renderData = () => {
    if (!response) return null;
    const text =
      typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data, null, 2);
    return (
      <div className="response-section">
        <div className="section-header">
          <strong>Data</strong>
          <button className="btn btn-small" onClick={() => copyToClipboard(text)}>
            复制
          </button>
        </div>
        <pre>{text}</pre>
      </div>
    );
  };

  const renderHeaders = () => {
    if (!response) return null;
    const text = JSON.stringify(response.headers, null, 2);
    return (
      <div className="response-section">
        <div className="section-header">
          <strong>Headers</strong>
          <button className="btn btn-small" onClick={() => copyToClipboard(text)}>
            复制
          </button>
        </div>
        <pre>{text}</pre>
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
          {renderMeta()}
          <div className="tabs">
            <button
              className={`tab ${tab === 'data' ? 'tab-active' : ''}`}
              onClick={() => setTab('data')}
            >
              Data
            </button>
            <button
              className={`tab ${tab === 'headers' ? 'tab-active' : ''}`}
              onClick={() => setTab('headers')}
            >
              Headers
            </button>
          </div>
          {tab === 'data' ? renderData() : renderHeaders()}
        </>
      )}
    </div>
  );
}