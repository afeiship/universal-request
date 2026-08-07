# 老版本分析与改进

基于上一版本 `@jswork/next-abstract-request` 的实现经验，新版进行了以下改进。

---

## 老版本的优缺点分析

### ✅ 优点（值得保留）

1. **单例模式支持**：提供 `getInstance()` 和 `getSingleton()` 两种实例化方式
2. **自动方法生成**：通过字符串动态生成 get/post/put/delete 等方法
3. **多数据类型支持**：支持 json、urlencoded、multipart 等多种 Content-Type
4. **拦截器机制**：已有拦截器支持
5. **响应格式简化**：`slim` 配置可以简化响应数据
6. **错误容错**：`resolveAble` 配置可以让错误也 resolve

### ❌ 问题（需要改进）

1. **依赖过重**：依赖了 `@jswork/next` 及多个插件，包体积大
2. **没有 TypeScript**：纯 JS 实现，类型不安全
3. **拦截器不够清晰**：使用 `compose` 方式，不如 pipe 直观
4. **错误处理简陋**：没有统一的错误类型分类
5. **缺少超时处理**：没有内置 timeout 功能
6. **不支持取消请求**：没有 AbortController 支持
7. **抽象接口不明确**：子类需要实现 `httpRequest`，但参数和返回值定义不清晰
8. **配置设计混乱**：`transformRequest`、`transformResponse` 与拦截器功能重叠
9. **没有包结构**：单文件实现，难以维护和扩展

---

## 保留的优秀特性

### 1. 单例模式支持

```typescript
// 支持多实例和全局单例两种模式
const request1 = RequestCore.getInstance(config);
const request2 = RequestCore.getSingleton(config);
```

### 2. Slim 响应格式

```typescript
// 简化响应结构，只返回 status 和 data
request.get('/api', { slim: true });
// 返回: { status: 200, data: {...} }
```

### 3. ResolveAble 错误处理

```typescript
// 即使请求失败也 resolve，不 reject
request.get('/api', { resolveAble: true });
```

### 4. 多数据类型支持

```typescript
// 自动处理不同的 Content-Type
request.post('/api', data, { dataType: 'multipart' });
// 支持: json | urlencoded | multipart | text | blob
```

---

## 关键改进点

### 1. TypeScript 原生支持

- **老版本**：纯 JavaScript，无类型定义
- **新版本**：完整 TypeScript 实现，类型安全

### 2. 依赖极简化

- **老版本**：依赖 `@jswork/next` 及 6+ 个插件
- **新版本**：仅依赖 `@jswork/pipe`，其他功能自实现

```javascript
// 老版本依赖
import nx from '@jswork/next';
import '@jswork/next-stub-singleton';
import '@jswork/next-parse-request-args';
import '@jswork/next-interceptor';
import '@jswork/next-content-type';
import '@jswork/next-data-transform';

// 新版本依赖（极简）
import pipe from '@jswork/pipe';
```

### 3. 拦截器机制改进

- **老版本**：使用 `interceptor.compose()` 方式，不直观
- **新版本**：使用 `pipe.async()` 管道流，符合直觉

```javascript
// 老版本
interceptor.compose(config, 'request');
interceptor.compose(response, 'response');

// 新版本（更直观）
await requestInterceptors.execute(config);
await responseInterceptors.execute(response);
```

### 4. 错误处理增强

- **老版本**：简单的 try-catch，无错误分类
- **新版本**：统一 `RequestError` 类型，支持错误类型判断

```typescript
// 老版本
.catch((err) => {
  return resolveAble ? Promise.resolve(result) : Promise.reject(result);
});

// 新版本（更清晰）
class RequestError extends Error {
  type: ErrorType;  // NETWORK_ERROR | TIMEOUT_ERROR | HTTP_ERROR
  status?: number;
  response?: Response;
  
  isNetworkError(): boolean;
  isTimeoutError(): boolean;
}
```

