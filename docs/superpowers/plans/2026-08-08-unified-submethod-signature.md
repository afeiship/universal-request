# 统一子方法签名实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `RequestCore` 的子方法 `get`/`post`/`put`/`delete`/`patch` 统一为 `(url, payload?, config?)` 三参数签名，用 `payload` 替代原来的 `params`+`data`，由 HTTP method 决定其路由方式（query 或 body）。

**Architecture:** `RequestConfig` 移除 `params` 和 `data`，新增 `payload` 字段。子方法统一签名并把 payload 透传到 `request()` 的 config。`BaseAdapter.buildURL` 对 GET/HEAD/DELETE 将 `config.payload` 序列化为 query string 拼入 URL；`BaseAdapter.serializeData` 对 POST/PUT/PATCH 将 `config.payload` 序列化为请求 body。两个 adapter（axios/fetch）都通过 `serializeData` 处理 body，无需改动。

**Tech Stack:** TypeScript, Jest, Lerna/pnpm workspace

**关键背景：**
- 两个 adapter（`packages/adapters/axios`、`packages/adapters/fetch`）都通过 `BaseAdapter.serializeData(config)` 得到 body，不直接读 `config.data`，因此**无需改动**
- `Response` 接口的 `data` 字段名不变（响应数据）
- 核心测试命令：在 `packages/core` 下运行 `npx jest`

---

### Task 1: 更新 RequestConfig 类型（types.ts）

**Files:**
- Modify: `packages/core/src/types.ts:19-41`

- [ ] **Step 1: 修改 RequestConfig 接口**

将 `packages/core/src/types.ts` 中的 `RequestConfig` 接口改为：

```ts
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
  slim?: boolean;
  resolveError?: boolean;

  // 扩展字段
  [key: string]: any;
}
```

具体改动：
- 删除 `params?: Record<string, any>;` 和 `data?: any;` 两行
- 在 `headers` 之后新增 `payload?: any;`

- [ ] **Step 2: 运行测试确认编译能通过（此时测试会因旧调用失败，属预期）**

Run: `cd packages/core && npx tsc --noEmit`
Expected: 编译通过（子方法签名尚未改，测试文件暂不检查）

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/types.ts
git commit -m "feat(core): add payload to RequestConfig, remove params/data"
```

---

### Task 2: 更新 BaseAdapter.buildURL 支持 payload query

**Files:**
- Modify: `packages/core/src/base-adapter.ts:18-33`

- [ ] **Step 1: 修改 buildURL 方法**

将 `packages/core/src/base-adapter.ts` 中 `buildURL` 方法改为：

```ts
  /**
   * 构建完整 URL（baseURL + url + payload query）
   */
  protected buildURL(config: RequestConfig): string {
    let url = config.url;

    // 拼接 baseURL
    if (config.baseURL && !url.startsWith('http')) {
      url = config.baseURL.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
    }

    // GET/HEAD/DELETE 时，payload 作为 query string 拼接
    const isQueryMethod = config.method === 'GET' || config.method === 'HEAD' || config.method === 'DELETE';
    if (isQueryMethod && config.payload && Object.keys(config.payload).length > 0) {
      const queryString = new URLSearchParams(config.payload).toString();
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    return url;
  }
```

具体改动：把原来基于 `config.params` 的 query 拼接逻辑，改为基于 `config.payload`，并增加 `isQueryMethod` 判断（仅 GET/HEAD/DELETE）。

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/base-adapter.ts
git commit -m "feat(core): buildURL uses payload as query for GET/HEAD/DELETE"
```

---

### Task 3: 更新 BaseAdapter.serializeData 支持 payload body

**Files:**
- Modify: `packages/core/src/base-adapter.ts:38-100`

- [ ] **Step 1: 修改 serializeData 方法**

将 `packages/core/src/base-adapter.ts` 中 `serializeData` 方法开头改为：

```ts
  /**
   * 序列化请求数据（根据 dataType）
   */
  protected serializeData(config: RequestConfig): { body?: any; headers: Record<string, string> } {
    const { payload, dataType = 'json', headers = {} } = config;

    if (payload === undefined || payload === null) {
      return { headers };
    }

    const result: { body?: any; headers: Record<string, string> } = { headers: { ...headers } };
```

其余 case 分支不变，只需把方法体内所有 `data` 变量引用改为 `payload`。

具体改动：
- 解构处：`const { data, ... }` → `const { payload, ... }`
- 判空处：`if (data === undefined || data === null)` → `if (payload === undefined || payload === null)`
- 方法体内所有 `data` 引用（如 `URLSearchParams(data)`、`Object.entries(data)`、`String(data)`、`safeStringify(data)`、`fd.append(key, value as any)` 中的 `data`）改为 `payload`

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/base-adapter.ts
git commit -m "feat(core): serializeData uses payload as body"
```

---

### Task 4: 统一 RequestCore 子方法签名

**Files:**
- Modify: `packages/core/src/request-core.ts:90-123`

- [ ] **Step 1: 修改 get/post/put/delete/patch 五个方法**

将 `packages/core/src/request-core.ts` 中第 90-123 行的五个子方法统一改为：

```ts
  /**
   * GET 请求
   */
  async get<T = any>(url: string, payload?: any, config?: RequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'GET', payload });
  }

  /**
   * POST 请求
   */
  async post<T = any>(url: string, payload?: any, config?: RequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'POST', payload });
  }

  /**
   * PUT 请求
   */
  async put<T = any>(url: string, payload?: any, config?: RequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', payload });
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(url: string, payload?: any, config?: RequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE', payload });
  }

  /**
   * PATCH 请求
   */
  async patch<T = any>(url: string, payload?: any, config?: RequestConfig): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', payload });
  }
