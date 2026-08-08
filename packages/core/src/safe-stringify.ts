/**
 * 安全 JSON 序列化
 * 处理循环引用、BigInt、undefined 等 JSON.stringify 会抛错或丢失的场景
 */
export function safeStringify(data: any): string {
  // 原始值直接返回
  if (typeof data === 'string') return data;
  if (typeof data !== 'object' || data === null) {
    return JSON.stringify(data);
  }

  const seen = new WeakSet();

  const replacer = (key: string, value: any) => {
    // 处理 BigInt
    if (typeof value === 'bigint') {
      return value.toString();
    }

    // 处理循环引用
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }

    return value;
  };

  return JSON.stringify(data, replacer);
}