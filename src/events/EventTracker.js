/**
 * =====================================================
 * 事件追踪模块 - EventTracker
 * =====================================================
 * 
 * 功能说明：
 * - 追踪用户行为事件
 * - 管理事件队列
 * - 构建事件数据格式
 * - 追踪页面浏览、点击、滚动等通用事件
 */

export class EventTracker {
    /**
     * 构造函数
     * @param {AnalyticsConfig} config 配置管理器
     * @param {Logger} logger 日志管理器
     * @param {StorageManager} storage 本地存储管理器
     * @param {DeviceInfo} deviceInfo 设备信息采集器
     */
    constructor(config, logger, storage, deviceInfo) {
        this.config = config;
        this.logger = logger;
        this.storage = storage;
        this.deviceInfo = deviceInfo;
        
        // 用户信息
        this.userId = '';           // 用户ID
        this.userProperties = {};   // 用户属性
        
        // 事件序号（用于保证事件顺序）
        this.eventSequence = 0;
        
        // 事件缓存（批量上报用）
        this.eventBuffer = [];
        
        // 事件类型映射
        this.eventTypes = {
            CUSTOM: 'custom',               // 自定义事件
            PAGE_VIEW: 'page_view',        // 页面浏览
            PAGE_LEAVE: 'page_leave',      // 页面离开
            CLICK: 'click',                // 点击
            SCROLL: 'scroll',              // 滚动
            SESSION_START: 'session_start',// 会话开始
            SESSION_END: 'session_end',    // 会话结束
            APP_START: 'app_start',        // 应用启动
            APP_HIDE: 'app_hide',          // 应用隐藏
            APP_SHOW: 'app_show',          // 应用显示
            NETWORK_CHANGE: 'network_change',// 网络变化
            ERROR: 'error'                 // 错误
        };
    }

    /**
     * 追踪自定义事件
     * @param {string} eventId 事件ID
     * @param {Object} eventData 事件数据
     */
    track(eventId, eventData = {}) {
        const event = this._buildEvent(this.eventTypes.CUSTOM, {
            event_id: eventId,
            ...eventData
        });
        
        this._enqueueEvent(event);
        this.logger.debug(`Tracked custom event: ${eventId}`, eventData);
    }

    /**
     * 追踪页面浏览
     * @param {string} pageName 页面名称/路径
     * @param {Object} pageData 页面数据
     */
    trackPageView(pageName, pageData = {}) {
        const event = this._buildEvent(this.eventTypes.PAGE_VIEW, {
            page_name: pageName,
            referrer: this._getReferrer(pageData),
            ...pageData
        });
        
        this._enqueueEvent(event);
        this.logger.debug(`Tracked page view: ${pageName}`);
    }

    /**
     * 追踪页面离开
     * @param {string} pageName 页面名称/路径
     * @param {Object} leaveData 离开数据
     */
    trackPageLeave(pageName, leaveData = {}) {
        const event = this._buildEvent(this.eventTypes.PAGE_LEAVE, {
            page_name: pageName,
            duration: leaveData.duration || 0,
            referrer: leaveData.to || '',
            ...leaveData
        });
        
        this._enqueueEvent(event);
        this.logger.debug(`Tracked page leave: ${pageName}, duration: ${leaveData.duration}ms`);
    }

    /**
     * 追踪点击事件
     * @param {string} elementId 元素ID
     * @param {Object} clickData 点击数据
     */
    trackClick(elementId, clickData = {}) {
        const event = this._buildEvent(this.eventTypes.CLICK, {
            element_id: elementId,
            element_text: clickData.text || '',
            element_class: clickData.className || '',
            element_tag: clickData.tagName || '',
            position_x: clickData.x || 0,
            position_y: clickData.y || 0,
            page_name: clickData.pageName || '',
            ...clickData
        });
        
        this._enqueueEvent(event);
        this.logger.debug(`Tracked click: ${elementId}`);
    }

