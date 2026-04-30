# uniapp-analytics-sdk

一个功能完善的 uniapp 统计 SDK，支持微信小程序、H5、Android APK 和 iOS App。

## 功能特性

### 核心功能
- ✅ **通用事件追踪** - 自定义事件、页面浏览、点击、滚动等
- ✅ **生命周期监控** - 应用启动、前后台切换、页面路由
- ✅ **本地存储** - 加密存储、压缩存储、离线缓存
- ✅ **网络上报** - 批量上报、实时上报、离线恢复

### 设备信息采集
- ✅ **设备唯一标识 (GUID)** - 跨会话用户识别
- ✅ **用户 ID** - 业务用户标识
- ✅ **IMEI 采集** - Android 设备标识
- ✅ **设备基本信息** - 设备类型、操作系统、屏幕分辨率等

### 崩溃处理
- ✅ **崩溃信息立即上报** - 第一时间上报崩溃
- ✅ **用户操作路径** - 崩溃前的用户行为记录
- ✅ **设备状态快照** - 崩溃时的设备环境信息

### 数据处理
- ✅ **数据加密** - AES/Base64 加密传输
- ✅ **数据压缩** - LZString 压缩减少流量
- ✅ **批量上传** - 自动批量上报减少请求
- ✅ **离线缓存** - 网络断开时本地缓存

### 网络策略
- ✅ **WiFi 实时上报** - WiFi 环境即时发送
- ✅ **非 WiFi 间隔上报** - 非 WiFi 环境按间隔发送
- ✅ **离线数据收集** - 离线时收集数据
- ✅ **网络恢复上报** - 网络恢复后自动上报

### 其他功能
- ✅ **AB 测试** - 分组实验、权重分配
- ✅ **开发日志** - 实时查看日志便于调试
- ✅ **JSON 格式** - 统一 JSON 数据格式

## 目录结构

```
uniapp-analytics-sdk/
├── src/
│   ├── index.js              # SDK 入口
│   ├── config/
│   │   └── Config.js          # 配置管理
│   ├── core/
│   │   └── Core.js            # 核心管理模块
│   ├── events/
│   │   └── EventTracker.js    # 事件追踪模块
│   ├── crash/
│   │   └── CrashHandler.js    # 崩溃处理模块
│   ├── storage/
│   │   └── StorageManager.js  # 本地存储模块
│   ├── network/
│   │   └── NetworkManager.js  # 网络管理模块
│   ├── abtest/
│   │   └── ABTest.js          # AB测试模块
│   └── utils/
│       ├── DeviceInfo.js      # 设备信息采集
│       ├── Logger.js          # 日志模块
│       └── Utils.js           # 工具函数
├── examples/
│   └── UsageExample.js        # 使用示例
└── package.json
```

## 快速开始

### 安装

将 `src` 目录复制到你的 uniapp 项目中，或直接下载源码。

### 初始化

```javascript
import Analytics from '@/path/to/analytics-sdk/src/index.js';

// 初始化 SDK
Analytics.init({
    appId: 'your-app-id',
    appName: 'Your App Name',
    appVersion: '1.0.0',
    serverUrl: 'https://api.ukcoder.com/st',
    enableLog: true,
    enableCrashReport: true,
    enableABTest: true
});
```

### 追踪事件

```javascript
// 追踪自定义事件
Analytics.track('button_click', {
    button_id: 'btn_pay',
    page: '/order'
});

// 追踪页面浏览
Analytics.trackPageView('/home');

// 追踪点击
Analytics.trackClick('btn_buy', {
    product_id: 'P12345'
});
```

### 用户管理

```javascript
// 设置用户ID
Analytics.setUserId('user_123456');

// 设置用户属性
Analytics.setUserProperties({
    username: '张三',
    vip_level: 3
});
```

### AB 测试

```javascript
// 获取 AB 测试值
const buttonColor = await Analytics.getABTestValue('button_color', 'blue');
```

## API 文档

### init(options)

初始化 SDK。

