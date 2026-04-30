/**
 * =====================================================
 * uniapp-analytics-sdk 使用示例
 * =====================================================
 * 
 * 本文件展示 SDK 的各种使用方法
 */

import Analytics from '../src/index';

// ============================================
// 1. 初始化 SDK
// ============================================

// 基础初始化
Analytics.init({
    appId: 'your-app-id',
    appName: 'Your App Name',
    appVersion: '1.0.0',
    serverUrl: 'https://api.ukcoder.com/st',
    enableLog: true,              // 开发环境开启日志
    enableCrashReport: true,      // 开启崩溃上报
    enableABTest: true,           // 开启 AB 测试
    wifiImmediateReport: true,    // WiFi 下实时上报
    nonWifiInterval: 30000,        // 非 WiFi 下 30 秒上报一次
    batchSize: 10,                // 批量上报数量
    maxCacheSize: 1000,           // 最大缓存数量
    encryptData: true,            // 加密数据
    compressData: true           // 压缩数据
});

// ============================================
// 2. 追踪自定义事件
// ============================================

// 简单事件
Analytics.track('button_click');

// 带参数的事件
Analytics.track('purchase', {
    product_id: 'P12345',
    product_name: 'Premium Package',
    price: 99.99,
    currency: 'CNY',
    quantity: 1
});

// ============================================
// 3. 追踪用户行为
// ============================================

// 页面浏览
Analytics.trackPageView('/home');
Analytics.trackPageView('/product/detail', {
    product_id: 'P12345',
    category: 'Electronics'
});

// 点击事件
Analytics.trackClick('btn_pay', {
    text: '立即支付',
    pageName: '/order/checkout'
});

// 滚动事件
Analytics.trackScroll({
    depth: 75,           // 滚动深度百分比
    pageName: '/article/detail'
});

// ============================================
// 4. 用户管理
// ============================================

// 设置用户 ID
Analytics.setUserId('user_123456');

// 设置用户属性
Analytics.setUserProperties({
    username: '张三',
    age: 25,
    gender: 'male',
    vip_level: 3,
    register_time: '2024-01-01',
    preferences: {
        theme: 'dark',
        language: 'zh-CN'
    }
});

// ============================================
// 5. AB 测试
// ============================================

// 获取 AB 测试值
async function getABTestValue() {
    // 获取实验值，默认为 'control'
    const buttonColor = await Analytics.getABTestValue('button_color_experiment', 'blue');
    
    console.log('Button color:', buttonColor);
    
    // 根据实验值执行不同逻辑
    if (buttonColor === 'red') {
        // 红色按钮逻辑
    } else if (buttonColor === 'blue') {
        // 蓝色按钮逻辑
    }
}

// ============================================
// 6. 会话管理
// ============================================

// 开始新会话
Analytics.startSession();

// 结束当前会话
Analytics.endSession();

// 获取当前会话 ID
const sessionId = Analytics.getSessionId();

// ============================================
// 7. 数据管理
// ============================================

// 手动触发数据上报
Analytics.flush();

// 获取缓存统计
const stats = Analytics.getCacheStats();
console.log('Cache stats:', stats);

// 获取崩溃历史
async function getCrashHistory() {
    const crashes = await Analytics.getCrashHistory();
    console.log('Crash history:', crashes);
}

// 清除本地缓存
Analytics.clearCache();

// ============================================
// 8. 调试功能
// ============================================

// 开启调试模式
Analytics.enableDebugMode();

// 关闭调试模式
Analytics.disableDebugMode();

// ============================================
// 9. 获取设备信息
// ============================================

// 获取设备 ID
const deviceId = Analytics.getDeviceId();
console.log('Device ID:', deviceId);

// ============================================
// 10. 条件编译示例
// ============================================

// #ifdef H5
console.log('Running on H5 platform');
// #endif

// #ifdef MP-WEIXIN
console.log('Running on Wechat Mini Program');
// #endif

// #ifdef APP-PLUS
console.log('Running on App platform');
// #endif

// ============================================
// 11. 在页面中使用（Vue 页面示例）
// ============================================

/*
<template>
  <div class="container">
    <button @click="handleBuy">购买</button>
  </div>
</template>

<script>
export default {
  methods: {
    handleBuy() {
      // 追踪购买按钮点击
      Analytics.track('purchase_button_click', {
        page: '/product/detail',
        product_id: this.productId
      });
      
      // 跳转到支付页面
      uni.navigateTo({
        url: '/pages/order/pay'
      });
    }
  },
  
  onShow() {
    // 页面显示时追踪页面浏览
    Analytics.trackPageView('/pages/index/index');
  },
  
  onHide() {
    // 页面隐藏时触发刷新
    Analytics.flush();
  }
}
</script>
*/

// ============================================
// 12. 微信小程序 App.js 示例
// ============================================

/*
import Analytics from '@/path/to/uniapp-analytics-sdk';

// App.js
App({
  onLaunch(options) {
    // 初始化 SDK
    Analytics.init({
      appId: 'wx-app-id',
      appName: '小程序名称',
      appVersion: '1.0.0',
      enableLog: true
    });
  },
  
  onShow(options) {
    // 处理从后台进入前台
  },
  
  onHide() {
    // 触发数据上报
    Analytics.flush();
  }
});
*/

// ============================================
// 13. 崩溃追踪示例
// ============================================

// 自动崩溃捕获已配置，以下是手动上报错误的方式

try {
    // 业务逻辑
    throw new Error('测试错误');
} catch (error) {
    // 手动上报错误
    if (typeof Analytics.crashHandler !== 'undefined') {
        Analytics.crashHandler.handleError(error, 'manual_catch');
    }
}

// ============================================
// 14. 完整的事件属性示例
// ============================================

// 带完整属性的事件
Analytics.track('search', {
    // 搜索信息
    search_keyword: 'iPhone 15',
    search_results_count: 120,
    search_filter: {
        brand: 'Apple',
        price_range: '5000-10000'
    },
    
    // 用户信息
    user_id: 'user_123456',
    user_tier: 'vip',
    
    // 设备信息
    device_id: Analytics.getDeviceId(),
    network_type: 'wifi',
    
    // 页面上下文
    page_name: '/search',
    referrer: '/home',
    
    // 时间信息
    timestamp: Date.now()
});

export default {
    getABTestValue,
    getCrashHistory
};
