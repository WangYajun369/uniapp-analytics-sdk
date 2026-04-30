/**
 * =====================================================
 * uniapp-analytics-sdk 统计 SDK
 * =====================================================
 * 
 * 支持平台：
 * - 微信小程序 (Wechat Mini Program)
 * - H5 浏览器
 * - Android APK (通过 uni-app条件编译)
 * - iOS App (通过 uni-app条件编译)
 * 
 * 核心功能：
 * 1. 通用事件及自定义事件收集
 * 2. 页面和应用生命周期监控
 * 3. 本地存储（加密存储）
 * 4. 网络数据上报（批量、压缩、加密）
 * 5. 崩溃信息收集与上报
 * 6. AB 测试分组
 * 7. 开发日志查看
 * 8. 智能网络状态判断与上报策略
 * 
 * @version 1.0.0
 * @author uniapp-analytics-sdk
 */

import { AnalyticsCore } from './core/Core';
import { AnalyticsConfig } from './config/Config';
import { EventTracker } from './events/EventTracker';
import { CrashHandler } from './crash/CrashHandler';
import { StorageManager } from './storage/StorageManager';
import { NetworkManager } from './network/NetworkManager';
import { ABTest } from './abtest/ABTest';
import { DeviceInfo } from './utils/DeviceInfo';
import { Logger } from './utils/Logger';

// 导出所有模块
export {
    AnalyticsCore,
    AnalyticsConfig,
    EventTracker,
    CrashHandler,
    StorageManager,
    NetworkManager,
    ABTest,
    DeviceInfo,
    Logger
};

// 默认配置
const defaultConfig = {
    appId: '',                    // 应用唯一标识
    appName: '',                  // 应用名称
    appVersion: '',               // 应用版本
    // 注意：正式环境请替换为真实的上报地址，例如: https://api.ukcoder.com/st
    serverUrl: 'YOUR_SERVER_URL/st',  // 数据上报地址
    enableLog: true,              // 是否开启日志（开发环境默认开启）
    enableCrashReport: true,      // 是否开启崩溃上报
    enableABTest: true,           // 是否开启AB测试
    wifiImmediateReport: true,   // WiFi下实时上报
    nonWifiInterval: 30000,      // 非WiFi下上报间隔（毫秒）
    batchSize: 10,                // 批量上报数量
    maxCacheSize: 1000,          // 最大缓存数量
    encryptData: true,           // 是否加密数据
    compressData: true,          // 是否压缩数据
    sessionTimeout: 30000,       // 会话超时时间（毫秒）
    trackPageView: true,         // 是否自动跟踪页面
    trackClick: false,           // 是否自动跟踪点击
    trackScroll: false,          // 是否自动跟踪滚动
};

// SDK 主类
class AnalyticsSDK {
    constructor() {
        this.core = null;
        this.config = null;
        this.eventTracker = null;
        this.crashHandler = null;
        this.storage = null;
        this.network = null;
        this.abtest = null;
        this.deviceInfo = null;
        this.logger = null;
        this.initialized = false;
    }

    /**
     * 初始化 SDK
     * @param {Object} options 配置选项
     * @param {string} options.appId 应用唯一标识（必填）
     * @param {string} options.appName 应用名称
     * @param {string} options.appVersion 应用版本
     * @param {string} options.serverUrl 数据上报地址
     * @param {boolean} options.enableLog 是否开启日志
     * @param {boolean} options.enableCrashReport 是否开启崩溃上报
     * @param {boolean} options.enableABTest 是否开启AB测试
     * @param {boolean} options.wifiImmediateReport WiFi下是否实时上报
     * @param {number} options.nonWifiInterval 非WiFi下上报间隔
     * @param {number} options.batchSize 批量上报数量
     * @param {number} options.maxCacheSize 最大缓存数量
     * @param {boolean} options.encryptData 是否加密数据
     * @param {boolean} options.compressData 是否压缩数据
     * @returns {Promise<AnalyticsSDK>}
     */
    init(options = {}) {
        if (this.initialized) {
            this.logger?.warn('SDK already initialized');
            return Promise.resolve(this);
        }

        // 合并配置
        const finalConfig = { ...defaultConfig, ...options };
        
        // 创建配置管理器
        this.config = new AnalyticsConfig(finalConfig);
        
        // 创建日志管理器
        this.logger = new Logger(this.config.enableLog);
        this.logger.info('Analytics SDK initializing...');
        
        // 创建设备信息采集器
        this.deviceInfo = new DeviceInfo();
        
        // 创建本地存储管理器
        this.storage = new StorageManager(this.config, this.logger);
        
        // 创建网络管理器
        this.network = new NetworkManager(this.config, this.logger, this.storage);
        
        // 创建事件追踪器
        this.eventTracker = new EventTracker(this.config, this.logger, this.storage, this.deviceInfo);
        
        // 创建崩溃处理器
        this.crashHandler = new CrashHandler(this.config, this.logger, this.storage, this.network);
        
        // 创建AB测试管理器
        this.abtest = new ABTest(this.config, this.logger, this.storage);
        
        // 创建核心管理器
        this.core = new AnalyticsCore(
            this.config,
            this.logger,
            this.deviceInfo,
            this.storage,
            this.network,
            this.eventTracker,
            this.crashHandler,
            this.abtest
        );

        // 初始化所有模块
        return this.core.init().then(() => {
            this.initialized = true;
            this.logger.info('Analytics SDK initialized successfully');
            return this;
        });
    }

