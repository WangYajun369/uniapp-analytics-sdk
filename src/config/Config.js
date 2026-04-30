/**
 * =====================================================
 * 配置管理模块 - AnalyticsConfig
 * =====================================================
 * 
 * 功能说明：
 * - 管理 SDK 的所有配置项
 * - 支持运行时动态修改配置
 * - 提供配置校验和默认值处理
 * 
 * 配置项分类：
 * 1. 应用信息配置
 * 2. 上报策略配置
 * 3. 功能开关配置
 * 4. 调试配置
 */

export class AnalyticsConfig {
    /**
     * 构造函数
     * @param {Object} options 配置选项
     */
    constructor(options = {}) {
        // 应用基本信息
        this.appId = options.appId || '';                    // 应用唯一标识
        this.appName = options.appName || '';                // 应用名称
        this.appVersion = options.appVersion || '1.0.0';      // 应用版本号
        
        // 服务器配置
        // 注意：正式环境请替换为真实的上报地址
        this.serverUrl = options.serverUrl || 'YOUR_SERVER_URL/st';  // 数据上报地址
        
        // 调试配置
        this.enableLog = options.enableLog || false;          // 是否开启日志
        
        // 功能开关
        this.enableCrashReport = options.enableCrashReport !== false;  // 是否开启崩溃上报
        this.enableABTest = options.enableABTest !== false;            // 是否开启AB测试
        this.enableDebugView = options.enableDebugView || false;        // 是否开启调试视图
        
        // 事件追踪配置
        this.trackPageView = options.trackPageView !== false;   // 是否自动跟踪页面
        this.trackClick = options.trackClick || false;          // 是否自动跟踪点击
        this.trackScroll = options.trackScroll || false;       // 是否自动跟踪滚动
        this.trackComponents = options.trackComponents || [];  // 需要追踪的组件列表
        
        // 上报策略配置
        this.wifiImmediateReport = options.wifiImmediateReport !== false;  // WiFi下实时上报
        this.nonWifiInterval = options.nonWifiInterval || 30000;          // 非WiFi上报间隔(ms)
        this.batchSize = options.batchSize || 10;                        // 批量上报数量
        this.maxQueueSize = options.maxQueueSize || 100;                 // 最大队列长度
        this.maxCacheSize = options.maxCacheSize || 1000;                // 最大缓存数量
        
        // 数据处理配置
        this.encryptData = options.encryptData !== false;    // 是否加密数据
        this.compressData = options.compressData !== false;  // 是否压缩数据
        this.encryptionKey = options.encryptionKey || '';    // 加密密钥
        
        // 会话配置
        this.sessionTimeout = options.sessionTimeout || 30000;  // 会话超时时间(ms)
        this.autoSession = options.autoSession !== false;        // 是否自动管理会话
        
        // 崩溃配置
        this.crashMaxHistory = options.crashMaxHistory || 50;    // 崩溃历史最大保存数
        
        // AB测试配置
        this.abTestRefreshInterval = options.abTestRefreshInterval || 3600000;  // AB测试刷新间隔(ms)
        
        // 页面追踪配置
        this.pageViewDebounce = options.pageViewDebounce || 300;  // 页面浏览防抖时间(ms)
        
        // 验证配置
        this._validate();
    }

    /**
     * 验证配置项
     * @private
     */
    _validate() {
        // appId 是必填项
        if (!this.appId) {
            console.warn('[AnalyticsConfig] appId is required but not provided');
        }
        
        // 验证 serverUrl 格式
        if (this.serverUrl && !this._isValidUrl(this.serverUrl)) {
            console.warn('[AnalyticsConfig] serverUrl format is invalid');
        }
        
        // 验证数值范围
        if (this.batchSize < 1 || this.batchSize > 100) {
            console.warn('[AnalyticsConfig] batchSize should be between 1 and 100');
            this.batchSize = Math.max(1, Math.min(100, this.batchSize));
        }
        
        if (this.nonWifiInterval < 1000) {
            console.warn('[AnalyticsConfig] nonWifiInterval should be at least 1000ms');
            this.nonWifiInterval = 1000;
        }
    }

    /**
     * 验证URL格式
     * @param {string} url URL字符串
     * @returns {boolean}
     * @private
     */
    _isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 更新配置
     * @param {Object} newOptions 新的配置项
     */
    update(newOptions) {
        Object.keys(newOptions).forEach(key => {
            if (key in this) {
                this[key] = newOptions[key];
            }
        });
        this._validate();
    }

    /**
     * 获取当前配置
     * @returns {Object}
     */
    getConfig() {
        return { ...this };
    }

    /**
     * 重置为默认配置
     */
    reset() {
        const defaultOptions = {
            appId: '',
            appName: '',
            appVersion: '1.0.0',
            // 注意：正式环境请替换为真实的上报地址
            serverUrl: 'YOUR_SERVER_URL/st',
            enableLog: false,
            enableCrashReport: true,
            enableABTest: true,
            enableDebugView: false,
            trackPageView: true,
            trackClick: false,
            trackScroll: false,
            trackComponents: [],
            wifiImmediateReport: true,
            nonWifiInterval: 30000,
            batchSize: 10,
            maxQueueSize: 100,
            maxCacheSize: 1000,
            encryptData: true,
            compressData: true,
            encryptionKey: '',
            sessionTimeout: 30000,
            autoSession: true,
            crashMaxHistory: 50,
            abTestRefreshInterval: 3600000,
            pageViewDebounce: 300
        };
        
        Object.keys(defaultOptions).forEach(key => {
            this[key] = defaultOptions[key];
        });
    }
}

export default AnalyticsConfig;
