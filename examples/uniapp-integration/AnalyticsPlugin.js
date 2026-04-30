/**
 * =====================================================
 * uni-app 页面集成示例 - AnalyticsPlugin.js
 * =====================================================
 * 
 * 封装为 uni-app 插件，方便在项目中全局使用
 */

// 导入 SDK
import Analytics from '@/static/analytics-sdk/src/index.js';

// SDK 单例
let analyticsInstance = null;

// 插件配置
const defaultConfig = {
    appId: '',
    appName: '',
    appVersion: '1.0.0',
    serverUrl: 'https://api.ukcoder.com/st',
    enableLog: true,
    enableCrashReport: true,
    enableABTest: true,
    wifiImmediateReport: true,
    nonWifiInterval: 30000,
    batchSize: 10,
    maxCacheSize: 1000,
    encryptData: true,
    compressData: true
};

/**
 * 初始化分析插件
 * @param {Object} config 配置
 */
export function initAnalytics(config = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    
    // 从 manifest.json 获取应用信息（uni-app 特有）
    // #ifdef APP-PLUS
    const manifest = plus.runtime.version;
    finalConfig.appVersion = manifest;
    // #endif
    
    // 初始化 SDK
    analyticsInstance = Analytics.init(finalConfig);
    
    // 注册全局错误处理
    _registerGlobalErrorHandler();
    
    console.log('[Analytics] Plugin initialized');
}

/**
 * 获取分析实例
 * @returns {Object}
 */
export function getAnalytics() {
    return analyticsInstance;
}

/**
 * 注册全局错误处理
 * @private
 */
function _registerGlobalErrorHandler() {
    // #ifdef APP-PLUS
    // App 平台错误处理
    const app = getApp();
    
    if (app) {
        const originalOnError = app.onError;
        
        app.onError = (error) => {
            if (analyticsInstance) {
                analyticsInstance.crashHandler.handleError(error, 'app_uncaught');
            }
            
            if (originalOnError) {
                return originalOnError.call(app, error);
            }
        };
    }
    
    // 全局未捕获的 Promise 错误
    uni.addInterceptor('request', {
        fail: (err) => {
            console.error('[Analytics] Request error:', err);
        }
    });
    // #endif
    
    // #ifdef MP-WEIXIN
    // 微信小程序错误处理
    if (typeof wx !== 'undefined' && wx.onAppError) {
        wx.onAppError((error) => {
            if (analyticsInstance) {
                analyticsInstance.crashHandler.handleError(error, 'wechat_uncaught');
            }
        });
    }
    // #endif
}

/**
 * 页面浏览守卫
 * 用于自动追踪页面
 */
export function createPageGuard() {
    return {
        onLoad(query) {
            const page = getCurrentPages();
            const currentPage = page[page.length - 1];
            const route = '/' + (currentPage?.route || '');
            
            if (analyticsInstance) {
                analyticsInstance.trackPageView(route, { query });
            }
        },
        
        onShow() {
            // 页面展示时刷新会话
            if (analyticsInstance) {
                analyticsInstance.flush();
            }
        },
        
        onHide() {
            // 页面隐藏时触发数据上报
            if (analyticsInstance) {
                analyticsInstance.flush();
            }
        }
    };
}

/**
 * 自动追踪点击的Mixin
 */
export const AnalyticsMixin = {
    data() {
        return {
            // 标记是否已绑定点击事件
            _analyticsClickBound: false
        };
    },
    
    onReady() {
        this._bindAnalyticsClick();
    },
    
    methods: {
        // 绑定点击追踪
        _bindAnalyticsClick() {
            // #ifdef H5
            if (this._analyticsClickBound) return;
            
            this.$nextTick(() => {
                const page = document.querySelector('.uni-page');
                if (page) {
                    page.addEventListener('click', this._handleAnalyticsClick, true);
                    this._analyticsClickBound = true;
                }
            });
            // #endif
        },
        
        // 处理点击事件
        _handleAnalyticsClick(e) {
            const target = e.target;
            const elementId = target.id || target.dataset?.analyticsId || '';
            
            if (!elementId || !analyticsInstance) return;
            
            analyticsInstance.trackClick(elementId, {
                element_text: target.innerText || target.value || '',
                element_tag: target.tagName,
                position_x: e.clientX,
                position_y: e.clientY,
                page_name: this.$route?.path || ''
            });
        },
        
        // 手动追踪点击
        trackClick(elementId, data = {}) {
            if (analyticsInstance) {
                analyticsInstance.trackClick(elementId, {
                    ...data,
                    page_name: this.$route?.path || ''
                });
            }
        }
    }
};

/**
 * Vue 插件安装
 * @param {Vue} Vue Vue 实例
 * @param {Object} options 配置
 */
export function installAnalytics(Vue, options = {}) {
    // 初始化
    initAnalytics(options);
    
    // 全局混入
    Vue.mixin(AnalyticsMixin);
    
    // 全局方法
    Vue.prototype.$analytics = {
        track: (eventId, data) => analyticsInstance?.track(eventId, data),
        trackPageView: (pageName, data) => analyticsInstance?.trackPageView(pageName, data),
        trackClick: (elementId, data) => analyticsInstance?.trackClick(elementId, data),
        setUserId: (userId) => analyticsInstance?.setUserId(userId),
        setUserProperties: (properties) => analyticsInstance?.setUserProperties(properties),
        getABTestValue: (experimentId, defaultValue) => 
            analyticsInstance?.getABTestValue(experimentId, defaultValue),
        flush: () => analyticsInstance?.flush(),
        getDeviceId: () => analyticsInstance?.getDeviceId(),
        getSessionId: () => analyticsInstance?.getSessionId(),
        enableDebugMode: () => analyticsInstance?.enableDebugMode(),
        disableDebugMode: () => analyticsInstance?.disableDebugMode(),
        getCacheStats: () => analyticsInstance?.getCacheStats(),
        clearCache: () => analyticsInstance?.clearCache()
    };
}

// 导出默认配置
export { defaultConfig as analyticsConfig };

export default {
    install: installAnalytics,
    init: initAnalytics,
    getAnalytics,
    createPageGuard,
    AnalyticsMixin,
    analyticsConfig: defaultConfig
};
