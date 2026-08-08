# 拦截器包简化语法设计

日期：2026-08-08
状态：已批准

## 背景

当前拦截器包的使用方式需要调用工厂函数：

```ts
import { createLoggerInterceptor } from '@jswork/universal-request-interceptor-logger';

interceptors: [
  createLoggerInterceptor()  // 大部分拦截器无选项，() 显得冗余
]
```

对于大多数没有 options 的使用场景，用户期望更简洁的语法。

## 方案

### 拦截器包

每个拦截器包只导出工厂函数 `createXxxInterceptor`。

```ts
export function createLoggerInterceptor(options?: LoggerInterceptorOptions): UnifiedInterceptor { ... }
```

### 框架层面

`RequestCoreConfig.interceptors` 的类型扩展为支持函数形态：

```ts
interceptors?: (UnifiedInterceptor | (() => UnifiedInterceptor))[];
```

在 `RequestCore` 构造时检测每个元素：

- 如果是函数，调用它获取拦截器对象
- 如果是对象，直接使用

### 使用方式

```ts
// 简洁模式（无 options）— 传函数引用，框架自动调用
import { createLoggerInterceptor } from '@jswork/universal-request-interceptor-logger';

interceptors: [createLoggerInterceptor]   // 不需要加 ()

// 自定义模式（有 options）
import { createLoggerInterceptor } from '@jswork/universal-request-interceptor-logger';

interceptors: [createLoggerInterceptor({ prefix: '[API]' })]
```

## 命名约定

所有拦截器包统一使用工厂函数命名：`create<Name>Interceptor`。

| 包名 | 导出 |
|------|------|
| `@jswork/universal-request-interceptor-logger` | `createLoggerInterceptor` |
| `@jswork/universal-request-interceptor-auth` | `createAuthInterceptor` |
| 其他 | `createXxxInterceptor` |

## 改动范围

### 类型（`types.ts`）
- 新增 `InterceptorLike` 类型：`UnifiedInterceptor | (() => UnifiedInterceptor)`
- `RequestCoreConfig.interceptors` 类型改为 `InterceptorLike[]`

### 核心（`request-core.ts`）
- 构造时遍历 `interceptors`，检测每个元素类型，函数则调用后 `use`

### Logger 包（`interceptors/logger/src/index.ts`）
- 保留 `LoggerInterceptorOptions` 和 `createLoggerInterceptor`

### Playground（`instance.ts`）
- 改用 `createLoggerInterceptor` 传函数引用