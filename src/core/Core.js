/**
 * =====================================================
 * 核心管理模块 - AnalyticsCore
 * =====================================================
 * 
 * 功能说明：
 * - SDK 初始化入口
 * - 会话管理
 * - 生命周期监控
 * - 组件自动注册
 * - 各模块协调调度
 */

export class AnalyticsCore {
    /**
     * 构造函数
     * @param {AnalyticsConfig} config 配置管理器
     * @param {Logger} logger 日志管理器
     * @param {DeviceInfo} deviceInfo 设备信息采集器
     * @param {StorageManager} storage 本地存储管理器
     * @param {NetworkManager} network 网络管理器
     * @param {EventTracker} eventTracker 事件追踪器
     * @param {CrashHandler} crashHandler 崩溃处理器
     * @param {ABTest} abtest AB测试管理器
     */
    constructor(config, logger, deviceInfo, storage, network, eventTracker, crashHandler, abtest) {
        this.config = config;
        this.logger = logger;
        this.deviceInfo = deviceInfo;
        this.storage = storage;
        this.network = network;
        this.eventTracker = eventTracker;
        this.crashHandler = crashHandler;
        this.abtest = abtest;
        
        // 会话状态
        this.sessionId = '';          // 当前会话ID
        this.sessionStartTime = 0;    // 会话开始时间
        this.lastActiveTime = 0;      // 最后活跃时间
        this.isSessionActive = false; // 会话是否活跃
        
        // 页面栈管理（用于追踪用户浏览路径）
        this.pageStack = [];           // 页面栈
        
        // 定时器
        this.sessionTimer = null;      // 会话检测定时器
        this.reportTimer = null;       // 上报定时器
        this.heartbeatTimer = null;    // 心跳定时器
        
        // 生命周期钩子
        this.appLifecycleHooks = null;
        this.pageLifecycleHooks = null;
        
        // 初始化状态
        this._initialized = false;
    }

    /**
     * 初始化 SDK 核心模块
     * @returns {Promise<void>}
     */
    async init() {
        if (this._initialized) {
            this.logger.warn('Core already initialized');
            return;
        }

        this.logger.info('Initializing Analytics Core...');

        try {
            // 1. 初始化设备信息
            await this._initDeviceInfo();
            
            // 2. 初始化本地存储
            await this._initStorage();
            
            // 3. 初始化网络状态监控
            await this._initNetworkMonitor();
            
            // 4. 初始化会话管理
            await this._initSession();
            
            // 5. 初始化生命周期监控
            await this._initLifecycleMonitor();
            
            // 6. 初始化崩溃处理
            await this._initCrashHandler();
            
            // 7. 初始化AB测试
            await this._initABTest();
            
            // 8. 初始化数据上报定时器
            await this._initReportScheduler();
            
            // 9. 注册全局错误处理
            this._registerGlobalErrorHandler();
            
            this._initialized = true;
            this.logger.info('Analytics Core initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Analytics Core', error);
            throw error;
        }
    }

    /**
     * 初始化设备信息
     * @private
     */
    async _initDeviceInfo() {
        this.logger.info('Initializing device info...');
        await this.deviceInfo.init();
        
        // 存储设备ID
        const deviceId = this.deviceInfo.getDeviceId();
        this.storage.set('device_id', deviceId);
        
        this.logger.info(`Device ID: ${deviceId}`);
    }

    /**
     * 初始化本地存储
     * @private
     */
    async _initStorage() {
        this.logger.info('Initializing storage...');
        await this.storage.init();
        
        // 恢复用户ID
        const userId = this.storage.get('user_id');
        if (userId) {
            this.eventTracker.setUserId(userId);
        }
        
        // 恢复用户属性
        const userProperties = this.storage.get('user_properties');
        if (userProperties) {
            this.eventTracker.setUserProperties(userProperties);
        }
    }

    /**
     * 初始化网络状态监控
     * @private
     */
    async _initNetworkMonitor() {
        this.logger.info('Initializing network monitor...');
        
        // 设置网络状态变化回调
        this.network.setNetworkChangeCallback((isOnline, networkType) => {
            this.logger.info(`Network changed: online=${isOnline}, type=${networkType}`);
            
            if (isOnline) {
                // 网络恢复时，尝试上报离线数据
                this.network.flush();
                
                // 如果是WiFi且配置为实时上报，立即上报
                if (networkType === 'wifi' && this.config.wifiImmediateReport) {
                    this.network.setImmediateMode(true);
                }
            } else {
                // 离线时切换到延迟模式
                this.network.setImmediateMode(false);
            }
        });
        
        // 初始化网络检测
        await this.network.init();
    }

