/**
 * =====================================================
 * 设备信息采集模块 - DeviceInfo
 * =====================================================
 * 
 * 功能说明：
 * - 采集设备唯一标识 (GUID/设备ID)
 * - 采集设备基本信息
 * - 采集 IMEI（移动设备）
 * - 采集网络状态信息
 * - 采集屏幕分辨率
 * - 采集平台信息
 */

export class DeviceInfo {
    /**
     * 构造函数
     */
    constructor() {
        // 设备唯一标识
        this.deviceId = '';
        
        // 设备类型
        this.deviceType = '';
        
        // 操作系统
        this.os = '';
        this.osVersion = '';
        
        // 浏览器信息
        this.browser = '';
        this.browserVersion = '';
        
        // 屏幕信息
        this.screenWidth = 0;
        this.screenHeight = 0;
        this.screenScale = 1;
        
        // 语言
        this.language = '';
        this.locale = '';
        
        // 网络类型
        this.networkType = 'unknown';
        
        // 时区
        this.timezone = '';
        this.timezoneOffset = 0;
        
        // 平台
        this.platform = '';
        
        // App 信息（App 平台）
        this.appVersion = '';
        this.appName = '';
        
        // SDK 信息
        this.sdkVersion = '1.0.0';
        this.sdkName = 'uniapp-analytics-sdk';
    }

    /**
     * 初始化设备信息
     * @returns {Promise<void>}
     */
    async init() {
        this._collectBasicInfo();
        this._collectScreenInfo();
        this._collectNetworkInfo();
        this._collectTimezoneInfo();
        this._collectPlatformInfo();
        await this._collectDeviceId();
        this._collectAppInfo();
    }

    /**
     * 采集基本信息
     * @private
     */
    _collectBasicInfo() {
        // #ifdef H5
        this._collectH5Info();
        // #endif
        
        // #ifdef MP-WEIXIN
        this._collectWechatInfo();
        // #endif
        
        // #ifdef APP-PLUS
        this._collectAppPlusInfo();
        // #endif
    }

    /**
     * 采集 H5 环境信息
     * @private
     */
    _collectH5Info() {
        const ua = navigator.userAgent;
        
        // 设备类型
        if (/iPhone|iPad|iPod/i.test(ua)) {
            this.deviceType = 'iOS';
            this.os = 'iOS';
        } else if (/Android/i.test(ua)) {
            this.deviceType = 'Android';
            this.os = 'Android';
        } else if (/Windows/i.test(ua)) {
            this.deviceType = 'Windows';
            this.os = 'Windows';
        } else if (/Mac/i.test(ua)) {
            this.deviceType = 'macOS';
            this.os = 'macOS';
        } else if (/Linux/i.test(ua)) {
            this.deviceType = 'Linux';
            this.os = 'Linux';
        } else {
            this.deviceType = 'Unknown';
            this.os = 'Unknown';
        }
        
        // iOS 版本
        if (/iPhone\s+OS\s+([\d_]+)/i.test(ua)) {
            this.osVersion = RegExp.$1.replace(/_/g, '.');
        }
        
        // Android 版本
        if (/Android\s+([\d.]+)/i.test(ua)) {
            this.osVersion = RegExp.$1;
        }
        
        // 浏览器
        this.browser = this._getBrowser(ua);
        this.browserVersion = this._getBrowserVersion(ua);
        
        // 语言
        this.language = navigator.language || navigator.userLanguage || '';
        this.locale = this._getLocale();
    }

    /**
     * 获取浏览器信息
     * @param {string} ua User Agent
     * @returns {string}
     * @private
     */
    _getBrowser(ua) {
        if (/MicroMessenger/i.test(ua)) return 'Wechat';
        if (/AlipayClient/i.test(ua)) return 'Alipay';
        if (/DingTalk/i.test(ua)) return 'DingTalk';
        if (/QQ/i.test(ua) && /MQQBrowser/i.test(ua)) return 'QQBrowser';
        if (/Opera|OPR/i.test(ua)) return 'Opera';
        if (/Chrome/i.test(ua)) return 'Chrome';
        if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
        if (/Firefox/i.test(ua)) return 'Firefox';
        if (/MSIE|Trident/i.test(ua)) return 'IE';
        if (/Edge/i.test(ua)) return 'Edge';
        return 'Unknown';
    }