    /**
     * 追踪滚动事件
     * @param {Object} scrollData 滚动数据
     */
    trackScroll(scrollData = {}) {
        const event = this._buildEvent(this.eventTypes.SCROLL, {
            scroll_depth: scrollData.depth || 0,      // 滚动深度百分比
            scroll_top: scrollData.top || 0,          // 滚动距离顶部
            scroll_height: scrollData.height || 0,    // 页面总高度
            viewport_height: scrollData.viewportHeight || 0,  // 视口高度
            page_name: scrollData.pageName || '',
            ...scrollData
        });
        
        this._enqueueEvent(event);
        this.logger.debug(`Tracked scroll: depth=${scrollData.depth}%`);
    }

    /**
     * 追踪会话开始
     * @param {string} sessionId 会话ID
     */
    trackSessionStart(sessionId) {
        const event = this._buildEvent(this.eventTypes.SESSION_START, {
            session_id: sessionId
        });
        
        this._enqueueEvent(event);
        this.logger.debug(`Tracked session start: ${sessionId}`);
    }

    /**
     * 追踪会话结束
     * @param {string} sessionId 会话ID
     * @param {number} duration 会话时长
     */
    trackSessionEnd(sessionId, duration) {
        const event = this._buildEvent(this.eventTypes.SESSION_END, {
            session_id: sessionId,
            session_duration: duration
        });
        
        this._enqueueEvent(event);
        this.logger.debug(`Tracked session end: ${sessionId}, duration: ${duration}ms`);
    }

    /**
     * 追踪应用启动
     */
    trackAppStart() {
        const event = this._buildEvent(this.eventTypes.APP_START, {
            app_id: this.config.appId,
            app_version: this.config.appVersion
        });
        
        this._enqueueEvent(event);
        this.logger.debug('Tracked app start');
    }

    /**
     * 追踪应用显示
     */
    trackAppShow() {
        const event = this._buildEvent(this.eventTypes.APP_SHOW, {});
        
        this._enqueueEvent(event);
        this.logger.debug('Tracked app show');
    }

    /**
     * 追踪应用隐藏
     */
    trackAppHide() {
        const event = this._buildEvent(this.eventTypes.APP_HIDE, {});
        
        this._enqueueEvent(event);
        this.logger.debug('Tracked app hide');
    }

    /**
     * 追踪网络变化
     * @param {boolean} isOnline 是否在线
     * @param {string} networkType 网络类型
     */
    trackNetworkChange(isOnline, networkType) {
        const event = this._buildEvent(this.eventTypes.NETWORK_CHANGE, {
            is_online: isOnline,
            network_type: networkType
        });
        
        this._enqueueEvent(event);
        this.logger.debug(`Tracked network change: ${isOnline}, type=${networkType}`);
    }

    /**
     * 追踪错误事件
     * @param {string} errorMessage 错误信息
     * @param {string} errorType 错误类型
     * @param {Object} errorData 错误数据
     */
    trackError(errorMessage, errorType, errorData = {}) {
        const event = this._buildEvent(this.eventTypes.ERROR, {
            error_message: errorMessage,
            error_type: errorType,
            ...errorData
        });
        
        this._enqueueEvent(event);
        this.logger.debug(`Tracked error: ${errorType}, ${errorMessage}`);
    }

    /**
     * 构建事件对象
     * @param {string} eventType 事件类型
     * @param {Object} eventData 事件数据
     * @returns {Object}
     * @private
     */
    _buildEvent(eventType, eventData) {
        // 获取会话ID（从存储中获取）
        const sessionData = this.storage.get('last_session') || {};
        
        // 生成事件ID
        const eventId = this._generateEventId();
        
        // 构建基础事件对象
        const event = {
            // 事件标识
            id: eventId,
            event_type: eventType,
            event_sequence: this.eventSequence++,
            
            // 时间戳
            timestamp: Date.now(),
            local_time: this._formatLocalTime(),
            
            // 应用信息
            app_id: this.config.appId,
            app_name: this.config.appName,
            app_version: this.config.appVersion,
            
            // 设备信息
            device_id: this.deviceInfo.getDeviceId(),
            device_type: this.deviceInfo.getDeviceType(),
            os: this.deviceInfo.getOS(),
            os_version: this.deviceInfo.getOSVersion(),
            browser: this.deviceInfo.getBrowser(),
            browser_version: this.deviceInfo.getBrowserVersion(),
            screen_width: this.deviceInfo.getScreenWidth(),
            screen_height: this.deviceInfo.getScreenHeight(),
            language: this.deviceInfo.getLanguage(),
            
            // 网络信息
            network_type: this.deviceInfo.getNetworkType(),
            
            // 会话信息
            session_id: sessionData.sessionId || '',
            
            // 用户信息
            user_id: this.userId || null,
            user_properties: this.userProperties,
            
            // 事件数据
            ...eventData
        };
        
        return event;
    }