**参数：**
- `appId` (string): 应用唯一标识
- `appName` (string): 应用名称
- `appVersion` (string): 应用版本
- `serverUrl` (string): 数据上报地址，默认 `https://api.ukcoder.com/st`
- `enableLog` (boolean): 是否开启日志，默认 `false`
- `enableCrashReport` (boolean): 是否开启崩溃上报，默认 `true`
- `enableABTest` (boolean): 是否开启 AB 测试，默认 `true`
- `wifiImmediateReport` (boolean): WiFi 下是否实时上报，默认 `true`
- `nonWifiInterval` (number): 非 WiFi 上报间隔，默认 `30000` ms
- `batchSize` (number): 批量上报数量，默认 `10`
- `maxCacheSize` (number): 最大缓存数量，默认 `1000`
- `encryptData` (boolean): 是否加密数据，默认 `true`
- `compressData` (boolean): 是否压缩数据，默认 `true`

### track(eventId, eventData)

追踪自定义事件。

```javascript
Analytics.track('purchase', {
    product_id: 'P12345',
    price: 99.99
});
```

### trackPageView(pageName, pageData)

追踪页面浏览。

```javascript
Analytics.trackPageView('/product/detail');
```

### trackClick(elementId, clickData)

追踪点击事件。

```javascript
Analytics.trackClick('btn_pay', {
    text: '立即支付'
});
```

### setUserId(userId)

设置用户 ID。

```javascript
Analytics.setUserId('user_123456');
```

### setUserProperties(userProperties)

设置用户属性。

```javascript
Analytics.setUserProperties({
    username: '张三',
    age: 25,
    vip_level: 3
});
```

### getABTestValue(experimentId, defaultValue)

获取 AB 测试值。

```javascript
const value = await Analytics.getABTestValue('experiment_001', 'control');
```

### flush()

手动触发数据上报。

```javascript
Analytics.flush();
```

### getDeviceId()

获取设备 ID。

```javascript
const deviceId = Analytics.getDeviceId();
```

### enableDebugMode() / disableDebugMode()

开启/关闭调试模式。

```javascript
Analytics.enableDebugMode();
Analytics.disableDebugMode();
```

## 数据上报格式

```json
{
    "version": "1.0",
    "request_id": "req_xxx",
    "timestamp": 1704067200000,
    "local_time": "2024-01-01T00:00:00.000Z",
    "app": {
        "id": "app-id",
        "name": "App Name",
        "version": "1.0.0"
    },
    "device": {
        "id": "device-id"
    },
    "events": [
        {
            "id": "event-id",
            "event_type": "custom",
            "event_sequence": 1,
            "timestamp": 1704067200000,
            "device_id": "device-id",
            "session_id": "session-id",
            "user_id": "user-id",
            "event_id": "custom_event",
            "data": {}
        }
    ]
}
```

## 崩溃报告格式

```json
{
    "id": "crash-id",
    "type": "crash_report",
    "timestamp": 1704067200000,
    "error": {
        "name": "Error",
        "message": "error message",
        "stack": "error stack",
        "type": "global"
    },
    "app": {
        "id": "app-id",
        "name": "App Name",
        "version": "1.0.0"
    },
    "device": {
        "id": "device-id",
        "type": "Android"
    },
    "device_state": {
        "memory": {},
        "performance": {},
        "network": {},
        "page": {}
    },
    "action_path": [
        {
            "page": "/home",
            "timestamp": 1704067100000
        }
    ],
    "environment": {
        "platform": "H5",
        "environment": "production"
    }
}
```

## 平台支持

| 平台 | 支持状态 | 说明 |
|------|----------|------|
| H5 | ✅ 完全支持 | 浏览器环境 |
| 微信小程序 | ✅ 完全支持 | 微信小程序 |
| Android App | ✅ 完全支持 | uni-app Android |
| iOS App | ✅ 完全支持 | uni-app iOS |

## 条件编译

SDK 使用 uni-app 的条件编译实现跨平台：

```javascript
// #ifdef H5
// 仅在 H5 环境编译
// #endif

// #ifdef MP-WEIXIN
// 仅在微信小程序环境编译
// #endif

// #ifdef APP-PLUS
// 仅在 App 环境编译
// #endif
```

## 注意事项

1. **首次使用**：确保在应用启动时调用 `init()` 方法
2. **用户 ID**：建议在用户登录成功后调用 `setUserId()`
3. **调试模式**：生产环境请关闭日志 (`enableLog: false`)
4. **网络环境**：非 WiFi 环境下会自动调整上报策略
5. **崩溃上报**：建议保持开启，便于问题排查

## License

MIT
