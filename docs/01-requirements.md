# requirements

# 项目名：universal‑request
## desc: Cross‑platform request lib with extendable base adapter.

## 需求背景
我是前端开发，需要同时开发多端项目：Web、微信小程序、React Native。
各平台原生网络API不一样：
1. Web：fetch / axios
2. 微信小程序：wx.request
3. React Native：fetch

期望实现**一套统一调用语法**，通过切换适配器适配不同运行平台，业务代码不需要改动。
整体分为两层架构：`core` 核心层 + `adapter` 适配器层。

## 架构分层说明
1. **core 核心层**
- 提供通用能力：请求拦截器、响应拦截器、超时处理、请求取消、公共默认配置、错误标准化、参数格式化。
- 对外暴露统一请求实例与调用API。
- core 不直接发起网络，把真正网络转发交给 adapter。
- core 提供 `BaseAdapter` 基础抽象适配器类。

2. **adapter 适配器层**
- 所有平台适配器继承/extend `BaseAdapter`，只需要实现少量平台专属底层网络方法，就自动复用 core 封装好的通用能力。
- axios、fetch、wx.request、RN‑fetch 全部作为独立适配器实现，core 内部不做平台判断。
- 用户自定义适配器：只需要继承 `BaseAdapter`，实现极少平台特定逻辑，即可拥有完整请求库能力，降低自定义适配器开发成本。

## 核心设计要求
1. 采用适配器模式，core 和 adapter 严格解耦。
2. `BaseAdapter` 是抽象基类，定义适配器标准接口；内置通用工具逻辑，子类只重写平台网络发送方法即可。
3. 内置提供官方适配器实现：
    - fetchAdapter（web / react‑native）
    - axiosAdapter（web）
    - mpWxAdapter（微信小程序 wx.request）
4. 用户可以很简单 extend BaseAdapter，快速实现自己的自定义适配器，适配更多未知环境。
5. 对外业务调用语法完全统一，底层切换adapter上层业务无感知，返回统一 Promise。
6. 支持：请求拦截、响应拦截、超时、abort取消请求、全局默认配置、统一错误对象封装。
7. 使用 TypeScript，完整类型定义；BaseAdapter、各适配器都要有严格接口约束。

## 依赖约束
- core 核心包不依赖 axios、小程序、RN API；依赖全部下沉到各个 adapter。
- core 只定义抽象契约，adapter 引入对应平台API/第三方库。

## 需要输出内容
1. 目录结构：区分 core/、adapter/ 文件夹
2. core：RequestCore 核心类、BaseAdapter 抽象基类、公共类型定义、拦截器、错误处理
3. 各个内置 adapter 实现，全部继承 BaseAdapter
4. 使用示例：
    - web 使用 fetch-adapter
    - web 使用 axios-adapter
    - 小程序使用 mpWx-adapter
    - RN 使用 fetch-adapter
    - 用户自定义适配器示例：extend BaseAdapter，只实现少量方法完成适配
5. 完整可运行 TS 代码，附带注释。