    /**
     * 获取浏览器版本
     * @param {string} ua User Agent
     * @returns {string}
     * @private
     */
    _getBrowserVersion(ua) {
        let version = '';
        
        // Chrome
        if (/Chrome\/([\d.]+)/i.test(ua)) {
            version = RegExp.$1;
        }
        // Safari
        else if (/Version\/([\d.]+).*Safari/i.test(ua)) {
            version = RegExp.$1;
        }
        // Firefox
        else if (/Firefox\/([\d.]+)/i.test(ua)) {
            version = RegExp.$1;
        }
        // IE
        else if (/MSIE\s+([\d.]+)/i.test(ua)) {
            version = RegExp.$1;
        } else if (/Trident.*rv:([\d.]+)/i.test(ua)) {
            version = RegExp.$1;
        }
        // Edge
        else if (/Edge\/([\d.]+)/i.test(ua)) {
            version = RegExp.$1;
        }
        
        return version;
    }

    /**
     * 获取地区/时区
     * @returns {string}
     * @private
     */
    _getLocale() {
        const locale = this.language || 'en';
        const parts = locale.split(/[-_]/);
        if (parts.length >= 2) {
            return parts[1].toUpperCase();
        }
        return 'US';
    }

    /**
     * 采集微信小程序信息
     * @private
     */
    _collectWechatInfo() {
        try {
            const systemInfo = wx.getSystemInfoSync();
            
            // 设备类型
            this.deviceType = systemInfo.deviceType || 'Unknown';
            
            // 操作系统
            this.os = systemInfo.platform || systemInfo.system?.split(' ')[0] || 'Unknown';
            this.osVersion = systemInfo.system?.split(' ')[1] || '';
            
            // 屏幕
            this.screenWidth = systemInfo.screenWidth || 0;
            this.screenHeight = systemInfo.screenHeight || 0;
            this.screenScale = systemInfo.pixelRatio || 1;
            
            // 语言
            this.language = systemInfo.language || 'zh-CN';
            
            // 品牌和型号
            this.deviceType = `${systemInfo.brand || ''} ${systemInfo.model || ''}`.trim();
            
            // SDK版本
            this.sdkVersion = systemInfo.SDKVersion || '1.0.0';
            
            // 版本
            try {
                const accountInfo = wx.getAccountInfoSync();
                this.appVersion = accountInfo.miniProgram?.version || '';
                this.appName = accountInfo.miniProgram?.appId || '';
            } catch (e) {
                // 忽略
            }
            
        } catch (e) {
            console.error('Failed to get Wechat system info', e);
        }
    }

    /**
     * 采集 App 环境信息
     * @private
     */
    _collectAppPlusInfo() {
        try {
            const deviceInfo = plus.device;
            const systemInfo = plus.os;
            
            // 设备类型
            this.deviceType = deviceInfo.model || 'Unknown';
            
            // 操作系统
            this.os = systemInfo.name || 'Unknown';
            this.osVersion = systemInfo.version || '';
            
            // IMEI
            try {
                // iOS 不支持获取 IMEI
                if (this.os === 'Android') {
                    // Android 获取 IMEI
                    const imei = deviceInfo.imei;
                    if (imei) {
                        this._saveImei(imei);
                    }
                }
            } catch (e) {
                console.warn('Cannot get IMEI', e);
            }
            
            // 屏幕
            this.screenWidth = plus.screen.width;
            this.screenHeight = plus.screen.height;
            this.screenScale = plus.screen.scale;
            
            // 语言
            this.language = plus.os.language || 'zh-CN';
            
            // App 版本
            try {
                const appInfo = plus.runtime;
                this.appVersion = appInfo.version || '';
                this.appName = appInfo.appid || '';
            } catch (e) {
                // 忽略
            }
            
        } catch (e) {
            console.error('Failed to get App device info', e);
        }
    }

    /**
     * 采集屏幕信息
     * @private
     */
    _collectScreenInfo() {
        // #ifdef H5
        this.screenWidth = window.screen.width;
        this.screenHeight = window.screen.height;
        this.screenScale = window.devicePixelRatio || 1;
        // #endif
    }