    /**
     * 初始化会话管理
     * @private
     */
    async _initSession() {
        this.logger.info('Initializing session management...');
        
        // 检查是否有未结束的会话
        const lastSessionData = this.storage.get('last_session');
        if (lastSessionData) {
            const { sessionId, lastActiveTime } = lastSessionData;
            const now = Date.now();
            
            // 如果上次会话未超时，恢复会话
            if (now - lastActiveTime < this.config.sessionTimeout) {
                this.sessionId = sessionId;
                this.sessionStartTime = lastSessionData.startTime;
                this.isSessionActive = true;
                this.logger.info(`Restored session: ${this.sessionId}`);
            } else {
                // 会话已超时，创建新会话
                this._createNewSession();
            }
        } else {
            // 首次访问，创建新会话
            this._createNewSession();
        }
        
        // 更新最后活跃时间
        this._updateLastActiveTime();
        
        // 保存会话数据
        this._saveSessionData();
    }

    /**
     * 创建新会话
     * @private
     */
    _createNewSession() {
        // 生成新的会话ID（基于时间戳和随机数）
        this.sessionId = this._generateSessionId();
        this.sessionStartTime = Date.now();
        this.isSessionActive = true;
        
        this.logger.info(`Created new session: ${this.sessionId}`);
        
        // 发送会话开始事件
        this.eventTracker.trackSessionStart(this.sessionId);
    }

