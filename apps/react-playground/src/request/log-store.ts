export type LogKind = 'request' | 'response' | 'error';

export interface LogEntry {
  id: number;
  kind: LogKind;
  message: string;
  time: string;
}

let logs: LogEntry[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const logStore = {
  add(entry: LogEntry) {
    logs = [...logs, entry];
    emit();
  },
  clear() {
    logs = [];
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot() {
    return logs;
  }
};