    /**
     * 采集网络信息
     * @private
     */
    _collectNetworkInfo() {
        // #ifdef H5
        this.networkType = this._getH5NetworkType();
        // #endif
        
        // #ifdef MP-WEIXIN
        try {
            const networkInfo = wx.getNetworkTypeSync();
            this.networkType = networkInfo.networkType;
        } catch (e) {
            this.networkType = 'unknown';
        }
        // #endif
        
        // #ifdef APP-PLUS
        try {
            const networkInfo = plus.networkinfo;
            this.networkType = this._mapPlusNetworkType(networkInfo.getCurrentType());
        } catch (e) {
            this.networkType = 'unknown';
        }
        // #endif
    }

    /**
     * 获取 H5 网络类型
     * @returns {string}
     * @private
     */
    _getH5NetworkType() {
        if (!navigator.onLine) {
            return 'offline';
        }
        
        if (navigator.connection) {
            return navigator.connection.type || 'unknown';
        }
        
        return 'unknown';
    }

    /**
     * 映射 Plus 网络类型
     * @param {number} type Plus 网络类型常量
     * @returns {string}
     * @private
     */
    _mapPlusNetworkType(type) {
        const typeMap = {
            [plus.networkinfo.CONNECTION_TYPE.WIFI]: 'wifi',
            [plus.networkinfo.CONNECTION_TYPE.CELLULAR_3G]: '3g',
            [plus.networkinfo.CONNECTION_TYPE.CELLULAR_4G]: '4g',
            [plus.networkinfo.CONNECTION_TYPE.CELLULAR_2G]: '2g',
            [plus.networkinfo.CONNECTION_TYPE.ETHERNET]: 'ethernet',
            [plus.networkinfo.CONNECTION_TYPE.NONE]: 'none'
        };
        return typeMap[type] || 'unknown';
    }

    /**
     * 采集时区信息
     * @private
     */
    _collectTimezoneInfo() {
        this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        this.timezoneOffset = new Date().getTimezoneOffset();
    }

    /**
     * 采集平台信息
     * @private
     */
    _collectPlatformInfo() {
        // #ifdef H5
        this.platform = 'H5';
        // #endif
        
        // #ifdef MP-WEIXIN
        this.platform = 'WechatMiniProgram';
        // #endif
        
        // #ifdef APP-PLUS
        this.platform = 'App';
        // #endif
        
        // #ifndef H5
        this.platform = this.platform || 'Unknown';
        // #endif
    }

    /**
     * 采集 App 信息
     * @private
     */
    _collectAppInfo() {
        // #ifdef APP-PLUS
        try {
            const appInfo = plus.runtime;
            this.appVersion = appInfo.version;
            this.appName = plus.app.name;
        } catch (e) {
            // 忽略
        }
        // #endif
    }

    /**
     * 采集设备ID
     * @returns {Promise<void>}
     * @private
     */
    async _collectDeviceId() {
        // 1. 首先尝试从存储获取
        const storageKey = 'device_id';
        let storedDeviceId = this._getStoredDeviceId(storageKey);
        
        if (storedDeviceId) {
            this.deviceId = storedDeviceId;
            return;
        }
        
        // 2. 尝试使用平台特定方式获取
        let generatedId = await this._generateDeviceId();
        
        // 3. 存储
        this._storeDeviceId(storageKey, generatedId);
        this.deviceId = generatedId;
    }

