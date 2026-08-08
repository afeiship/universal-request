# 移除 slim 参数设计

## 背景

`RequestConfig` 中存在 `slim?: boolean` 参数，用于在响应拦截器执行后只返回 `{ data, status, statusText, headers, config }`，去掉拦截器可能附加的额外字段。该参数是冗余的，应移除。

## 设计

### 改动内容

移除 `slim` 参数及其相关的分支逻辑、UI 控件和测试。

### 具体改动

| 文件 | 改动 |
|---|---|
| `packages/core/src/types.ts` | 删除 `slim?: boolean;` |
| `packages/core/src/request-core.ts` | 删除 `slim` 判断分支，`request()` 直接返回 `processedResponse` |
| `packages/core/test/basic.test.ts` | 删除 `should support slim response` 测试 |
| `apps/react-playground/src/types.ts` | 删除 `slim: boolean` |
| `apps/react-playground/src/components/request-panel.tsx` | 删除 slim 复选框 |
| `apps/react-playground/src/pages/axios-page.tsx` | 删除 `slim: state.slim` |
| `apps/react-playground/src/pages/fetch-page.tsx` | 删除 `slim: state.slim` |

### request() 方法变化

移除第 53-62 行的 `slim` 处理分支：

```ts
// 5. 响应（原 slim 处理分支删除）
return processedResponse;
```

## 不变部分

- `Response` 接口及返回结构不变（默认返回完整 `processedResponse`）
- 拦截器接口不变
- 适配器接口不变
- 子方法签名 `(url, payload?, config?)` 不变