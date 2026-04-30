/**
 * =====================================================
 * uni-app main.js 集成示例
 * =====================================================
 * 
 * 如何在 uni-app 项目中集成统计 SDK
 */

// #ifdef VUE3
import { createApp } from 'vue';
import App from './App.vue';

// 导入分析插件
import Analytics, { initAnalytics, installAnalytics } from '@/static/analytics-sdk/examples/uniapp-integration/AnalyticsPlugin.js';

const app = createApp(App);

// 初始化分析 SDK
initAnalytics({
    appId: 'your-app-id',
    appName: '你的应用名称',
    appVersion: '1.0.0',
    serverUrl: 'https://api.ukcoder.com/st',
    enableLog: true,  // 开发环境开启
    enableCrashReport: true,
    enableABTest: true
});

// 安装插件
app.use(installAnalytics);

app.mount('#app');

// #endif

// #ifdef VUE2
import Vue from 'vue';
import App from './App.vue';

// 导入分析插件
import Analytics, { initAnalytics, installAnalytics, AnalyticsMixin } from '@/static/analytics-sdk/examples/uniapp-integration/AnalyticsPlugin.js';

Vue.config.errorHandler = (err, vm, info) => {
    // 全局错误处理
    if (Analytics.crashHandler) {
        Analytics.crashHandler.handleError(err, 'vue_error', { info });
    }
};

// 初始化分析 SDK
initAnalytics({
    appId: 'your-app-id',
    appName: '你的应用名称',
    appVersion: '1.0.0',
    serverUrl: 'https://api.ukcoder.com/st',
    enableLog: true,
    enableCrashReport: true,
    enableABTest: true
});

// 安装插件
Vue.use(installAnalytics);

// 注册全局混入
Vue.mixin(AnalyticsMixin);

new Vue({
    onLaunch() {
        console.log('App Launch');
    },
    onShow() {
        console.log('App Show');
    },
    onHide() {
        console.log('App Hide');
        // 应用隐藏时触发数据上报
        if (Analytics.flush) {
            Analytics.flush();
        }
    }
}).$mount('#app');

// #endif