### 5. 缺失功能补充

- **超时处理**：`timeout` 配置
- **请求取消**：`AbortController` 支持
- **配置优先级**：实例配置 < 请求配置

```typescript
// 1. 超时处理
request.get('/api', { timeout: 5000 });

// 2. 取消请求
const controller = new AbortController();
request.get('/api', { signal: controller.signal });
controller.abort();

// 3. 配置优先级
const request = new RequestCore({ timeout: 10000 });
request.get('/api', { timeout: 5000 }); // 使用 5000
```

### 6. 包结构优化

- **老版本**：单文件实现，难以扩展
- **新版本**：Core + Adapter 架构，易于扩展

```
// 老版本
packages/next-abstract-request/src/index.js  (单文件 99 行)

// 新版本
packages/
├── core/
│   ├── request-core.ts
│   ├── base-adapter.ts
│   ├── interceptor-manager.ts
│   ├── types.ts
│   └── errors.ts
├── adapters/
│   ├── fetch/
│   ├── axios/
│   └── mp-wx/
└── websites/
```

---

## 老版本核心实现代码

### 核心类结构

```javascript
const NxAbstractRequest = nx.declare('nx.AbstractRequest', {
  statics: nx.mix(null, { isGetStyle }, nx.stubSingleton()),
  methods: {
    init: function (inOptions) {
      this.opts = nx.mix(null, defaults, this.defaults(), inOptions);
      this.interceptor = new nx.Interceptor({ items: this.opts.interceptors });
      this.initClient();
    },
    
    initClient: function () {
      this.httpRequest = null;
      nx.error(MSG_IMPL);  // 子类必须实现
    },
    
    request: function (inMethod, inUrl, inData, inOptions) {
      // 处理请求配置
      const requestConfig = { url: inUrl, method: inMethod, headers, ...payload, ...options };
      
      // 执行拦截器
      const requestComposeConfig = interceptor.compose(requestTransformConfig, 'request');
      
      // 发送请求
      return this.httpRequest(lastRequestComposeConfig)
        .then(handleComposite)
        .catch((err) => {
          const { resolveAble } = this.opts;
          const result = handleComposite(err);
          return resolveAble ? Promise.resolve(result) : Promise.reject(result);
        });
    },
    
    // 自动生成 get/post/put/delete/head/options 方法
    'get,post,put,patch,delete,head,options': function (inMethod) {
      return function () {
        const inputArgs = [inMethod].concat(nx.slice(arguments));
        const args = nx.parseRequestArgs(inputArgs, true);
        return this.request.apply(this, args);
      };
    }
  }
});
```

### 测试用例示例

```javascript
// 自定义适配器
const MyRequest = nx.declare({
  extends: nx.AbstractRequest,
  methods: {
    initClient: function () {
      this.httpRequest = (inOptions) => {
        const { url, responseType, ...opts } = inOptions;
        return fetch(url, opts).then((original) => {
          const { ok, status } = original;
          const resType = ok ? responseType || 'json' : 'text';
          return original[resType]().then((data) => {
            return { status, data, original };
          });
        });
      };
    }
  }
});

// 使用
const client = MyRequest.getInstance();
const res = await client.get('https://api.github.com/users/afeiship');
console.log(res.data.login); // 'afeiship'
```

---

## 总结

老版本 `@jswork/next-abstract-request` 提供了良好的基础架构，包括单例模式、拦截器、多数据类型支持等。新版在此基础上进行了全面升级：

1. **架构升级**：从单文件到 Core + Adapter 架构
2. **技术栈升级**：从 JavaScript 到 TypeScript
3. **依赖优化**：从重度依赖到极简依赖
4. **功能完善**：补充超时、取消、错误分类等缺失功能
5. **开发体验**：完整的类型定义和清晰的接口设计

新版将保持老版本的易用性，同时提供更好的可维护性和扩展性。