    /**
     * 获取存储的设备ID
     * @param {string} key 存储键
     * @returns {string|null}
     * @private
     */
    _getStoredDeviceId(key) {
        try {
            // #ifdef H5
            return localStorage.getItem(key);
            // #endif
            
            // #ifdef MP-WEIXIN
            return wx.getStorageSync(key);
            // #endif
            
            // #ifdef APP-PLUS
            return plus.storage.getItem(key);
            // #endif
            
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * 存储设备ID
     * @param {string} key 存储键
     * @param {string} value 设备ID
     * @private
     */
    _storeDeviceId(key, value) {
        try {
            // #ifdef H5
            localStorage.setItem(key, value);
            // #endif
            
            // #ifdef MP-WEIXIN
            wx.setStorageSync(key, value);
            // #endif
            
            // #ifdef APP-PLUS
            plus.storage.setItem(key, value);
            // #endif
        } catch (e) {
            console.error('Failed to store device ID', e);
        }
    }

    /**
     * 生成设备ID
     * @returns {Promise<string>}
     * @private
     */
    async _generateDeviceId() {
        // 生成格式：时间戳_随机字符串_平台标识
        const timestamp = Date.now().toString(36);
        const randomPart = this._generateRandomString(16);
        const platformPart = this._getPlatformCode();
        
        return `dev_${timestamp}_${randomPart}_${platformPart}`;
    }

    /**
     * 生成随机字符串
     * @param {number} length 长度
     * @returns {string}
     * @private
     */
    _generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    }

    /**
     * 获取平台代码
     * @returns {string}
     * @private
     */
    _getPlatformCode() {
        // #ifdef H5
        return 'H5';
        // #endif
        
        // #ifdef MP-WEIXIN
        return 'WX';
        // #endif
        
        // #ifdef APP-PLUS
        return 'APP';
        // #endif
        
        return 'UNK';
    }

    /**
     * 保存 IMEI
     * @param {string} imei IMEI
     * @private
     */
    _saveImei(imei) {
        const key = 'device_imei';
        
        // #ifdef H5
        localStorage.setItem(key, imei);
        // #endif
        
        // #ifdef MP-WEIXIN
        wx.setStorageSync(key, imei);
        // #endif
        
        // #ifdef APP-PLUS
        plus.storage.setItem(key, imei);
        // #endif
    }

    /**
     * 获取 IMEI
     * @returns {string|null}
     */
    getImei() {
        const key = 'device_imei';
        
        try {
            // #ifdef H5
            return localStorage.getItem(key);
            // #endif
            
            // #ifdef MP-WEIXIN
            return wx.getStorageSync(key);
            // #endif
            
            // #ifdef APP-PLUS
            return plus.storage.getItem(key);
            // #endif
            
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * 获取设备ID
     * @returns {string}
     */
    getDeviceId() {
        return this.deviceId;
    }

    /**
     * 获取设备类型
     * @returns {string}
     */
    getDeviceType() {
        return this.deviceType;
    }

    /**
     * 获取操作系统
     * @returns {string}
     */
    getOS() {
        return this.os;
    }

    /**
     * 获取操作系统版本
     * @returns {string}
     */
    getOSVersion() {
        return this.osVersion;
    }

    /**
     * 获取浏览器
     * @returns {string}
     */
    getBrowser() {
        return this.browser;
    }

    /**
     * 获取浏览器版本
     * @returns {string}
     */
    getBrowserVersion() {
        return this.browserVersion;
    }

    /**
     * 获取屏幕宽度
     * @returns {number}
     */
    getScreenWidth() {
        return this.screenWidth;
    }

    /**
     * 获取屏幕高度
     * @returns {number}
     */
    getScreenHeight() {
        return this.screenHeight;
    }

    /**
     * 获取语言
     * @returns {string}
     */
    getLanguage() {
        return this.language;
    }

    /**
     * 获取网络类型
     * @returns {string}
     */
    getNetworkType() {
        return this.networkType;
    }

    /**
     * 获取平台
     * @returns {string}
     */
    getPlatform() {
        return this.platform;
    }

    /**
     * 获取时区
     * @returns {string}
     */
    getTimezone() {
        return this.timezone;
    }

    /**
     * 获取完整设备信息
     * @returns {Object}
     */
    getAllInfo() {
        return {
            deviceId: this.deviceId,
            deviceType: this.deviceType,
            os: this.os,
            osVersion: this.osVersion,
            browser: this.browser,
            browserVersion: this.browserVersion,
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
            screenScale: this.screenScale,
            language: this.language,
            locale: this.locale,
            networkType: this.networkType,
            timezone: this.timezone,
            timezoneOffset: this.timezoneOffset,
            platform: this.platform,
            appVersion: this.appVersion,
            appName: this.appName,
            sdkVersion: this.sdkVersion,
            sdkName: this.sdkName
        };
    }
}

export default DeviceInfo;
