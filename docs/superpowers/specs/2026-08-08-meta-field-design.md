# Meta 字段设计：请求元数据透传与拦截器消费

> 日期：2026-08-08
> 状态：草案

## 目标

在 `universal-request-core` 与 `http-schema` 之间建立一条元数据（meta）传递通道，使得：

1. DSL 中定义的 `meta` 可以通过请求配置传递到拦截器
2. 拦截器可以根据 `meta` 做条件式数据处理（如数据转换、条件跳过等）
3. 示例应用展示完整链路：schema → meta → config → interceptor

## 涉及仓库

| 仓库 | 改动 |
|------|------|
| `universal-request/packages/core` | RequestConfig 添加 `meta` 字段 |
| `http-schema/packages/core` | 将 ApiItem.meta 透传到 config.meta |
| `http-schema/apps/example` | 示例：带 meta 端点 + 拦截器 + mock 数据 |

## 类型定义

### universal-request-core

```typescript
// packages/core/src/types.ts
export interface RequestConfig {
  url: string;
  method?: HttpMethod;
  baseURL?: string;
  headers?: Record<string, string>;
  payload?: any;
  timeout?: number;
  responseType?: ResponseType;
  dataType?: DataType;
  signal?: AbortSignal;
  withCredentials?: boolean;
  resolveError?: boolean;
  meta?: Record<string, any>;  // ← 新增
  [key: string]: any;
}
```

### http-schema

```typescript
// packages/core/src/types.ts（已有，无需改动）
export interface ApiItem {
  name: string;
  method: string;
  fullPath: string;
  dataType: DataType;
  baseURL: string;
  meta?: Record<string, any>;  // 已有
}
```

## 数据流

```
schema.ts:
  categories_root: ['get', '/categories/root', { tags: ['ni2lv'] }]
  badges_top: ['get', '/badges/top', { tags: ['featured'] }]
                          ↓
http-schema/parser.ts 解析为 ApiItem
  { name: 'categories_root', method: 'get', fullPath: '/categories/root',
    meta: { tags: ['ni2lv'] } }
                          ↓
http-schema/index.ts 构建请求配置
  config = { url: '/categories/root', method: 'GET', meta: { tags: ['ni2lv'] } }
                          ↓
universal-request-core 处理
  → 拦截器 request 阶段可读取 config.meta
  → 请求发出
  → 收到响应
  → 拦截器 response 阶段可读取 config.meta（通过 res.config.meta）
                          ↓
interceptor:
  if (config.meta?.tags?.includes('ni2lv')) {
    // 数据转换
  }
```

## 改动清单

### 1. universal-request/packages/core/src/types.ts

在 `RequestConfig` 接口中添加：

```typescript
meta?: Record<string, any>;
```

### 2. http-schema/packages/core/src/index.ts

在构建 `config` 对象时，将 `item.meta` 赋值给 `config.meta`：

```typescript
const config: RequestConfig = {
  url: resolvedPath,
  method: item.method.toUpperCase() as any,
  baseURL: item.baseURL || undefined,
  dataType: (options?.dataType ?? item.dataType) as any,
  meta: item.meta,  // ← 新增
  ...callOptions,
};
```

### 3. http-schema/apps/example/src/schema.ts

添加带 meta 的端点：

```typescript
export default {
  baseURL: '/api',
  request: ['', 'json'],
  items: [
    {
      resources: ['badges', 'posts', 'categories', 'tags'],
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
};
```

### 4. http-schema/apps/example/src/interceptors/tag-transform.ts

新建响应拦截器，读取 `config.meta.tags` 做条件转换：

```typescript
const tagTransformInterceptor = () => ({
  id: 'tag-transform',
  response: (res) => {
    const tags = res.config?.meta?.tags;
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

### 5. http-schema/apps/example/src/api.ts

接入拦截器：

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

export default api;
```

### 6. http-schema/apps/example/server/db.json

添加 `tags` 资源：

```json
{
  "badges": [...],
  "posts": [...],
  "categories": [
    { "id": 1, "name": "Tech", "root": true },
    { "id": 2, "name": "Life", "root": false }
  ],
  "tags": [
    { "id": 1, "name": "ni2lv", "description": "内部标签" },
    { "id": 2, "name": "featured", "description": "精选" }
  ],
  "me": {...}
}
```

### 7. http-schema/apps/example/server/routes.json

新建 json-server 路由重写，让自定义路径返回数据：

```json
{
  "/categories/root": "/categories?root=true",
  "/badges/top": "/badges?_limit=3"
}
```

## 拦截器设计原则

1. **读取 `config.meta.tags`，不修改它** — meta 是声明式输入，拦截器只读
2. **拦截器修改 `res.data`** — 输出端转换，不影响缓存或后续请求
3. **每个 tag 独立处理** — 多个 tag 可叠加效果
4. **无匹配 tag 时直接返回** — 零开销跳过

## 验证方式

1. `pnpm build` 通过（核心库 + 示例）
2. `pnpm test` 通过（23 项测试）
3. 运行 `pnpm dev` 打开浏览器：
   - 点击 `categories_root` → 返回数据被 ni2lv 转换（id → value, name → label）
   - 点击 `badges_top` → 返回数据被 featured 标记（每个 item 有 `_featured: true`）
   - 点击 `tags_index`/`tags_show` 等 CRUD 正常