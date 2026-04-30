/**
 * =====================================================
 * AB测试模块 - ABTest
 * =====================================================
 * 
 * 功能说明：
 * - 管理 AB 测试分组
 * - 缓存分组结果
 * - 持久化分组信息
 * - 定时刷新分组配置
 * - 分组策略实现（用户哈希、随机等）
 */

export class ABTest {
    /**
     * 构造函数
     * @param {AnalyticsConfig} config 配置管理器
     * @param {Logger} logger 日志管理器
     * @param {StorageManager} storage 本地存储管理器
     */
    constructor(config, logger, storage) {
        this.config = config;
        this.logger = logger;
        this.storage = storage;
        
        // 实验配置（从服务器获取）
        this.experiments = {};
        
        // 用户分组映射（实验ID -> 分组）
        this.userAssignments = {};
        
        // 设备ID（用于分组）
        this.deviceId = '';
        
        // 用户ID（如果有）
        this.userId = '';
        
        // 刷新定时器
        this.refreshTimer = null;
        
        // 初始化状态
        this._initialized = false;
    }

    /**
     * 初始化 AB 测试模块
     * @returns {Promise<void>}
     */
    async init() {
        this.logger.info('Initializing AB test module...');
        
        // 加载缓存的分组信息
        this._loadCachedAssignments();
        
        // 获取设备ID
        this.deviceId = this.storage.get('device_id') || '';
        
        // 启动定时刷新
        this._startRefreshTimer();
        
        this._initialized = true;
        this.logger.info('AB test module initialized');
    }

    /**
     * 加载缓存的分组信息
     * @private
     */
    _loadCachedAssignments() {
        const cached = this.storage.get('ab_assignments');
        if (cached && typeof cached === 'object') {
            this.userAssignments = cached;
            
            // 检查是否过期
            const lastFetch = this.storage.get('ab_last_fetch');
            if (lastFetch) {
                const elapsed = Date.now() - lastFetch;
                if (elapsed > this.config.abTestRefreshInterval) {
                    this.logger.debug('AB test cache expired, will refresh');
                }
            }
        }
        
        // 加载实验配置
        const cachedExperiments = this.storage.get('ab_experiments');
        if (cachedExperiments && typeof cachedExperiments === 'object') {
            this.experiments = cachedExperiments;
        }
    }

    /**
     * 保存分组信息到缓存
     * @private
     */
    _saveAssignments() {
        this.storage.set('ab_assignments', this.userAssignments);
        this.storage.set('ab_last_fetch', Date.now());
    }

