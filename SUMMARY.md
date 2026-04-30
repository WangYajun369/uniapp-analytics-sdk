# uniapp-analytics-sdk 统计 SDK 实现总结

## 📁 目录结构

```
uniapp-analytics-sdk/
├── src/
│   ├── index.js              # SDK 入口文件，统一导出
│   ├── config/
│   │   └── Config.js         # 配置管理模块
│   ├── core/
│   │   └── Core.js           # 核心管理模块（初始化、会话、生命周期）
│   ├── events/
│   │   └── EventTracker.js   # 事件追踪模块
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
│   ├── UsageExample.js        # 使用示例
│   └── uniapp-integration/   # uni-app 集成示例
├── package.json
└── README.md
```

## ✅ 已实现功能

### 1. 通用事件追踪
- ✅ 自定义事件追踪 `track(eventId, data)`
- ✅ 页面浏览追踪 `trackPageView(pageName, data)`
- ✅ 点击事件追踪 `trackClick(elementId, data)`
- ✅ 滚动事件追踪 `trackScroll(data)`

### 2. 生命周期监控
- ✅ 应用启动/显示/隐藏监控
- ✅ 页面进入/离开/切换监控
- ✅ 会话管理（自动创建/超时检测）

### 3. 本地存储
- ✅ 跨平台存储支持（localStorage/uniStorage/plus.storage）
- ✅ 数据加密（Base64 + XOR）
- ✅ 数据压缩（LZString）
- ✅ 存储配额管理
- ✅ 离线数据缓存

### 4. 网络上报
- ✅ JSON 格式数据上报
- ✅ 批量上报（达到指定数量自动上报）
- ✅ 数据加密与压缩
- ✅ 上报地址：`https://api.ukcoder.com/st`

### 5. 设备信息采集
- ✅ GUID/设备ID生成与存储
- ✅ 用户ID设置与追踪
- ✅ IMEI采集（Android）
- ✅ 设备类型、操作系统、屏幕分辨率
- ✅ 网络类型检测

### 6. 崩溃统计
- ✅ 立即尝试上报崩溃数据
- ✅ 收集崩溃前的用户操作路径
- ✅ 收集崩溃时的设备状态信息
- ✅ 本地崩溃历史存储

### 7. 智能上报策略
- ✅ WiFi环境下实时上报
- ✅ 非WiFi环境按间隔时间上报
- ✅ 离线数据收集
- ✅ 网络恢复后自动上报离线数据

### 8. AB测试
- ✅ 用户哈希分组
- ✅ 分组权重配置
- ✅ 分组结果缓存
- ✅ 定时刷新配置

### 9. 开发调试
- ✅ 日志分级（DEBUG/INFO/WARN/ERROR）
- ✅ 彩色控制台输出
- ✅ 日志导出与下载
- ✅ 实时日志回调

## 🔧 平台支持

| 平台 | 条件编译标识 | 支持状态 |
|------|-------------|----------|
| H5 | `#ifdef H5` | ✅ 完全支持 |
| 微信小程序 | `#ifdef MP-WEIXIN` | ✅ 完全支持 |
| Android App | `#ifdef APP-PLUS` | ✅ 完全支持 |
| iOS App | `#ifdef APP-PLUS` | ✅ 完全支持 |

## 📊 数据上报格式

### 普通事件
```json
{
    "id": "event_id",
    "event_type": "custom",
    "timestamp": 1704067200000,
    "device_id": "device_guid",
    "session_id": "session_id",
    "user_id": "user_id",
    "app_id": "app_id",
    "event_id": "custom_event",
    "network_type": "wifi"
}
```

### 崩溃报告
```json
{
    "id": "crash_id",
    "type": "crash_report",
    "error": {
        "name": "Error",
        "message": "error message",
        "stack": "error stack",
        "type": "global"
    },
    "action_path": [...],
    "device_state": {...}
}
```

## 🚀 使用方式

```javascript
import Analytics from '@/path/to/analytics-sdk/src/index.js';

// 初始化
Analytics.init({
    appId: 'your-app-id',
    appName: 'Your App',
    serverUrl: 'https://api.ukcoder.com/st'
});

// 追踪事件
Analytics.track('button_click', { button_id: 'btn_pay' });
Analytics.trackPageView('/home');

// 设置用户
Analytics.setUserId('user_123');
```
