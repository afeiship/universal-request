# Meta 字段透传实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 DSL 中定义的 `meta` 通过请求配置传递到拦截器，使拦截器可根据 `meta.tags` 做条件式数据处理。

**Architecture:** 两处改动：① `universal-request-core` 的 `RequestConfig` 显式声明 `meta` 字段；② `http-schema` 的入口 `index.ts` 将 `ApiItem.meta` 透传到 `config.meta`。示例应用展示完整链路：schema → meta → config → interceptor。

**Tech Stack:** TypeScript, universal-request-core, http-schema, json-server, React, bun test, jest

---

### Task 1: universal-request-core — 添加 `meta` 字段到 RequestConfig

**Files:**
- Modify: `packages/core/src/types.ts:37`
- Modify: `packages/core/test/basic.test.ts` (新增测试用例)

- [ ] **Step 1: 在 RequestConfig 接口中添加 meta 字段**

编辑 `packages/core/src/types.ts`，在 `resolveError` 之后、`[key: string]: any` 之前添加：

```typescript
  // 老版本特性
  resolveError?: boolean;

  // 元数据（透传到拦截器）
  meta?: Record<string, any>;

  // 扩展字段
  [key: string]: any;
```

- [ ] **Step 2: 在 core 测试中添加 meta 透传测试**

在 `packages/core/test/basic.test.ts` 的 `RequestCore Basic` describe 块末尾添加：

```typescript
test('should pass meta through config to adapter', async () => {
  const adapter = new MockAdapter();
  const request = createRequest({ adapter });

  await request.get('/users', undefined, { meta: { tags: ['ni2lv'] } as any });
  expect(adapter.lastConfig?.meta).toEqual({ tags: ['ni2lv'] });
});
```

- [ ] **Step 3: 运行测试确认通过**

```bash
cd /Users/afei/github/universal-request/packages/core
npx jest test/basic.test.ts --verbose
```

Expected: 所有测试 PASS，新增的 `meta` 测试通过。

- [ ] **Step 4: Commit**

```bash
cd /Users/afei/github/universal-request
git add packages/core/src/types.ts packages/core/test/basic.test.ts
git commit -m "feat(core): add meta field to RequestConfig for interceptor metadata passthrough"
```

---

### Task 2: http-schema — 将 `item.meta` 透传到 `config.meta`

**Files:**
- Modify: `packages/core/src/index.ts:96`
- Modify: `packages/core/__tests__/index.spec.ts` (新增测试用例)

- [ ] **Step 1: 在 config 构建中添加 meta 透传**

编辑 `packages/core/src/index.ts`，在 config 对象中添加 `meta: item.meta`：

```typescript
const config: RequestConfig = {
  url: resolvedPath,
  method: item.method.toUpperCase() as any,
  baseURL: item.baseURL || undefined,
  dataType: (options?.dataType ?? item.dataType) as any,
  meta: item.meta,  // 透传 meta 到请求配置
  ...callOptions,
};
```

- [ ] **Step 2: 在 http-schema 测试中添加 meta 透传验证**

在 `packages/core/__tests__/index.spec.ts` 末尾添加：

```typescript
import type { RequestConfig } from '@jswork/universal-request-core';

// 自定义适配器，用于捕获请求配置
class CaptureAdapter extends FetchAdapter {
  public lastConfig: RequestConfig | null = null;
  async request(config: RequestConfig): Promise<any> {
    this.lastConfig = config;
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
  }
}

it('should pass meta from schema to request config', async () => {
  const adapter = new CaptureAdapter();
  const config: HttpSchemaConfig = {
    baseURL: 'http://test.com',
    request: ['/api', 'json'],
    items: {
      categories_root: ['get', '/categories/root', { tags: ['ni2lv'] }],
    }
  };
  const api = httpSchema(config, { adapter });
  await api.categories_root();
  expect(adapter.lastConfig?.meta).toEqual({ tags: ['ni2lv'] });
});
```

- [ ] **Step 3: 运行测试确认通过**

```bash
cd /Users/afei/github/http-schema/packages/core
bun test
```

Expected: 所有测试 PASS（原有 22 项 + 新增 1 项 = 23 项）。

- [ ] **Step 4: Commit**

```bash
cd /Users/afei/github/http-schema
git add packages/core/src/index.ts packages/core/__tests__/index.spec.ts
git commit -m "feat(core): pass ApiItem.meta to request config for interceptor consumption"
```

---

### Task 3: 示例应用 — 更新 schema 添加带 meta 的端点

**Files:**
- Modify: `apps/example/src/schema.ts`

- [ ] **Step 1: 在 schema 中添加 categories_root 和 badges_top**

编辑 `apps/example/src/schema.ts`：