    /**
     * 生成事件ID
     * @returns {string}
     * @private
     */
    _generateEventId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 10);
        const sequencePart = this.eventSequence.toString(36);
        return `${timestamp}_${randomPart}_${sequencePart}`;
    }

    /**
     * 格式化本地时间
     * @returns {string}
     * @private
     */
    _formatLocalTime() {
        const now = new Date();
        return now.toISOString();
    }

    /**
     * 获取来源页面
     * @param {Object} pageData 页面数据
     * @returns {string}
     * @private
     */
    _getReferrer(pageData) {
        // 优先使用传入的 referrer
        if (pageData.referrer) {
            return pageData.referrer;
        }
        
        // #ifdef H5
        // 从 document.referrer 获取
        return document.referrer || '';
        // #endif
        
        // #ifndef H5
        return pageData.referrer || '';
        // #endif
    }

    /**
     * 将事件加入队列
     * @param {Object} event 事件对象
     * @private
     */
    _enqueueEvent(event) {
        // 添加到事件缓冲区
        this.eventBuffer.push(event);
        
        // 如果缓冲区达到批量大小，触发上报
        if (this.eventBuffer.length >= this.config.batchSize) {
            this._flushBuffer();
        }
        
        // 存储事件到本地（用于崩溃恢复）
        this._saveEventToStorage(event);
    }

    /**
     * 刷新事件缓冲区
     * @private
     */
    _flushBuffer() {
        if (this.eventBuffer.length === 0) {
            return;
        }
        
        // 获取所有事件并清空缓冲区
        const events = [...this.eventBuffer];
        this.eventBuffer = [];
        
        // 存储到待上报队列
        this.storage.addToQueue(events);
    }

    /**
     * 保存事件到本地存储（用于崩溃恢复）
     * @param {Object} event 事件对象
     * @private
     */
    _saveEventToStorage(event) {
        // 获取已保存的事件列表
        let savedEvents = this.storage.get('pending_events') || [];
        
        // 添加新事件
        savedEvents.push(event);
        
        // 限制保存数量
        if (savedEvents.length > this.config.maxCacheSize) {
            savedEvents = savedEvents.slice(-this.config.maxCacheSize);
        }
        
        // 保存
        this.storage.set('pending_events', savedEvents);
    }

    /**
     * 设置用户ID
     * @param {string} userId 用户ID
     */
    setUserId(userId) {
        this.userId = userId;
        this.logger.debug(`User ID set: ${userId}`);
    }

    /**
     * 设置用户属性
     * @param {Object} userProperties 用户属性
     */
    setUserProperties(userProperties) {
        this.userProperties = { ...this.userProperties, ...userProperties };
        this.logger.debug('User properties updated:', userProperties);
    }

    /**
     * 获取当前用户ID
     * @returns {string}
     */
    getUserId() {
        return this.userId;
    }

    /**
     * 获取当前用户属性
     * @returns {Object}
     */
    getUserProperties() {
        return { ...this.userProperties };
    }

    /**
     * 获取事件缓冲区
     * @returns {Array}
     */
    getBuffer() {
        return [...this.eventBuffer];
    }

    /**
     * 清空事件缓冲区
     */
    clearBuffer() {
        const count = this.eventBuffer.length;
        this.eventBuffer = [];
        this.logger.debug(`Cleared event buffer: ${count} events`);
    }

    /**
     * 获取事件类型列表
     * @returns {Object}
     */
    getEventTypes() {
        return { ...this.eventTypes };
    }
}

export default EventTracker;
