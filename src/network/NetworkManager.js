/**
 * =====================================================
 * 网络管理模块 - NetworkManager
 * =====================================================
 * 
 * 功能说明：
 * - 统一管理数据上报
 * - 网络状态监控
 * - 批量上报与即时上报
 * - 数据加密、压缩
 * - 智能上报策略（WiFi实时/非WiFi间隔）
 * - 离线数据收集与恢复
 */

export class NetworkManager {
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
        
        // 网络状态
        this.isOnline = true;
        this.networkType = 'unknown';
        this.effectiveType = 'unknown';
        
        // 上报模式
        this.immediateMode = false;  // 立即上报模式
        this.reportInterval = config.nonWifiInterval;  // 上报间隔
        
        // 定时器
        this.reportTimer = null;
        this.retryTimer = null;
        
        // 重试配置
        this.maxRetries = 3;
        this.retryDelay = 5000;
        this.currentRetryCount = 0;
        
        // 网络状态变化回调
        this.networkChangeCallback = null;
        
        // 请求头
        this.headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'X-App-Id': this.config.appId,
            'X-SDK-Version': '1.0.0',
            'X-Platform': this._getPlatform()
        };
    }

    /**
     * 初始化网络管理器
     * @returns {Promise<void>}
     */
    async init() {
        this.logger.info('Initializing network manager...');
        
        // 检测初始网络状态
        await this._checkNetworkStatus();
        
        // 注册网络状态监听
        this._registerNetworkListeners();
        
        // 启动定时上报
        this._startReportTimer();
        
        // 尝试上报离线数据
        this._reportOfflineData();
        
        this.logger.info('Network manager initialized');
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
     * 检测网络状态
     * @returns {Promise<void>}
     * @private
     */
    async _checkNetworkStatus() {
        try {
            // #ifdef H5
            this.isOnline = navigator.onLine;
            
            if (navigator.connection) {
                this.effectiveType = navigator.connection.effectiveType || 'unknown';
                this.networkType = this._mapNetworkType(navigator.connection.type);
            } else {
                this.networkType = 'unknown';
            }
            // #endif
            
            // #ifdef MP-WEIXIN
            const networkInfo = wx.getNetworkTypeSync();
            this.isOnline = networkInfo.networkType !== 'none';
            this.networkType = networkInfo.networkType;
            // #endif
            
            // #ifdef APP-PLUS
            const networkInfo = plus.networkinfo.getCurrentType();
            this.isOnline = networkInfo !== plus.networkinfo.CONNECTION_TYPE.NONE;
            this.networkType = this._mapPlusNetworkType(networkInfo);
            // #endif
            
            // 判断是否WiFi
            if (this.isOnline) {
                const isWifi = this.networkType === 'wifi';
                
                // WiFi下且配置为实时上报时，立即上报
                if (isWifi && this.config.wifiImmediateReport) {
                    this.immediateMode = true;
                    this.flush();
                } else {
                    this.immediateMode = false;
                }
            }
            
            this.logger.info(`Network status: online=${this.isOnline}, type=${this.networkType}`);
            
        } catch (e) {
            this.logger.error('Failed to check network status', e);
        }
    }

    /**
     * 映射网络类型
     * @param {string} type 网络类型
     * @returns {string}
     * @private
     */
    _mapNetworkType(type) {
        const typeMap = {
            'wifi': 'wifi',
            'wifi': 'wifi',
            '4g': '4g',
            '3g': '3g',
            '2g': '2g',
            'cellular': 'cellular',
            'unknown': 'unknown',
            'bluetooth': 'bluetooth',
            'ethernet': 'ethernet'
        };
        return typeMap[type?.toLowerCase()] || 'unknown';
    }

    /**
     * 映射 Plus 网络类型
     * @param {number} type Plus 网络类型
     * @returns {string}
     * @private
     */
    _mapPlusNetworkType(type) {
        const typeMap = {
            [plus.networkinfo.CONNECTION_TYPE.WIFI]: 'wifi',
            [plus.networkinfo.CONNECTION_TYPE.CELLULAR_3G]: '3g',
            [plus.networkinfo.CONNECTION_TYPE.CELLULAR_4G]: '4g',
            [plus.networkinfo.CONNECTION_TYPE.CELLULAR_2G]: '2g',
            [plus.networkinfo.CONNECTION_TYPE.ETHERNET]: 'ethernet'
        };
        return typeMap[type] || 'unknown';
    }

    /**
     * 注册网络状态监听
     * @private
     */
    _registerNetworkListeners() {
        // #ifdef H5
        window.addEventListener('online', () => this._handleNetworkChange(true));
        window.addEventListener('offline', () => this._handleNetworkChange(false));
        
        // 监听网络信息变化
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => {
                const newType = this._mapNetworkType(navigator.connection.type);
                if (newType !== this.networkType) {
                    this.networkType = newType;
                    this.effectiveType = navigator.connection.effectiveType || 'unknown';
                    this.logger.info(`Network type changed: ${this.networkType}`);
                    
                    if (this.networkChangeCallback) {
                        this.networkChangeCallback(this.isOnline, this.networkType);
                    }
                }
            });
        }
        // #endif
        
        // #ifdef MP-WEIXIN
        if (typeof wx !== 'undefined') {
            wx.onNetworkStatusChange && wx.onNetworkStatusChange((res) => {
                const wasOnline = this.isOnline;
                this.isOnline = res.isConnected;
                this.networkType = res.networkType;
                
                if (wasOnline !== this.isOnline) {
                    this._handleNetworkChange(this.isOnline);
                }
            });
        }
        // #endif
        
        // #ifdef APP-PLUS
        document.addEventListener('netchange', () => {
            this._checkNetworkStatus();
        });
        // #endif
    }

    /**
     * 处理网络状态变化
     * @param {boolean} isOnline 是否在线
     * @private
     */
    _handleNetworkChange(isOnline) {
        this.isOnline = isOnline;
        
        this.logger.info(`Network changed: ${isOnline ? 'online' : 'offline'}`);
        
        if (this.networkChangeCallback) {
            this.networkChangeCallback(isOnline, this.networkType);
        }
        
        if (isOnline) {
            // 网络恢复时，尝试上报离线数据
            this._reportOfflineData();
            
            // 如果是WiFi且配置为实时上报，立即上报
            if (this.networkType === 'wifi' && this.config.wifiImmediateReport) {
                this.immediateMode = true;
                this.flush();
            }
        } else {
            // 离线时切换到延迟模式
            this.immediateMode = false;
        }
    }

    /**
     * 设置网络状态变化回调
     * @param {Function} callback 回调函数
     */
    setNetworkChangeCallback(callback) {
        this.networkChangeCallback = callback;
    }

    /**
     * 设置立即上报模式
     * @param {boolean} immediate 是否立即上报
     */
    setImmediateMode(immediate) {
        this.immediateMode = immediate;
        this.logger.debug(`Immediate mode: ${immediate}`);
    }

    /**
     * 设置上报间隔
     * @param {number} interval 间隔时间（毫秒）
     */
    setReportInterval(interval) {
        this.reportInterval = interval;
        
        // 重启定时器
        this._stopReportTimer();
        this._startReportTimer();
    }

    /**
     * 启动定时上报
     * @private
     */
    _startReportTimer() {
        if (this.reportTimer) {
            return;
        }
        
        this.reportTimer = setInterval(() => {
            this.flush();
        }, this.reportInterval);
    }

    /**
     * 停止定时上报
     * @private
     */
    _stopReportTimer() {
        if (this.reportTimer) {
            clearInterval(this.reportTimer);
            this.reportTimer = null;
        }
    }

    /**
     * 上报离线数据
     * @private
     */
    async _reportOfflineData() {
        const unreportedCrashes = this.storage.get('unreported_crashes') || [];
        
        if (unreportedCrashes.length > 0) {
            this.logger.info(`Reporting ${unreportedCrashes.length} unreported crashes`);
            
            for (const crash of unreportedCrashes) {
                try {
                    await this._sendData([{ type: 'crash', data: crash }]);
                    // 移除已上报的崩溃
                    const index = unreportedCrashes.indexOf(crash);
                    if (index > -1) {
                        unreportedCrashes.splice(index, 1);
                    }
                } catch (e) {
                    this.logger.error('Failed to report offline crash', e);
                }
            }
            
            this.storage.set('unreported_crashes', unreportedCrashes);
        }
    }

    /**
     * 刷新数据（触发批量上报）
     */
    flush() {
        if (!this.isOnline) {
            this.logger.debug('Offline, skip flush');
            return;
        }
        
        // 从队列获取待上报数据
        const events = this.storage.shiftFromQueue(this.config.batchSize);
        
        if (events.length === 0) {
            this.logger.debug('No events to report');
            return;
        }
        
        this._sendData(events).then(() => {
            this.logger.info(`Reported ${events.length} events`);
            this.currentRetryCount = 0;
        }).catch((error) => {
            this.logger.error('Failed to report events', error);
            this._handleReportError(events, error);
        });
    }

    /**
     * 立即上报数据
     * @param {Array} data 数据
     * @returns {Promise<void>}
     */
    async reportImmediately(data) {
        return this._sendData(data);
    }

    /**
     * 发送数据到服务器
     * @param {Array} events 事件数组
     * @returns {Promise<void>}
     * @private
     */
    async _sendData(events) {
        if (!this.isOnline) {
            // 离线时，将数据存回队列
            this.storage.addToQueue(events);
            throw new Error('Network offline');
        }
        
        // 构建请求数据
        const requestData = this._buildRequestData(events);
        
        // 序列化为 JSON
        let body = JSON.stringify(requestData);
        
        // 压缩（如果启用）
        if (this.config.compressData) {
            body = this._compressBody(body);
        }
        
        // 加密（如果启用）
        if (this.config.encryptData) {
            body = this._encryptBody(body);
        }
        
        this.logger.debug(`Sending ${events.length} events to ${this.config.serverUrl}`);
        
        // 发送请求
        try {
            await this._makeRequest(body);
            this.logger.debug('Data sent successfully');
        } catch (error) {
            this.logger.error('Request failed', error);
            throw error;
        }
    }

    /**
     * 构建请求数据
     * @param {Array} events 事件数组
     * @returns {Object}
     * @private
     */
    _buildRequestData(events) {
        return {
            // 协议版本
            version: '1.0',
            
            // 请求ID
            request_id: this._generateRequestId(),
            
            // 时间戳
            timestamp: Date.now(),
            local_time: new Date().toISOString(),
            
            // 应用信息
            app: {
                id: this.config.appId,
                name: this.config.appName,
                version: this.config.appVersion
            },
            
            // 设备信息
            device: {
                id: this.storage.get('device_id') || ''
            },
            
            // 事件列表
            events: events,
            
            // 设备状态
            device_state: {
                network_type: this.networkType,
                is_online: this.isOnline
            }
        };
    }

    /**
     * 生成请求ID
     * @returns {string}
     * @private
     */
    _generateRequestId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);
        return `req_${timestamp}_${random}`;
    }

    /**
     * 压缩请求体
     * @param {string} body 原始请求体
     * @returns {string}
     * @private
     */
    _compressBody(body) {
        try {
            // #ifdef H5
            // 使用 LZString 压缩
            if (typeof LZString !== 'undefined') {
                return LZString.compressToBase64(body);
            }
            // #endif
            
            // #ifdef MP-WEIXIN
            // 微信小程序使用 compress-uniq
            return body;
            // #endif
            
            return body;
        } catch (e) {
            this.logger.warn('Compression failed, using uncompressed data');
            return body;
        }
    }

    /**
     * 加密请求体
     * @param {string} body 原始请求体
     * @returns {string}
     * @private
     */
    _encryptBody(body) {
        try {
            const key = this.config.encryptionKey || 'analytics_default_key';
            let result = '';
            
            for (let i = 0; i < body.length; i++) {
                const charCode = body.charCodeAt(i);
                const keyChar = key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode ^ keyChar);
            }
            
            // Base64 编码
            return this._base64Encode(result);
        } catch (e) {
            this.logger.warn('Encryption failed, using unencrypted data');
            return body;
        }
    }

    /**
     * Base64 编码
     * @param {string} str 字符串
     * @returns {string}
     * @private
     */
    _base64Encode(str) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let output = '';
        
        for (let i = 0; i < str.length; i += 3) {
            const a = str.charCodeAt(i);
            const b = str.charCodeAt(i + 1);
            const c = str.charCodeAt(i + 2);
            
            const index1 = a >> 2;
            const index2 = ((a & 3) << 4) | (b >> 4);
            const index3 = ((b & 15) << 2) | (c >> 6);
            const index4 = c & 63;
            
            if (isNaN(b)) {
                output += chars.charAt(index1) + chars.charAt(index2) + '==';
            } else if (isNaN(c)) {
                output += chars.charAt(index1) + chars.charAt(index2) + chars.charAt(index3) + '=';
            } else {
                output += chars.charAt(index1) + chars.charAt(index2) + chars.charAt(index3) + chars.charAt(index4);
            }
        }
        
        return output;
    }

    /**
     * 发起请求
     * @param {string} body 请求体
     * @returns {Promise<void>}
     * @private
     */
    async _makeRequest(body) {
        // #ifdef H5
        return this._makeH5Request(body);
        // #endif
        
        // #ifdef MP-WEIXIN
        return this._makeWechatRequest(body);
        // #endif
        
        // #ifdef APP-PLUS
        return this._makeAppRequest(body);
        // #endif
    }

    /**
     * H5 环境发起请求
     * @param {string} body 请求体
     * @returns {Promise<void>}
     * @private
     */
    _makeH5Request(body) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.open('POST', this.config.serverUrl, true);
            
            // 设置请求头
            Object.entries(this.headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
            });
            
            if (this.config.compressData) {
                xhr.setRequestHeader('X-Content-Encoding', 'gzip');
            }
            
            if (this.config.encryptData) {
                xhr.setRequestHeader('X-Content-Encrypted', 'true');
            }
            
            xhr.timeout = 30000;
            
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            };
            
            xhr.onerror = () => {
                reject(new Error('Network error'));
            };
            
            xhr.ontimeout = () => {
                reject(new Error('Request timeout'));
            };
            
            xhr.send(body);
        });
    }

    /**
     * 微信小程序环境发起请求
     * @param {string} body 请求体
     * @returns {Promise<void>}
     * @private
     */
    _makeWechatRequest(body) {
        return new Promise((resolve, reject) => {
            wx.request({
                url: this.config.serverUrl,
                method: 'POST',
                header: this.headers,
                data: body,
                timeout: 30000,
                success: (res) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve();
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                },
                fail: (err) => {
                    reject(new Error(err.errMsg || 'Request failed'));
                }
            });
        });
    }

    /**
     * App 环境发起请求
     * @param {string} body 请求体
     * @returns {Promise<void>}
     * @private
     */
    _makeAppRequest(body) {
        return new Promise((resolve, reject) => {
            const xhr = plus.netlabsXMLHttpRequest || wx.request;
            
            if (xhr === plus.netlabsXMLHttpRequest) {
                // 使用原生 XMLHttpRequest
                const request = new plus.netlabsXMLHttpRequest();
                
                request.open('POST', this.config.serverUrl);
                
                Object.entries(this.headers).forEach(([key, value]) => {
                    request.setRequestHeader(key, value);
                });
                
                request.onload = () => {
                    if (request.status >= 200 && request.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`HTTP ${request.status}`));
                    }
                };
                
                request.onerror = () => {
                    reject(new Error('Network error'));
                };
                
                request.send(body);
            } else if (xhr) {
                // 使用 uni.request
                uni.request({
                    url: this.config.serverUrl,
                    method: 'POST',
                    header: this.headers,
                    data: body,
                    timeout: 30000,
                    success: (res) => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve();
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}`));
                        }
                    },
                    fail: (err) => {
                        reject(new Error(err.errMsg || 'Request failed'));
                    }
                });
            } else {
                reject(new Error('No available request method'));
            }
        });
    }

    /**
     * 处理上报错误
     * @param {Array} events 事件数组
     * @param {Error} error 错误对象
     * @private
     */
    _handleReportError(events, error) {
        // 如果不是网络错误，不重试
        if (!this._isNetworkError(error)) {
            return;
        }
        
        // 将数据放回队列
        this.storage.addToQueue(events);
        
        // 重试
        if (this.currentRetryCount < this.maxRetries) {
            this.currentRetryCount++;
            const delay = this.retryDelay * this.currentRetryCount;
            
            this.logger.info(`Retrying in ${delay}ms (attempt ${this.currentRetryCount}/${this.maxRetries})`);
            
            setTimeout(() => {
                this.flush();
            }, delay);
        } else {
            this.logger.error('Max retries reached, giving up');
            this.currentRetryCount = 0;
        }
    }

    /**
     * 判断是否为网络错误
     * @param {Error} error 错误对象
     * @returns {boolean}
     * @private
     */
    _isNetworkError(error) {
        if (!error) return false;
        
        const networkErrors = [
            'Network error',
            'Network request failed',
            'net::ERR_INTERNET_DISCONNECTED',
            'net::ERR_CONNECTION_REFUSED',
            'net::ERR_CONNECTION_RESET',
            'net::ERR_CONNECTION_TIMED_OUT'
        ];
        
        return networkErrors.some(e => 
            error.message?.includes(e) || 
            error.errMsg?.includes(e)
        );
    }

    /**
     * 获取网络状态
     * @returns {boolean}
     */
    isOnline() {
        return this.isOnline;
    }

    /**
     * 获取网络类型
     * @returns {string}
     */
    getNetworkType() {
        return this.networkType;
    }

    /**
     * 获取有效网络类型
     * @returns {string}
     */
    getEffectiveType() {
        return this.effectiveType;
    }

    /**
     * 销毁网络管理器
     */
    destroy() {
        this._stopReportTimer();
        
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
        
        this.logger.info('Network manager destroyed');
    }
}

export default NetworkManager;