```typescript
export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    {
      resources: ['badges', 'posts', 'categories'],
    },
    {
      request: ['', 'json'],
      items: {
        me: ['get', '/me'],
        categories_root: ['get', '/categories/root', { tags: ['ni2lv'] }],
        badges_top: ['get', '/badges/top', { tags: ['featured'] }],
      },
    },
  ],
} as any;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/afei/github/http-schema
git add apps/example/src/schema.ts
git commit -m "feat(example): add meta-tagged endpoints categories_root and badges_top"
```

---

### Task 4: 示例应用 — 创建 tag-transform 拦截器

**Files:**
- Create: `apps/example/src/interceptors/tag-transform.ts`

- [ ] **Step 1: 创建 interceptors 目录和拦截器文件**

```bash
mkdir -p /Users/afei/github/http-schema/apps/example/src/interceptors
```

创建 `apps/example/src/interceptors/tag-transform.ts`：

```typescript
import type { Response } from '@jswork/universal-request-core';

export const tagTransformInterceptor = () => ({
  id: 'tag-transform',
  response: (res: Response) => {
    const tags = res.config?.meta?.tags as string[] | undefined;
    if (!tags || !tags.length) return res;

    if (tags.includes('ni2lv')) {
      // ni2lv 转换：将 categories 转成 key-value 格式
      if (Array.isArray(res.data)) {
        res.data = res.data.map((item: any) => ({
          value: item.id,
          label: item.name,
        }));
      }
    }

    if (tags.includes('featured')) {
      // featured 标记：为每个 item 添加 _featured 标记
      if (Array.isArray(res.data)) {
        res.data = res.data.map((item: any) => ({
          ...item,
          _featured: true,
        }));
      }
    }

    return res;
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/afei/github/http-schema
git add apps/example/src/interceptors/tag-transform.ts
git commit -m "feat(example): add tag-transform interceptor for conditional data transformation"
```

---

### Task 5: 示例应用 — 接入拦截器到 api.ts

**Files:**
- Modify: `apps/example/src/api.ts`

- [ ] **Step 1: 导入并使用 tag-transform 拦截器**

编辑 `apps/example/src/api.ts`：

```typescript
import httpSchema from '@jswork/http-schema';
import { FetchAdapter } from '@jswork/universal-request-adapter-fetch';
import schema from './schema';
import { tagTransformInterceptor } from './interceptors/tag-transform';

const api = httpSchema(schema, {
  adapter: new FetchAdapter(),
  transformResponse: (res) => res.data,
  interceptors: [tagTransformInterceptor],
});

// debug
// @ts-ignore
window.api = api;

export default api;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/afei/github/http-schema
git add apps/example/src/api.ts
git commit -m "feat(example): wire tag-transform interceptor into http-schema instance"
```

---

### Task 6: 示例应用 — 更新 json-server 数据和路由

**Files:**
- Create: `apps/example/server/routes.json`
- Modify: `apps/example/server/db.json`

- [ ] **Step 1: 创建 routes.json 用于路径重写**

创建 `apps/example/server/routes.json`：

```json
{
  "/categories/root": "/categories?root=true",
  "/badges/top": "/badges?_limit=3"
}
```

- [ ] **Step 2: 更新 json-server 启动命令以加载 routes**

编辑 `apps/example/package.json`，修改 server 脚本：

```json
"server": "json-server --watch server/db.json --routes server/routes.json --port 3001 < /dev/null"
```

- [ ] **Step 3: 更新 db.json 确保 categories 有 root 字段（已有）**

确认 `apps/example/server/db.json` 中 `categories` 已有 `root` 字段：
- `{ "id": 1, "name": "Tech", "root": true }` ✅
- `{ "id": 2, "name": "Life", "root": false }` ✅

`badges` 已有足够数据用于 `_limit=3` ✅

- [ ] **Step 4: Commit**

```bash
cd /Users/afei/github/http-schema
git add apps/example/server/routes.json apps/example/package.json
git commit -m "feat(example): add json-server routes for custom endpoints categories/root and badges/top"
```

---

### Task 7: 构建验证

**Files:**
- 无代码改动，仅验证

- [ ] **Step 1: 构建 http-schema 核心库**

```bash
cd /Users/afei/github/http-schema
pnpm build
```

Expected: tsup 编译成功，输出 `dist/index.cjs.js` 和 `dist/index.esm.js`。

- [ ] **Step 2: 运行所有测试**

```bash
cd /Users/afei/github/http-schema
pnpm test
```

Expected: 23 项测试全部通过。

- [ ] **Step 3: 启动示例应用验证**

```bash
cd /Users/afei/github/http-schema/apps/example
pnpm dev
```

Expected: 浏览器打开后可见 `categories_root` 和 `badges_top` 按钮。
- 点击 `categories_root` → 返回数据被 ni2lv 转换（`id` → `value`, `name` → `label`）
- 点击 `badges_top` → 返回数据被 featured 标记（每个 item 有 `_featured: true`）
- 其他 CRUD 端点（`categories_index`, `badges_index` 等）正常工作，无拦截器干扰