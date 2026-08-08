# 移除 slim 参数实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移除 `RequestConfig` 中的 `slim` 参数，简化响应返回逻辑。

**Architecture:** 删除 `types.ts` 中的类型定义、`request-core.ts` 中的 slim 分支、对应测试和 playground UI 控件。`request()` 方法直接返回 `processedResponse`。

**Tech Stack:** TypeScript, Jest, React

---

### Task 1: 移除核心包 slim 逻辑

**Files:**
- Modify: `packages/core/src/types.ts:35`
- Modify: `packages/core/src/request-core.ts:53-62`

- [ ] **Step 1: 删除 types.ts 中的 slim 类型定义**

将 `packages/core/src/types.ts` 中第 35 行 `slim?: boolean;` 删除。

- [ ] **Step 2: 删除 request-core.ts 中的 slim 分支**

将 `packages/core/src/request-core.ts` 中第 53-62 行的 slim 处理代码：

```ts
      // 5. slim 处理
      if (config.slim) {
        return {
          data: processedResponse.data,
          status: processedResponse.status,
          statusText: processedResponse.statusText,
          headers: processedResponse.headers,
          config: processedResponse.config
        } as any;
      }

      return processedResponse;
```

改为：

```ts
      return processedResponse;
```

- [ ] **Step 3: 验证核心包编译通过**

Run: `cd /Users/afei/github/universal-request/packages/core && npx tsc --noEmit`（如果 npx tsc 报错，用 `./node_modules/.bin/tsc --noEmit`）
Expected: 编译通过

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/request-core.ts
git commit -m "refactor(core): remove slim parameter"
```

---

### Task 2: 移除 slim 测试

**Files:**
- Modify: `packages/core/test/basic.test.ts:194-200`

- [ ] **Step 1: 删除 `should support slim response` 测试**

从 `packages/core/test/basic.test.ts` 中删除以下测试块（第 194-200 行）：

```ts
  test('should support slim response', async () => {
    const adapter = new MockAdapter();
    const request = createRequest({ adapter });

    const response = await request.get('/users', undefined, { slim: true });
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ ok: true, url: '/users' });
  });
```

- [ ] **Step 2: 运行测试确认通过**

Run: `cd /Users/afei/github/universal-request/packages/core && npx jest`
Expected: 17 passed, 0 failed（原来的 18 个测试去掉 slim 后剩 17 个）

- [ ] **Step 3: Commit**

```bash
git add packages/core/test/basic.test.ts
git commit -m "test(core): remove slim response test"
```

---

### Task 3: 移除 playground 中的 slim 控件

**Files:**
- Modify: `apps/react-playground/src/types.ts:10`
- Modify: `apps/react-playground/src/components/request-panel.tsx:112-118`
- Modify: `apps/react-playground/src/pages/axios-page.tsx:17`
- Modify: `apps/react-playground/src/pages/axios-page.tsx:63`
- Modify: `apps/react-playground/src/pages/fetch-page.tsx:17`
- Modify: `apps/react-playground/src/pages/fetch-page.tsx:63`

- [ ] **Step 1: 删除 types.ts 中的 slim 字段**

从 `apps/react-playground/src/types.ts` 中删除 `slim: boolean;`。

- [ ] **Step 2: 删除 request-panel.tsx 中的 slim 复选框**

从 `apps/react-playground/src/components/request-panel.tsx` 中删除以下 JSX 代码块：

```tsx
        <label className="checkbox">
          <input
            type="checkbox"
            checked={config.slim}
            onChange={(e) => onChange({ slim: e.target.checked })}
          />
          slim
        </label>
```

- [ ] **Step 3: 删除 axios-page.tsx 和 fetch-page.tsx 中的 slim 引用**

从两个文件的 `DEFAULT_STATE` 中删除 `slim: false,`。
从两个文件的 `request.request({...})` 调用中删除 `slim: state.slim,`。

- [ ] **Step 4: 验证 playground 编译通过**

Run: `cd /Users/afei/github/universal-request/apps/react-playground && npx tsc --noEmit`
Expected: 编译通过

- [ ] **Step 5: Commit**

```bash
git add apps/react-playground/src/types.ts apps/react-playground/src/components/request-panel.tsx apps/react-playground/src/pages/axios-page.tsx apps/react-playground/src/pages/fetch-page.tsx
git commit -m "refactor(playground): remove slim UI controls"
```

---

### Task 4: 全量验证

**Files:**
- 无

- [ ] **Step 1: 构建所有包**

Run:
```bash
cd /Users/afei/github/universal-request/packages/core && pnpm run build
cd /Users/afei/github/universal-request/packages/adapters/axios && pnpm run build
cd /Users/afei/github/universal-request/packages/adapters/fetch && pnpm run build
cd /Users/afei/github/universal-request/packages/interceptors/logger && pnpm run build
```
Expected: 全部编译成功

- [ ] **Step 2: 运行核心测试**

Run: `cd /Users/afei/github/universal-request/packages/core && npx jest`
Expected: 17/17 passed

- [ ] **Step 3: 检查无残留 slim 引用**

Run:
```bash
grep -rn "slim" /Users/afei/github/universal-request/packages/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v dist
```
Expected: 无输出（无残留）

- [ ] **Step 4: 最终提交（如有遗漏）**

```bash
git status
# 如有未提交改动，一并提交
```