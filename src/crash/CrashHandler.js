/**
 * =====================================================
 * 崩溃处理模块 - CrashHandler
 * =====================================================
 * 
 * 功能说明：
 * - 捕获并收集崩溃信息
 * - 收集崩溃前的用户操作路径
 * - 收集崩溃时的设备状态信息
 * - 立即尝试上报崩溃数据
 * - 本地存储崩溃历史
 */

export class CrashHandler {
    /**
     * 构造函数
     * @param {AnalyticsConfig} config 配置管理器
     * @param {Logger} logger 日志管理器
     * @param {StorageManager} storage 本地存储管理器
     * @param {NetworkManager} network 网络管理器
     */
    constructor(config, logger, storage, network) {
        this.config = config;
        this.logger = logger;
        this.storage = storage;
        this.network = network;
        
        // 崩溃历史记录
        this.crashHistory = [];
        
        // 用户操作路径（最近N次操作）
        this.userActionPath = [];
        this.maxActionPathLength = 50;
        
        // 崩溃时设备状态快照
        this.deviceStateSnapshot = {};
        
        // 崩溃处理器引用（用于撤销）
        this.originalErrorHandler = null;
        this.originalUnhandledRejectionHandler = null;
        
        // 崩溃上报配置
        this.crashReportImmediate = true;  // 崩溃立即上报
    }

    /**
     * 初始化崩溃处理器
     * @returns {Promise<void>}
     */
    async init() {
        this.logger.info('Initializing crash handler...');
        
        // 加载崩溃历史
        await this._loadCrashHistory();
        
        // 注册崩溃处理器
        this._registerCrashHandlers();
        
        // 加载用户操作路径
        this._loadUserActionPath();
        
        this.logger.info(`Crash handler initialized, loaded ${this.crashHistory.length} crash records`);
    }

    /**
     * 加载崩溃历史
     * @private
     */
    async _loadCrashHistory() {
        const savedHistory = this.storage.get('crash_history');
        if (savedHistory && Array.isArray(savedHistory)) {
            this.crashHistory = savedHistory;
        }
    }

    /**
     * 保存崩溃历史
     * @private
     */
    _saveCrashHistory() {
        // 限制历史记录数量
        if (this.crashHistory.length > this.config.crashMaxHistory) {
            this.crashHistory = this.crashHistory.slice(-this.config.crashMaxHistory);
        }
        
        this.storage.set('crash_history', this.crashHistory);
    }

    /**
     * 加载用户操作路径
     * @private
     */
    _loadUserActionPath() {
        const savedPath = this.storage.get('user_action_path');
        if (savedPath && Array.isArray(savedPath)) {
            this.userActionPath = savedPath;
        }
    }

    /**
     * 保存用户操作路径
     * @private
     */
    _saveUserActionPath() {
        this.storage.set('user_action_path', this.userActionPath);
    }

    /**
     * 注册崩溃处理器
     * @private
     */
    _registerCrashHandlers() {
        // H5 平台
        // #ifdef H5
        this._registerH5Handlers();
        // #endif
        
        // 微信小程序平台
        // #ifdef MP-WEIXIN
        this._registerWechatHandlers();
        // #endif
        
        // App 平台
        // #ifdef APP-PLUS
        this._registerAppHandlers();
        // #endif
    }

    /**
     * 注册 H5 平台崩溃处理器
     * @private
     */
    _registerH5Handlers() {
        // 监听全局错误
        this.originalErrorHandler = window.onerror;
        
        window.onerror = (message, source, lineno, colno, error) => {
            this.handleError(error || message, 'global', {
                message,
                source,
                lineno,
                colno
            });
            
            // 调用原始处理器
            if (this.originalErrorHandler) {
                return this.originalErrorHandler(message, source, lineno, colno, error);
            }
            
            return false;
        };
        
        // 监听未处理的 Promise 拒绝
        this.originalUnhandledRejectionHandler = window.onunhandledrejection;
        
        window.onunhandledrejection = (event) => {
            this.handleError(event.reason, 'promise', {
                reason: event.reason
            });
            
            // 调用原始处理器
            if (this.originalUnhandledRejectionHandler) {
                return this.originalUnhandledRejectionHandler(event);
            }
        };
        
        // 监听资源加载错误
        window.addEventListener('error', (event) => {
            if (event.target && event.target !== window) {
                // 资源加载错误（如图片、脚本）
                this.handleError('Resource load failed: ' + event.target.src, 'resource', {
                    targetSrc: event.target.src,
                    targetTagName: event.target.tagName
                });
            }
        }, true);
    }