```

注意：`config` 参数类型从 `Omit<RequestConfig, 'url' | 'method' | 'params'>` 等改为完整的 `RequestConfig`（因为不再需要 Omit params/data）。

- [ ] **Step 2: 运行测试确认编译通过**

Run: `cd packages/core && npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/request-core.ts
git commit -m "feat(core): unify sub-method signature to (url, payload?, config?)"
```

---

### Task 5: 更新核心测试

**Files:**
- Modify: `packages/core/test/basic.test.ts`

- [ ] **Step 1: 更新 MockAdapter 及测试用例**

将 `packages/core/test/basic.test.ts` 中：

1. `MockAdapter.request` 返回里的 `url: config.url` 保持不变（测试断言 GET 时 URL 已含 query）。

2. 将第 203-209 行的 `should pass params to adapter` 测试替换为如下三个测试：

```ts
  test('should serialize GET payload into query string', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({ adapter });

    const response = await request.get('/users', { page: 1, size: 10 });
    expect(response.data.url).toBe('/users?page=1&size=10');
  });

  test('should serialize POST payload into body', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({ adapter });

    await request.post('/users', { name: 'foo' });
    expect(adapter.lastConfig?.payload).toEqual({ name: 'foo' });
    expect(adapter.lastConfig?.method).toBe('POST');
  });

  test('should keep payload in config for adapters', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({ adapter });

    await request.put('/users/1', { name: 'bar' });
    expect(adapter.lastConfig?.payload).toEqual({ name: 'bar' });
  });
```

说明：Mock 适配器直接返回 `config.url`，因此 GET 测试可通过断言 `response.data.url` 验证 query 拼接。POST/PUT 通过 `adapter.lastConfig` 验证 payload 是否透传。

- [ ] **Step 2: 运行测试确认通过**

Run: `cd packages/core && npx jest`
Expected: 测试全部通过（payload 相关 3 个测试新增，其余保持通过）

- [ ] **Step 3: Commit**

```bash
git add packages/core/test/basic.test.ts
git commit -m "test(core): update tests for unified payload signature"
```

---

### Task 6: 更新 react-playground 页面

**Files:**
- Modify: `apps/react-playground/src/pages/axios-page.tsx`
- Modify: `apps/react-playground/src/pages/fetch-page.tsx`

- [ ] **Step 1: 更新 axios-page.tsx 的 handleSend**

将 `apps/react-playground/src/pages/axios-page.tsx` 第 54-57 行改为：

```ts
      const headers = parseJson(state.headersText, 'headers');
      const payload = parseJson(state.bodyText, 'body');
```

将第 59-71 行的 `request.request(...)` 调用中 `params` 和 `data` 字段改为 `payload`：

```ts
      const res = await request.request({
        url: state.url,
        method: state.method,
        headers,
        payload,
        timeout: state.timeout > 0 ? state.timeout : undefined,
        slim: state.slim,
        resolveError: state.resolveError,
        dataType: state.dataType,
        responseType: state.responseType,
        signal: controller.signal
      });
```

- [ ] **Step 2: 更新 fetch-page.tsx 的 handleSend**

对 `apps/react-playground/src/pages/fetch-page.tsx` 做相同改动（第 54-57 行、第 59-71 行），把 `params`/`data` 改为 `payload`。

- [ ] **Step 3: 更新 playground types.ts**

将 `apps/react-playground/src/types.ts` 中 `RequestState` 接口的 `paramsText` 字段保留（UI 输入框逻辑不变），但注意 `handleSend` 中已不再读取 `paramsText`。若想彻底对齐新设计，可保留 `paramsText` 字段但不再用于请求；为避免 UI 改动过大，**保留 `paramsText` 字段和对应输入框不变**，仅在请求构造时忽略它。

- [ ] **Step 4: 验证 playground 编译**

Run: `cd apps/react-playground && npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 5: Commit**

```bash
git add apps/react-playground/src/pages/axios-page.tsx apps/react-playground/src/pages/fetch-page.tsx
git commit -m "refactor(playground): use unified payload field in request pages"
```

---

### Task 7: 全量验证

**Files:**
- 无（验证任务）

- [ ] **Step 1: 构建 core 包**

Run: `cd packages/core && pnpm run build`
Expected: TypeScript 编译成功，生成 dist/

- [ ] **Step 2: 运行 core 全部测试**

Run: `cd packages/core && npx jest`
Expected: 全部测试通过

- [ ] **Step 3: 检查全仓库无残留 params/data 引用（核心源码）**

Run:
```bash
cd /Users/afei/github/universal-request
grep -rn "config\.data\|config\.params" packages/core/src/ packages/adapters/*/src/ --include="*.ts"
```
Expected: 无输出（base-adapter 已改用 payload）

- [ ] **Step 4: 最终 Commit（如有遗漏改动）**

```bash
git status
# 如有未提交改动，一并提交
```