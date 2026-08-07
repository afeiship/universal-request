import { useSyncExternalStore } from 'react';
import { logStore } from '../request/log-store';

export function LogPanel() {
  const logs = useSyncExternalStore(logStore.subscribe, logStore.getSnapshot);

  return (
    <div className="card">
      <div className="card-header">
        <h2>拦截器日志</h2>
        <button className="btn btn-small" onClick={() => logStore.clear()}>
          Clear
        </button>
      </div>
      {logs.length === 0 ? (
        <div className="placeholder">暂无日志</div>
      ) : (
        <ul className="log-list">
          {logs.map((log) => (
            <li key={log.id} className={`log-item log-${log.kind}`}>
              <span className="log-time">{log.time}</span>
              <span className="log-message">{log.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