    /**
     * 启动定时刷新
     * @private
     */
    _startRefreshTimer() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        this.refreshTimer = setInterval(() => {
            this.refreshExperiments();
        }, this.config.abTestRefreshInterval);
    }

    /**
     * 获取实验值
     * @param {string} experimentId 实验ID
     * @param {*} defaultValue 默认值
     * @returns {Promise<*>}
     */
    async getValue(experimentId, defaultValue = null) {
        // 1. 检查缓存的分组
        if (this.userAssignments[experimentId] !== undefined) {
            const assignment = this.userAssignments[experimentId];
            return this._getValueFromAssignment(experimentId, assignment, defaultValue);
        }
        
        // 2. 检查实验配置
        if (this.experiments[experimentId]) {
            const assignment = this._calculateAssignment(experimentId);
            this.userAssignments[experimentId] = assignment;
            this._saveAssignments();
            
            return this._getValueFromAssignment(experimentId, assignment, defaultValue);
        }
        
        // 3. 尝试从服务器获取
        try {
            await this.fetchExperiments();
            
            if (this.experiments[experimentId]) {
                const assignment = this._calculateAssignment(experimentId);
                this.userAssignments[experimentId] = assignment;
                this._saveAssignments();
                
                return this._getValueFromAssignment(experimentId, assignment, defaultValue);
            }
        } catch (e) {
            this.logger.error('Failed to fetch experiments', e);
        }
        
        // 4. 返回默认值
        this.logger.debug(`No experiment found for ${experimentId}, returning default`);
        return defaultValue;
    }

    /**
     * 从分组获取值
     * @param {string} experimentId 实验ID
     * @param {string} assignment 分组名称
     * @param {*} defaultValue 默认值
     * @returns {*}
     * @private
     */
    _getValueFromAssignment(experimentId, assignment, defaultValue) {
        const experiment = this.experiments[experimentId];
        
        if (!experiment) {
            return defaultValue;
        }
        
        const variant = experiment.variants?.[assignment];
        
        if (variant !== undefined) {
            // 追踪实验曝光
            this._trackExposure(experimentId, assignment);
            return variant.value ?? defaultValue;
        }
        
        return defaultValue;
    }

    /**
     * 计算分组
     * @param {string} experimentId 实验ID
     * @returns {string}
     * @private
     */
    _calculateAssignment(experimentId) {
        const experiment = this.experiments[experimentId];
        
        if (!experiment) {
            return 'control';
        }
        
        // 获取分组列表
        const variants = experiment.variants || {};
        const variantKeys = Object.keys(variants);
        
        if (variantKeys.length === 0) {
            return 'control';
        }
        
        // 计算哈希值
        const hashKey = this._getHashKey(experimentId);
        const hash = this._hash(hashKey);
        
        // 根据权重计算分组
        let cumulative = 0;
        const totalWeight = Object.values(variants).reduce((sum, v) => sum + (v.weight || 1), 0);
        
        for (const [key, variant] of Object.entries(variants)) {
            cumulative += (variant.weight || 1) / totalWeight;
            
            if (hash < cumulative) {
                return key;
            }
        }
        
        return variantKeys[0];
    }

    /**
     * 获取哈希键
     * @param {string} experimentId 实验ID
     * @returns {string}
     * @private
     */
    _getHashKey(experimentId) {
        // 优先使用用户ID（保持同一用户始终分到同一组）
        if (this.userId) {
            return `${experimentId}_${this.userId}`;
        }
        
        // 使用设备ID
        return `${experimentId}_${this.deviceId}`;
    }

    /**
     * 计算字符串哈希值
     * @param {string} str 字符串
     * @returns {number} 0-1 之间的浮点数
     * @private
     */
    _hash(str) {
        let hash = 0;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        
        // 转换为 0-1 之间的浮点数
        const normalized = Math.abs(hash % 10000) / 10000;
        return normalized;
    }

    /**
     * 设置用户ID
     * @param {string} userId 用户ID
     */
    setUserId(userId) {
        this.userId = userId;
        
        // 清除旧的分组（用户变化需要重新计算）
        if (this.userAssignments && Object.keys(this.userAssignments).length > 0) {
            this.userAssignments = {};
            this._saveAssignments();
            this.logger.debug('User ID changed, clearing AB test assignments');
        }
    }

    /**
     * 刷新实验配置
     * @returns {Promise<void>}
     */
    async refreshExperiments() {
        this.logger.debug('Refreshing AB test experiments...');
        
        try {
            await this._fetchExperimentsFromServer();
        } catch (e) {
            this.logger.error('Failed to refresh AB test experiments', e);
        }
    }

    /**
     * 从服务器获取实验配置
     * @returns {Promise<void>}
     * @private
     */
    async _fetchExperimentsFromServer() {
        const url = `${this.config.serverUrl}/ab/experiments`;
        
        const body = JSON.stringify({
            app_id: this.config.appId,
            device_id: this.deviceId,
            user_id: this.userId || null,
            platform: this._getPlatform(),
            app_version: this.config.appVersion
        });
        
        try {
            // #ifdef H5
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            this._updateExperiments(data);
            // #endif
            
            // #ifdef MP-WEIXIN
            const data = await new Promise((resolve, reject) => {
                wx.request({
                    url,
                    method: 'POST',
                    data: {
                        app_id: this.config.appId,
                        device_id: this.deviceId,
                        user_id: this.userId || null,
                        platform: 'WechatMiniProgram',
                        app_version: this.config.appVersion
                    },
                    success: (res) => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(res.data);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}`));
                        }
                    },
                    fail: reject
                });
            });
            
            this._updateExperiments(data);
            // #endif
            
            // #ifdef APP-PLUS
            const data = await new Promise((resolve, reject) => {
                uni.request({
                    url,
                    method: 'POST',
                    data: {
                        app_id: this.config.appId,
                        device_id: this.deviceId,
                        user_id: this.userId || null,
                        platform: 'App',
                        app_version: this.config.appVersion
                    },
                    success: (res) => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(res.data);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}`));
                        }
                    },
                    fail: reject
                });
            });
            
            this._updateExperiments(data);
            // #endif
            
            this.logger.debug('AB test experiments refreshed');
            
        } catch (e) {
            this.logger.warn('Failed to fetch AB test experiments', e);
            throw e;
        }
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
     * 更新实验配置
     * @param {Object} data 服务器返回的数据
     * @private
     */
    _updateExperiments(data) {
        if (!data || !data.experiments) {
            return;
        }
        
        this.experiments = {};
        
        for (const exp of data.experiments) {
            this.experiments[exp.id] = {
                id: exp.id,
                name: exp.name,
                status: exp.status,
                variants: exp.variants || {},
                rules: exp.rules || {},
                start_time: exp.start_time,
                end_time: exp.end_time
            };
        }
        
        // 缓存实验配置
        this.storage.set('ab_experiments', this.experiments);
        this.storage.set('ab_last_fetch', Date.now());
    }

    /**
     * 追踪实验曝光
     * @param {string} experimentId 实验ID
     * @param {string} assignment 分组
     * @private
     */
    _trackExposure(experimentId, assignment) {
        // 记录曝光（不重复记录）
        const exposedKey = `ab_exposed_${experimentId}`;
        
        if (this.storage.get(exposedKey)) {
            return;
        }
        
        this.storage.set(exposedKey, true);
        
        // 发送曝光事件（通过事件追踪器，这里使用日志）
        this.logger.debug(`AB Test Exposure: experiment=${experimentId}, assignment=${assignment}`);
        
        // 可以通过全局事件系统发送
        if (typeof window !== 'undefined' && window.AnalyticsSDK) {
            window.AnalyticsSDK.track('$ab_exposure', {
                experiment_id: experimentId,
                assignment: assignment
            });
        }
    }

    /**
     * 获取当前所有分组信息
     * @returns {Object}
     */
    getAllAssignments() {
        return { ...this.userAssignments };
    }

    /**
     * 获取所有实验配置
     * @returns {Object}
     */
    getAllExperiments() {
        return { ...this.experiments };
    }

    /**
     * 清除所有分组信息
     */
    clearAssignments() {
        this.userAssignments = {};
        this._saveAssignments();
        this.logger.debug('Cleared all AB test assignments');
    }

    /**
     * 手动设置分组（用于测试）
     * @param {string} experimentId 实验ID
     * @param {string} assignment 分组
     */
    setAssignment(experimentId, assignment) {
        this.userAssignments[experimentId] = assignment;
        this._saveAssignments();
        this.logger.debug(`Manual assignment set: ${experimentId} = ${assignment}`);
    }

    /**
     * 获取实验信息
     * @param {string} experimentId 实验ID
     * @returns {Object|null}
     */
    getExperiment(experimentId) {
        return this.experiments[experimentId] || null;
    }

    /**
     * 检查实验是否有效
     * @param {string} experimentId 实验ID
     * @returns {boolean}
     */
    isExperimentValid(experimentId) {
        const experiment = this.experiments[experimentId];
        
        if (!experiment) {
            return false;
        }
        
        const now = Date.now();
        
        // 检查状态
        if (experiment.status !== 'active') {
            return false;
        }
        
        // 检查时间范围
        if (experiment.start_time && now < experiment.start_time) {
            return false;
        }
        
        if (experiment.end_time && now > experiment.end_time) {
            return false;
        }
        
        return true;
    }

    /**
     * 销毁 AB 测试模块
     */
    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        this.logger.info('AB test module destroyed');
    }
}

export default ABTest;