    /**
     * 注册微信小程序崩溃处理器
     * @private
     */
    _registerWechatHandlers() {
        // 使用微信提供的错误监听
        if (typeof wx !== 'undefined' && wx.onAppError) {
            wx.onAppError((error) => {
                this.handleError(error, 'wechat_app');
            });
        }
        
        // 监听小程序错误事件
        if (typeof wx !== 'undefined' && wx.onError) {
            wx.onError((error) => {
                this.handleError(error, 'wechat_error');
            });
        }
    }

    /**
     * 注册 App 平台崩溃处理器
     * @private
     */
    _registerAppHandlers() {
        // 使用 uni-app 的错误监听
        const app = getApp();
        
        if (app && app.onError) {
            const originalOnError = app.onError;
            
            app.onError = (error) => {
                this.handleError(error, 'uniapp_app');
                
                // 调用原始处理器
                return originalOnError.call(app, error);
            };
        }
        
        // 使用 Vue 的错误处理器
        // #ifdef VUE
        if (Vue && Vue.config && Vue.config.errorHandler) {
            Vue.config.errorHandler = (error, instance, info) => {
                this.handleError(error, 'vue', {
                    info
                });
                
                // 调用原始处理器
                Vue.config.errorHandler.call(Vue, error, instance, info);
            };
        }
        // #endif
    }

    /**
     * 处理错误/崩溃
     * @param {*} error 错误对象或错误信息
     * @param {string} errorType 错误类型
     * @param {Object} extraInfo 额外信息
     */
    handleError(error, errorType = 'unknown', extraInfo = {}) {
        this.logger.error('Crash/Error detected', { error, errorType });
        
        try {
            // 1. 收集崩溃信息
            const crashReport = this._collectCrashReport(error, errorType, extraInfo);
            
            // 2. 保存崩溃历史
            this._saveToCrashHistory(crashReport);
            
            // 3. 立即尝试上报崩溃数据
            this._reportCrashImmediate(crashReport);
            
            // 4. 记录崩溃前的操作路径
            this.logger.info('User action path before crash:', this.userActionPath);
        } catch (e) {
            this.logger.error('Error in crash handler', e);
        }
    }

    /**
     * 收集崩溃报告
     * @param {*} error 错误对象或错误信息
     * @param {string} errorType 错误类型
     * @param {Object} extraInfo 额外信息
     * @returns {Object}
     * @private
     */
    _collectCrashReport(error, errorType, extraInfo) {
        // 获取设备状态快照
        const deviceState = this._collectDeviceState();
        
        // 获取用户操作路径
        const actionPath = [...this.userActionPath];
        
        // 解析错误信息
        let errorMessage = '';
        let errorStack = '';
        let errorName = '';
        
        if (error instanceof Error) {
            errorMessage = error.message || error.toString();
            errorStack = error.stack || '';
            errorName = error.name || 'Error';
        } else if (typeof error === 'string') {
            errorMessage = error;
            errorStack = extraInfo.stack || '';
            errorName = 'UnknownError';
        } else {
            errorMessage = JSON.stringify(error);
        }
        
        // 获取应用信息
        const appInfo = this._getAppInfo();
        
        // 获取设备信息
        const deviceInfo = this._getDeviceInfo();
        
        // 构建崩溃报告
        return {
            // 报告标识
            id: this._generateCrashId(),
            type: 'crash_report',
            timestamp: Date.now(),
            local_time: new Date().toISOString(),
            
            // 错误信息
            error: {
                name: errorName,
                message: errorMessage,
                stack: errorStack,
                type: errorType
            },
            
            // 应用信息
            app: appInfo,
            
            // 设备信息
            device: deviceInfo,
            
            // 设备状态快照
            device_state: deviceState,
            
            // 用户操作路径
            action_path: actionPath,
            
            // 额外信息
            extra: extraInfo,
            
            // 环境信息
            environment: this._getEnvironmentInfo()
        };
    }

    /**
     * 收集设备状态快照
     * @returns {Object}
     * @private
     */
    _collectDeviceState() {
        const state = {
            // 时间
            timestamp: Date.now(),
            
            // 内存状态（H5）
            // #ifdef H5
            memory: this._getMemoryInfo(),
            // #endif
            
            // 性能信息
            performance: this._getPerformanceInfo(),
            
            // 网络状态
            network: this._getNetworkInfo(),
            
            // 页面状态
            page: this._getPageState(),
            
            // 存储使用情况
            storage: this._getStorageUsage(),
            
            // 运行时状态
            runtime: this._getRuntimeState()
        };
        
        return state;
    }