    /**
     * 生成会话ID
     * @returns {string}
     * @private
     */
    _generateSessionId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 10);
        return `${timestamp}_${randomPart}`;
    }

    /**
     * 开始新会话
     */
    startSession() {
        // 结束当前会话（如果有）
        if (this.isSessionActive) {
            this.endSession();
        }
        
        // 创建新会话
        this._createNewSession();
        this._updateLastActiveTime();
        this._saveSessionData();
    }

    /**
     * 结束当前会话
     */
    endSession() {
        if (!this.isSessionActive) {
            return;
        }
        
        // 记录会话时长
        const duration = Date.now() - this.sessionStartTime;
        this.eventTracker.trackSessionEnd(this.sessionId, duration);
        
        // 清空页面栈
        this.pageStack = [];
        
        // 标记会话结束
        this.isSessionActive = false;
        
        // 触发数据上报
        this.network.flush();
        
        this.logger.info(`Session ended: ${this.sessionId}, duration: ${duration}ms`);
    }

    /**
     * 获取当前会话ID
     * @returns {string}
     */
    getSessionId() {
        return this.sessionId;
    }

    /**
     * 更新最后活跃时间
     * @private
     */
    _updateLastActiveTime() {
        this.lastActiveTime = Date.now();
    }

    /**
     * 保存会话数据到本地存储
     * @private
     */
    _saveSessionData() {
        this.storage.set('last_session', {
            sessionId: this.sessionId,
            startTime: this.sessionStartTime,
            lastActiveTime: this.lastActiveTime
        });
    }

    /**
     * 初始化生命周期监控
     * @private
     */
    async _initLifecycleMonitor() {
        this.logger.info('Initializing lifecycle monitor...');
        
        // 根据不同平台注册生命周期钩子
        // #ifdef H5
        this._registerH5Lifecycle();
        // #endif
        
        // #ifdef MP-WEIXIN
        this._registerWechatLifecycle();
        // #endif
        
        // #ifdef APP-PLUS
        this._registerAppLifecycle();
        // #endif
    }

    /**
     * 注册 H5 平台生命周期监控
     * @private
     */
    _registerH5Lifecycle() {
        // 页面加载
        window.addEventListener('load', () => {
            this.logger.info('H5 page loaded');
            this.eventTracker.trackAppStart();
        });
        
        // 页面卸载
        window.addEventListener('beforeunload', () => {
            this.logger.info('H5 page unloading');
            this._handleAppHide();
        });
        
        // 页面显示
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this._handleAppShow();
            } else {
                this._handleAppHide();
            }
        });
        
        // 路由变化监控（基于 hashchange）
        window.addEventListener('hashchange', (e) => {
            const newUrl = window.location.hash;
            const oldUrl = e.oldURL.split('#')[1] || '/';
            this._handlePageChange(oldUrl, newUrl);
        });
        
        // History API 变化监控
        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;
        
        window.history.pushState = (...args) => {
            originalPushState.apply(window.history, args);
            this._handlePageChange(this._getCurrentPage(), window.location.pathname + window.location.search);
        };
        
        window.history.replaceState = (...args) => {
            originalReplaceState.apply(window.history, args);
            this._handlePageChange(this._getCurrentPage(), window.location.pathname + window.location.search);
        };
    }

    /**
     * 获取当前页面路径
     * @returns {string}
     * @private
     */
    _getCurrentPage() {
        return window.location.pathname + window.location.search;
    }

    /**
     * 注册微信小程序生命周期监控
     * @private
     */
    _registerWechatLifecycle() {
        // 保存原始的 App 函数
        const originalApp = App;
        
        // 重写 App 函数
        App = (appOptions) => {
            // 保存原始生命周期方法
            const originalOnLaunch = appOptions.onLaunch;
            const originalOnShow = appOptions.onShow;
            const originalOnHide = appOptions.onHide;
            const originalOnError = appOptions.onError;
            
            // 重写 onLaunch
            appOptions.onLaunch = (options) => {
                this.logger.info('Wechat app launched', options);
                this.eventTracker.trackAppStart();
                if (originalOnLaunch) {
                    return originalOnLaunch.call(appOptions, options);
                }
            };
            
            // 重写 onShow
            appOptions.onShow = (options) => {
                this.logger.info('Wechat app shown', options);
                this._handleAppShow();
                if (originalOnShow) {
                    return originalOnShow.call(appOptions, options);
                }
            };
            
            // 重写 onHide
            appOptions.onHide = () => {
                this.logger.info('Wechat app hidden');
                this._handleAppHide();
                if (originalOnHide) {
                    return originalOnHide.call(appOptions);
                }
            };
            
            // 重写 onError（用于错误监控）
            if (this.config.enableCrashReport) {
                appOptions.onError = (error) => {
                    this.logger.error('Wechat app error', error);
                    this.crashHandler.handleError(error, 'app');
                    if (originalOnError) {
                        return originalOnError.call(appOptions, error);
                    }
                };
            }
            
            return originalApp(appOptions);
        };
        
        // 保存原始的 Page 函数
        const originalPage = Page;
        
        // 重写 Page 函数
        Page = (pageOptions) => {
            // 保存原始生命周期方法
            const originalOnLoad = pageOptions.onLoad;
            const originalOnShow = pageOptions.onShow;
            const originalOnHide = pageOptions.onHide;
            const originalOnUnload = pageOptions.onUnload;
            
            // 获取页面路径
            const pagePath = this._getCurrentPagePath(pageOptions);
            
            // 重写 onLoad
            pageOptions.onLoad = (query) => {
                this.logger.info(`Wechat page loaded: ${pagePath}`);
                this._handlePageEnter(pagePath, query);
                if (originalOnLoad) {
                    return originalOnLoad.call(pageOptions, query);
                }
            };
            
            // 重写 onShow
            pageOptions.onShow = () => {
                this.logger.info(`Wechat page shown: ${pagePath}`);
                this._handlePageShow(pagePath);
                if (originalOnShow) {
                    return originalOnShow.call(pageOptions);
                }
            };
            
            // 重写 onHide
            pageOptions.onHide = () => {
                this.logger.info(`Wechat page hidden: ${pagePath}`);
                this._handlePageHide(pagePath);
                if (originalOnHide) {
                    return originalOnHide.call(pageOptions);
                }
            };
            
            // 重写 onUnload
            pageOptions.onUnload = () => {
                this.logger.info(`Wechat page unloaded: ${pagePath}`);
                this._handlePageLeave(pagePath);
                if (originalOnUnload) {
                    return originalOnUnload.call(pageOptions);
                }
            };
            
            return originalPage(pageOptions);
        };
    }

    /**
     * 获取当前页面路径（微信小程序）
     * @param {Object} pageOptions 页面配置
     * @returns {string}
     * @private
     */
    _getCurrentPagePath(pageOptions) {
        // 尝试从组件实例获取页面路径
        const pages = getCurrentPages();
        if (pages.length > 0) {
            const currentPage = pages[pages.length - 1];
            return currentPage.route || currentPage.__route__ || '';
        }
        return '';
    }

    /**
     * 注册 App 原生平台生命周期监控
     * @private
     */
    _registerAppLifecycle() {
        const app = getApp();
        
        // 使用 uni-app 的生命周期钩子
        // onLaunch
        app.onLaunch && app.onLaunch((options) => {
            this.logger.info('App launched', options);
            this.eventTracker.trackAppStart();
        });
        
        // onShow
        app.onShow && app.onShow((options) => {
            this.logger.info('App shown', options);
            this._handleAppShow();
        });
        
        // onHide
        app.onHide && app.onHide(() => {
            this.logger.info('App hidden');
            this._handleAppHide();
        });
        
        // onError
        if (this.config.enableCrashReport) {
            app.onError && app.onError((error) => {
                this.logger.error('App error', error);
                this.crashHandler.handleError(error, 'app');
            });
        }
        
        // 注册页面生命周期（通过页面mixin）
        uni.addInterceptor('navigateTo', {
            invoke: (e) => {
                const fromPage = this._getCurrentPage();
                const toPage = e.url;
                this._handlePageChange(fromPage, toPage);
                return e;
            }
        });
    }

    /**
     * 处理应用显示
     * @private
     */
    _handleAppShow() {
        // 更新活跃时间
        this._updateLastActiveTime();
        
        // 如果会话已过期，创建新会话
        if (!this.isSessionActive) {
            this._createNewSession();
            this.eventTracker.trackAppStart();
        }
        
        // 触发数据上报
        this.network.flush();
    }

    /**
     * 处理应用隐藏
     * @private
     */
    _handleAppHide() {
        // 更新活跃时间
        this._updateLastActiveTime();
        
        // 保存会话数据
        this._saveSessionData();
        
        // 触发数据上报
        this.network.flush();
    }

    /**
     * 处理页面进入
     * @param {string} pagePath 页面路径
     * @param {Object} query 查询参数
     * @private
     */
    _handlePageEnter(pagePath, query = {}) {
        this._updateLastActiveTime();
        
        // 添加到页面栈
        this.pageStack.push({
            path: pagePath,
            query: query,
            enterTime: Date.now()
        });
        
        // 追踪页面浏览
        if (this.config.trackPageView) {
            this.eventTracker.trackPageView(pagePath, { query });
        }
    }

    /**
     * 处理页面显示
     * @param {string} pagePath 页面路径
     * @private
     */
    _handlePageShow(pagePath) {
        this._updateLastActiveTime();
        
        // 更新页面栈中对应页面的进入时间
        const pageIndex = this.pageStack.findIndex(p => p.path === pagePath);
        if (pageIndex >= 0) {
            this.pageStack[pageIndex].enterTime = Date.now();
        }
    }

    /**
     * 处理页面隐藏
     * @param {string} pagePath 页面路径
     * @private
     */
    _handlePageHide(pagePath) {
        this._updateLastActiveTime();
        
        // 计算页面停留时长
        const pageIndex = this.pageStack.findIndex(p => p.path === pagePath);
        if (pageIndex >= 0) {
            const page = this.pageStack[pageIndex];
            page.duration = Date.now() - page.enterTime;
            page.leaveTime = Date.now();
        }
    }

    /**
     * 处理页面离开
     * @param {string} pagePath 页面路径
     * @private
     */
    _handlePageLeave(pagePath) {
        // 计算页面停留时长并记录
        const pageIndex = this.pageStack.findIndex(p => p.path === pagePath);
        if (pageIndex >= 0) {
            const page = this.pageStack[pageIndex];
            page.duration = Date.now() - page.enterTime;
            
            // 追踪页面离开事件
            this.eventTracker.trackPageLeave(pagePath, {
                duration: page.duration,
                query: page.query
            });
            
            // 从页面栈移除
            this.pageStack.splice(pageIndex, 1);
        }
    }

    /**
     * 处理页面变化（路由切换）
     * @param {string} fromPage 来源页面
     * @param {string} toPage 目标页面
     * @private
     */
    _handlePageChange(fromPage, toPage) {
        this._updateLastActiveTime();
        
        // 记录来源页面的离开事件
        if (fromPage && fromPage !== toPage) {
            const pageIndex = this.pageStack.findIndex(p => p.path === fromPage);
            if (pageIndex >= 0) {
                const page = this.pageStack[pageIndex];
                page.duration = Date.now() - page.enterTime;
                
                // 追踪页面离开
                this.eventTracker.trackPageLeave(fromPage, {
                    duration: page.duration,
                    to: toPage
                });
                
                // 更新页面栈
                this.pageStack.splice(pageIndex, 1);
            }
        }
        
        // 解析目标页面
        const parsedUrl = this._parsePageUrl(toPage);
        
        // 添加到页面栈
        this.pageStack.push({
            path: parsedUrl.path,
            query: parsedUrl.query,
            enterTime: Date.now()
        });
        
        // 追踪页面浏览
        if (this.config.trackPageView) {
            this.eventTracker.trackPageView(parsedUrl.path, { query: parsedUrl.query });
        }
    }

    /**
     * 解析页面URL
     * @param {string} url URL字符串
     * @returns {Object}
     * @private
     */
    _parsePageUrl(url) {
        let path = '';
        let query = {};
        
        // 移除前缀
        url = url.replace(/^\/+|\/+$/g, '');
        
        // 分离路径和查询参数
        const [pathPart, queryPart] = url.split('?');
        path = '/' + (pathPart || '');
        
        // 解析查询参数
        if (queryPart) {
            queryPart.split('&').forEach(param => {
                const [key, value] = param.split('=');
                if (key) {
                    query[decodeURIComponent(key)] = decodeURIComponent(value || '');
                }
            });
        }
        
        return { path, query };
    }

    /**
     * 获取页面浏览路径
     * @returns {Array}
     */
    getPageStack() {
        return [...this.pageStack];
    }

    /**
     * 初始化崩溃处理
     * @private
     */
    async _initCrashHandler() {
        if (!this.config.enableCrashReport) {
            this.logger.info('Crash report disabled');
            return;
        }
        
        this.logger.info('Initializing crash handler...');
        await this.crashHandler.init();
    }

    /**
     * 初始化AB测试
     * @private
     */
    async _initABTest() {
        if (!this.config.enableABTest) {
            this.logger.info('AB test disabled');
            return;
        }
        
        this.logger.info('Initializing AB test...');
        await this.abtest.init();
    }

    /**
     * 初始化数据上报定时器
     * @private
     */
    async _initReportScheduler() {
        this.logger.info('Initializing report scheduler...');
        
        // 设置定时上报
        this.network.setReportInterval(this.config.nonWifiInterval);
        
        // 会话检测定时器（检测会话是否超时）
        this.sessionTimer = setInterval(() => {
            this._checkSessionTimeout();
        }, 10000); // 每10秒检测一次
        
        // 心跳定时器（用于保持会话活跃）
        this.heartbeatTimer = setInterval(() => {
            this._heartbeat();
        }, this.config.sessionTimeout / 2); // 半个会话超时时间
    }

    /**
     * 检测会话是否超时
     * @private
     */
    _checkSessionTimeout() {
        if (!this.isSessionActive) {
            return;
        }
        
        const now = Date.now();
        const elapsed = now - this.lastActiveTime;
        
        if (elapsed >= this.config.sessionTimeout) {
            this.logger.info('Session timeout, ending session');
            this.endSession();
        }
    }

    /**
     * 心跳处理
     * @private
     */
    _heartbeat() {
        if (!this.isSessionActive) {
            return;
        }
        
        // 更新活跃时间
        this._updateLastActiveTime();
        
        // 保存心跳数据
        this._saveSessionData();
    }

    /**
     * 注册全局错误处理
     * @private
     */
    _registerGlobalErrorHandler() {
        if (!this.config.enableCrashReport) {
            return;
        }
        
        // H5 全局错误处理
        // #ifdef H5
        window.addEventListener('error', (event) => {
            this.crashHandler.handleError(event.error || event.message, 'global');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.crashHandler.handleError(event.reason, 'promise');
        });
        // #endif
        
        // 小程序错误处理
        // #ifdef MP-WEIXIN
        wx.onAppError && wx.onAppError((error) => {
            this.crashHandler.handleError(error, 'app');
        });
        // #endif
        
        // App 错误处理
        // #ifdef APP-PLUS
        plus.screen.onWakeup && plus.screen.onWakeup(() => {
            // 屏幕唤醒时的处理
        });
        // #endif
    }

    /**
     * 获取会话信息
     * @returns {Object}
     */
    getSessionInfo() {
        return {
            sessionId: this.sessionId,
            startTime: this.sessionStartTime,
            lastActiveTime: this.lastActiveTime,
            isActive: this.isSessionActive,
            pageStack: this.getPageStack()
        };
    }

    /**
     * 销毁 SDK
     */
    destroy() {
        this.logger.info('Destroying Analytics Core...');
        
        // 结束会话
        if (this.isSessionActive) {
            this.endSession();
        }
        
        // 清除定时器
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        if (this.reportTimer) {
            clearInterval(this.reportTimer);
            this.reportTimer = null;
        }
        
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        
        // 销毁各模块
        this.storage.destroy();
        this.network.destroy();
        this.crashHandler.destroy();
        this.abtest.destroy();
        
        this._initialized = false;
        this.logger.info('Analytics Core destroyed');
    }
}

export default AnalyticsCore;
