import type { HttpMethod, DataType, ResponseType } from '@jswork/universal-request-core';
import type { RequestState } from '../types';

interface RequestPanelProps {
  config: RequestState;
  onChange: (patch: Partial<RequestState>) => void;
  onSend: () => void;
  onAbort: () => void;
  loading: boolean;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const DATA_TYPES: DataType[] = ['json', 'urlencoded', 'multipart', 'text', 'blob', 'auto'];
const RESPONSE_TYPES: ResponseType[] = ['json', 'text', 'blob', 'arrayBuffer', 'formData'];

export function RequestPanel({ config, onChange, onSend, onAbort, loading }: RequestPanelProps) {
  const hasBody = config.method !== 'GET' && config.method !== 'HEAD';

  return (
    <div className="card">
      <h2>请求配置</h2>

      <div className="form-row">
        <label>Method</label>
        <select value={config.method} onChange={(e) => onChange({ method: e.target.value as HttpMethod })}>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>URL</label>
        <input
          type="text"
          value={config.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="/posts/1 (baseURL: jsonplaceholder)"
        />
      </div>

      <div className="form-row">
        <label>Params (JSON)</label>
        <textarea
          value={config.paramsText}
          onChange={(e) => onChange({ paramsText: e.target.value })}
          rows={2}
          placeholder='{"_limit": 5}'
        />
      </div>

      {hasBody && (
        <div className="form-row">
          <label>Body (JSON)</label>
          <textarea
            value={config.bodyText}
            onChange={(e) => onChange({ bodyText: e.target.value })}
            rows={5}
          />
        </div>
      )}

      <div className="form-row form-row-inline">
        <div className="form-cell">
          <label>Timeout (ms)</label>
          <input
            type="number"
            value={config.timeout}
            onChange={(e) => onChange({ timeout: Number(e.target.value) })}
            min={0}
          />
        </div>
        <div className="form-cell">
          <label>dataType</label>
          <select value={config.dataType} onChange={(e) => onChange({ dataType: e.target.value as DataType })}>
            {DATA_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="form-cell">
          <label>responseType</label>
          <select
            value={config.responseType}
            onChange={(e) => onChange({ responseType: e.target.value as ResponseType })}
          >
            {RESPONSE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row form-row-inline">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={config.slim}
            onChange={(e) => onChange({ slim: e.target.checked })}
          />
          slim
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={config.resolveAble}
            onChange={(e) => onChange({ resolveAble: e.target.checked })}
          />
          resolveAble
        </label>
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" onClick={onSend} disabled={loading}>
          {loading ? '发送中...' : 'Send'}
        </button>
        <button className="btn btn-danger" onClick={onAbort} disabled={!loading}>
          Abort
        </button>
      </div>
    </div>
  );
}