    /**
     * 获取内存信息（H5）
     * @returns {Object}
     * @private
     */
    // #ifdef H5
    _getMemoryInfo() {
        if (performance && performance.memory) {
            return {
                used_js_heap_size: performance.memory.usedJSHeapSize,
                total_js_heap_size: performance.memory.totalJSHeapSize,
                js_heap_size_limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }
    // #endif

    /**
     * 获取性能信息
     * @returns {Object}
     * @private
     */
    _getPerformanceInfo() {
        // #ifdef H5
        if (performance && performance.timing) {
            const timing = performance.timing;
            return {
                navigation_start: timing.navigationStart,
                load_event_end: timing.loadEventEnd,
                dom_content_loaded: timing.domContentLoadedEventEnd,
                first_paint: timing.firstPaint,
                first_contentful_paint: timing.firstContentfulPaint
            };
        }
        // #endif
        
        return null;
    }

    /**
     * 获取网络信息
     * @returns {Object}
     * @private
     */
    _getNetworkInfo() {
        return {
            online: this.network?.isOnline() || false,
            type: this.network?.getNetworkType() || 'unknown',
            effectiveType: this.network?.getEffectiveType() || 'unknown'
        };
    }

    /**
     * 获取页面状态
     * @returns {Object}
     * @private
     */
    _getPageState() {
        // #ifdef H5
        return {
            url: window.location.href,
            referrer: document.referrer,
            title: document.title,
            ready_state: document.readyState,
            hidden: document.hidden,
            visibility_state: document.visibilityState
        };
        // #endif
        
        // #ifndef H5
        return {};
        // #endif
    }

    /**
     * 获取存储使用情况
     * @returns {Object}
     * @private
     */
    _getStorageUsage() {
        let usage = {
            cache_count: 0,
            queue_count: 0
        };
        
        try {
            const cacheStats = this.storage?.getStats() || {};
            usage.cache_count = cacheStats.eventCount || 0;
            usage.queue_count = cacheStats.queueLength || 0;
        } catch (e) {
            // 忽略错误
        }
        
        return usage;
    }

    /**
     * 获取运行时状态
     * @returns {Object}
     * @private
     */
    _getRuntimeState() {
        return {
            // 会话信息
            session: this.storage?.get('last_session') || null,
            
            // 用户ID
            user_id: this.storage?.get('user_id') || null,
            
            // SDK 版本
            sdk_version: '1.0.0'
        };
    }

    /**
     * 获取应用信息
     * @returns {Object}
     * @private
     */
    _getAppInfo() {
        return {
            id: this.config.appId,
            name: this.config.appName,
            version: this.config.appVersion
        };
    }

    /**
     * 获取设备信息
     * @returns {Object}
     * @private
     */
    _getDeviceInfo() {
        return {
            device_id: this.storage?.get('device_id') || '',
            device_type: this._getDeviceType(),
            os: this._getOS(),
            os_version: this._getOSVersion(),
            platform: this._getPlatform()
        };
    }

    /**
     * 获取设备类型
     * @returns {string}
     * @private
     */
    _getDeviceType() {
        // #ifdef H5
        const ua = navigator.userAgent.toLowerCase();
        if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
            if (/iphone|ipad|ipod/i.test(ua)) {
                return 'iOS';
            } else if (/android/i.test(ua)) {
                return 'Android';
            }
            return 'Mobile';
        }
        return 'Desktop';
        // #endif
        
        // #ifdef MP-WEIXIN
        try {
            const systemInfo = wx.getSystemInfoSync();
            return systemInfo.deviceType || 'Unknown';
        } catch (e) {
            return 'Unknown';
        }
        // #endif
        
        // #ifdef APP-PLUS
        return 'App';
        // #endif
        
        return 'Unknown';
    }

    /**
     * 获取操作系统
     * @returns {string}
     * @private
     */
    _getOS() {
        // #ifdef H5
        const ua = navigator.userAgent;
        if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
        if (/android/i.test(ua)) return 'Android';
        if (/windows/i.test(ua)) return 'Windows';
        if (/mac/i.test(ua)) return 'macOS';
        if (/linux/i.test(ua)) return 'Linux';
        return 'Unknown';
        // #endif
        
        // #ifdef MP-WEIXIN
        try {
            const systemInfo = wx.getSystemInfoSync();
            return systemInfo.platform || systemInfo.system?.split(' ')[0] || 'Unknown';
        } catch (e) {
            return 'Unknown';
        }
        // #endif
        
        return 'Unknown';
    }

    /**
     * 获取操作系统版本
     * @returns {string}
     * @private
     */
    _getOSVersion() {
        // #ifdef H5
        const ua = navigator.userAgent;
        const match = ua.match(/(iPhone\s+OS|Android)\s+([\d_]+)/);
        return match ? match[2].replace(/_/g, '.') : '';
        // #endif
        
        // #ifdef MP-WEIXIN
        try {
            const systemInfo = wx.getSystemInfoSync();
            return systemInfo.system || '';
        } catch (e) {
            return '';
        }
        // #endif
        
        return '';
    }

    /**
     * 获取平台标识
     * @returns {string}
     * @private
     */
    _getPlatform() {
        // #ifdef H5
        return 'H5';
        // #endif
        
        // #ifdef MP-WEIXIN
        return 'WechatMiniProgram';
        // #endif
        
        // #ifdef APP-PLUS
        return 'App';
        // #endif
        
        return 'Unknown';
    }

    /**
     * 获取环境信息
     * @returns {Object}
     * @private
     */
    _getEnvironmentInfo() {
        return {
            platform: this._getPlatform(),
            environment: this.config.enableLog ? 'development' : 'production',
            debug: this.config.enableLog
        };
    }

    /**
     * 生成崩溃ID
     * @returns {string}
     * @private
     */
    _generateCrashId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 10);
        return `crash_${timestamp}_${randomPart}`;
    }

    /**
     * 保存到崩溃历史
     * @param {Object} crashReport 崩溃报告
     * @private
     */
    _saveToCrashHistory(crashReport) {
        this.crashHistory.push(crashReport);
        this._saveCrashHistory();
    }

    /**
     * 立即上报崩溃数据
     * @param {Object} crashReport 崩溃报告
     * @private
     */
    _reportCrashImmediate(crashReport) {
        this.logger.info('Reporting crash immediately...');
        
        // 将崩溃报告转为事件格式
        const event = {
            type: 'crash',
            data: crashReport
        };
        
        // 立即上报（不同步，等待发送）
        this.network.reportImmediately([event]).then(() => {
            this.logger.info('Crash reported successfully');
        }).catch(error => {
            this.logger.error('Failed to report crash immediately', error);
            // 即使上报失败也保存在本地
            this._saveUnreportedCrash(crashReport);
        });
    }

    /**
     * 保存未上报的崩溃记录
     * @param {Object} crashReport 崩溃报告
     * @private
     */
    _saveUnreportedCrash(crashReport) {
        let unreportedCrashes = this.storage.get('unreported_crashes') || [];
        unreportedCrashes.push(crashReport);
        
        // 限制数量
        if (unreportedCrashes.length > 20) {
            unreportedCrashes = unreportedCrashes.slice(-20);
        }
        
        this.storage.set('unreported_crashes', unreportedCrashes);
    }

    /**
     * 添加用户操作到路径
     * @param {Object} action 操作信息
     */
    addUserAction(action) {
        const actionRecord = {
            ...action,
            timestamp: Date.now()
        };
        
        this.userActionPath.push(actionRecord);
        
        // 限制路径长度
        if (this.userActionPath.length > this.maxActionPathLength) {
            this.userActionPath.shift();
        }
        
        this._saveUserActionPath();
    }

    /**
     * 清除用户操作路径
     */
    clearUserActionPath() {
        this.userActionPath = [];
        this._saveUserActionPath();
    }

    /**
     * 获取崩溃历史
     * @returns {Array}
     */
    getCrashHistory() {
        return [...this.crashHistory];
    }

    /**
     * 获取未上报的崩溃记录
     * @returns {Array}
     */
    getUnreportedCrashes() {
        return this.storage.get('unreported_crashes') || [];
    }

    /**
     * 清除崩溃历史
     */
    clearCrashHistory() {
        this.crashHistory = [];
        this._saveCrashHistory();
    }

    /**
     * 销毁崩溃处理器
     */
    destroy() {
        // 恢复原始错误处理器
        // #ifdef H5
        if (this.originalErrorHandler !== null) {
            window.onerror = this.originalErrorHandler;
        }
        
        if (this.originalUnhandledRejectionHandler !== null) {
            window.onunhandledrejection = this.originalUnhandledRejectionHandler;
        }
        // #endif
        
        this.logger.info('Crash handler destroyed');
    }
}

export default CrashHandler;