    /**
     * 追踪自定义事件
     * @param {string} eventId 事件ID
     * @param {Object} eventData 事件数据
     */
    track(eventId, eventData = {}) {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return;
        }
        this.eventTracker.track(eventId, eventData);
    }

    /**
     * 追踪页面浏览
     * @param {string} pageName 页面名称
     * @param {Object} pageData 页面数据
     */
    trackPageView(pageName, pageData = {}) {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return;
        }
        this.eventTracker.trackPageView(pageName, pageData);
    }

    /**
     * 追踪用户点击
     * @param {string} elementId 元素ID
     * @param {Object} clickData 点击数据
     */
    trackClick(elementId, clickData = {}) {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return;
        }
        this.eventTracker.trackClick(elementId, clickData);
    }

    /**
     * 追踪用户滚动
     * @param {Object} scrollData 滚动数据
     */
    trackScroll(scrollData = {}) {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return;
        }
        this.eventTracker.trackScroll(scrollData);
    }

    /**
     * 设置用户ID
     * @param {string} userId 用户ID
     */
    setUserId(userId) {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return;
        }
        this.eventTracker.setUserId(userId);
        this.storage.set('user_id', userId);
    }

    /**
     * 设置用户属性
     * @param {Object} userProperties 用户属性
     */
    setUserProperties(userProperties) {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return;
        }
        this.eventTracker.setUserProperties(userProperties);
        this.storage.set('user_properties', userProperties);
    }

    /**
     * 获取AB测试分组
     * @param {string} experimentId 实验ID
     * @param {*} defaultValue 默认值
     * @returns {Promise<*>}
     */
    async getABTestValue(experimentId, defaultValue = null) {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return defaultValue;
        }
        return this.abtest.getValue(experimentId, defaultValue);
    }

    /**
     * 获取设备ID (GUID)
     * @returns {string}
     */
    getDeviceId() {
        return this.deviceInfo.getDeviceId();
    }

    /**
     * 获取当前会话ID
     * @returns {string}
     */
    getSessionId() {
        return this.core?.getSessionId() || '';
    }

    /**
     * 开始新会话
     */
    startSession() {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return;
        }
        this.core.startSession();
    }

    /**
     * 结束当前会话
     */
    endSession() {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return;
        }
        this.core.endSession();
    }

    /**
     * 手动触发数据上报
     */
    flush() {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return;
        }
        this.network.flush();
    }

    /**
     * 获取崩溃历史
     * @returns {Promise<Array>}
     */
    async getCrashHistory() {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return [];
        }
        return this.crashHandler.getCrashHistory();
    }

    /**
     * 清除本地缓存数据
     */
    clearCache() {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return;
        }
        this.storage.clearAll();
    }

    /**
     * 获取缓存数据统计
     * @returns {Object}
     */
    getCacheStats() {
        if (!this.initialized) {
            this.logger?.warn('SDK not initialized, call init() first');
            return {};
        }
        return this.storage.getStats();
    }

    /**
     * 开启调试模式
     */
    enableDebugMode() {
        if (this.logger) {
            this.logger.setEnable(true);
        }
        if (this.config) {
            this.config.enableLog = true;
        }
    }

    /**
     * 关闭调试模式
     */
    disableDebugMode() {
        if (this.logger) {
            this.logger.setEnable(false);
        }
        if (this.config) {
            this.config.enableLog = false;
        }
    }
}

// 创建单例实例
const analyticsInstance = new AnalyticsSDK();

// 导出单例
export default analyticsInstance;

// 导出类供需要创建多实例的场景使用
export { AnalyticsSDK };
