/**
 * =====================================================
 * 本地存储管理模块 - StorageManager
 * =====================================================
 * 
 * 功能说明：
 * - 统一管理各类存储（localStorage、sessionStorage、uni-storage等）
 * - 数据加密存储
 * - 数据压缩存储
 * - 存储配额管理
 * - 存储数据统计
 */

export class StorageManager {
    /**
     * 构造函数
     * @param {AnalyticsConfig} config 配置管理器
     * @param {Logger} logger 日志管理器
     */
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        
        // 存储前缀（避免命名冲突）
        this.storagePrefix = 'analytics_';
        
        // 存储类型：local、session、memory
        this.storageType = 'local';
        
        // 内存缓存（用于频繁读取）
        this.memoryCache = new Map();
        
        // 存储实例
        this.storage = null;
        
        // 加密工具
        this.crypto = null;
        
        // 统计数据
        this.stats = {
            getCount: 0,
            setCount: 0,
            removeCount: 0,
            totalSize: 0,
            keyCount: 0
        };
        
        // 初始化存储
        this._initStorage();
    }

    /**
     * 初始化存储
     * @private
     */
    _initStorage() {
        try {
            // #ifdef H5
            this.storage = window.localStorage;
            this.storageType = 'local';
            // #endif
            
            // #ifdef MP-WEIXIN
            this.storage = uni;
            this.storageType = 'uni';
            // #endif
            
            // #ifdef APP-PLUS
            this.storage = plus.storage;
            this.storageType = 'plus';
            // #endif
            
            // #ifndef H5
            if (!this.storage) {
                this.storage = uni;
                this.storageType = 'uni';
            }
            // #endif
            
            this.logger.info(`Storage initialized: ${this.storageType}`);
        } catch (e) {
            this.logger.error('Failed to initialize storage, using memory fallback');
            this.storage = null;
            this.storageType = 'memory';
        }
    }

    /**
     * 异步初始化（用于需要等待的场景）
     * @returns {Promise<void>}
     */
    async init() {
        this.logger.info('Storage manager initializing...');
        
        // 检查存储是否可用
        if (!this._checkStorageAvailable()) {
            this.logger.warn('Local storage not available, using memory fallback');
            this.storageType = 'memory';
        }
        
        // 初始化加密工具
        this._initCrypto();
        
        // 清理过期数据
        await this._cleanExpiredData();
        
        this.logger.info('Storage manager initialized');
    }

    /**
     * 检查存储是否可用
     * @returns {boolean}
     * @private
     */
    _checkStorageAvailable() {
        try {
            // #ifdef H5
            const testKey = '__storage_test__';
            window.localStorage.setItem(testKey, 'test');
            window.localStorage.removeItem(testKey);
            return true;
            // #endif
            
            // #ifdef MP-WEIXIN
            return true;
            // #endif
            
            // #ifdef APP-PLUS
            return true;
            // #endif
            
            return false;
        } catch (e) {
            return false;
        }
    }

    /**
     * 初始化加密工具
     * @private
     */
    _initCrypto() {
        if (!this.config.encryptData) {
            return;
        }
        
        // 使用简单的 Base64 + 移位加密
        // 生产环境建议使用更安全的加密方式，如 AES
        this.crypto = {
            /**
             * 加密数据
             * @param {string} data 待加密字符串
             * @returns {string}
             */
            encrypt: (data) => {
                // 简单的 Base64 编码 + 字符移位
                const key = this.config.encryptionKey || 'analytics_default_key';
                let result = '';
                
                for (let i = 0; i < data.length; i++) {
                    const charCode = data.charCodeAt(i);
                    const keyChar = key.charCodeAt(i % key.length);
                    result += String.fromCharCode(charCode ^ keyChar);
                }
                
                // Base64 编码
                return this._base64Encode(result);
            },
            
            /**
             * 解密数据
             * @param {string} encryptedData 加密字符串
             * @returns {string}
             */
            decrypt: (encryptedData) => {
                const key = this.config.encryptionKey || 'analytics_default_key';
                
                // Base64 解码
                const decoded = this._base64Decode(encryptedData);
                let result = '';
                
                for (let i = 0; i < decoded.length; i++) {
                    const charCode = decoded.charCodeAt(i);
                    const keyChar = key.charCodeAt(i % key.length);
                    result += String.fromCharCode(charCode ^ keyChar);
                }
                
                return result;
            }
        };
    }

    /**
     * Base64 编码
     * @param {string} str 字符串
     * @returns {string}
     * @private
     */
    _base64Encode(str) {
        // #ifdef H5
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        }));
        // #endif
        
        // #ifndef H5
        // Node.js 环境或 uni-app 环境
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
        // #endif
    }

    /**
     * Base64 解码
     * @param {string} encoded 编码字符串
     * @returns {string}
     * @private
     */
    _base64Decode(encoded) {
        // #ifdef H5
        const decoded = atob(encoded);
        return decodeURIComponent(decoded.split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        // #endif
        
        // #ifndef H5
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let output = '';
        
        encoded = encoded.replace(/[^A-Za-z0-9+/=]/g, '');
        
        for (let i = 0; i < encoded.length; i += 4) {
            const index1 = chars.indexOf(encoded.charAt(i));
            const index2 = chars.indexOf(encoded.charAt(i + 1));
            const index3 = chars.indexOf(encoded.charAt(i + 2));
            const index4 = chars.indexOf(encoded.charAt(i + 3));
            
            output += String.fromCharCode((index1 << 2) | (index2 >> 4));
            
            if (index3 !== -1) {
                output += String.fromCharCode(((index2 & 15) << 4) | (index3 >> 2));
            }
            
            if (index4 !== -1) {
                output += String.fromCharCode(((index3 & 3) << 6) | index4);
            }
        }
        
        return output;
        // #endif
    }

    /**
     * 压缩数据
     * @param {string} data 待压缩字符串
     * @returns {string}
     * @private
     */
    _compressData(data) {
        if (!this.config.compressData || this.storageType === 'memory') {
            return data;
        }
        
        try {
            // #ifdef H5
            // 使用 LZString 进行压缩（需要引入 lz-string 库）
            if (typeof LZString !== 'undefined') {
                return LZString.compressToBase64(data);
            }
            // #endif
            
            // 如果没有压缩库，直接返回原数据
            return data;
        } catch (e) {
            this.logger.warn('Compression failed, using uncompressed data');
            return data;
        }
    }

    /**
     * 解压数据
     * @param {string} compressedData 压缩数据
     * @returns {string}
     * @private
     */
    _decompressData(compressedData) {
        if (!this.config.compressData || this.storageType === 'memory') {
            return compressedData;
        }
        
        try {
            // #ifdef H5
            if (typeof LZString !== 'undefined') {
                return LZString.decompressFromBase64(compressedData);
            }
            // #endif
            
            return compressedData;
        } catch (e) {
            this.logger.warn('Decompression failed, using raw data');
            return compressedData;
        }
    }

    /**
     * 获取带前缀的键名
     * @param {string} key 原始键名
     * @returns {string}
     * @private
     */
    _getPrefixedKey(key) {
        return this.storagePrefix + key;
    }

    /**
     * 设置数据
     * @param {string} key 键名
     * @param {*} value 值（会自动 JSON 序列化）
     * @param {number} expireTime 过期时间（毫秒），0表示永不过期
     */
    set(key, value, expireTime = 0) {
        this.stats.setCount++;
        
        // 更新内存缓存
        this.memoryCache.set(key, {
            value,
            expireTime: expireTime > 0 ? Date.now() + expireTime : 0
        });
        
        try {
            // 序列化为 JSON
            let dataStr = JSON.stringify({
                data: value,
                type: typeof value,
                timestamp: Date.now(),
                expireTime: expireTime > 0 ? Date.now() + expireTime : 0
            });
            
            // 加密
            if (this.config.encryptData && this.crypto) {
                dataStr = this.crypto.encrypt(dataStr);
            }
            
            // 压缩
            dataStr = this._compressData(dataStr);
            
            // 存储
            this._setToStorage(key, dataStr);
            
            // 更新统计
            this._updateStats();
            
        } catch (e) {
            this.logger.error(`Failed to set data for key: ${key}`, e);
        }
    }

    /**
     * 从存储获取数据
     * @param {string} key 键名
     * @returns {*}
     */
    get(key) {
        this.stats.getCount++;
        
        // 先从内存缓存获取
        const cached = this.memoryCache.get(key);
        if (cached) {
            // 检查是否过期
            if (cached.expireTime === 0 || cached.expireTime > Date.now()) {
                return cached.value;
            } else {
                // 已过期，删除
                this.memoryCache.delete(key);
            }
        }
        
        try {
            const dataStr = this._getFromStorage(key);
            
            if (!dataStr) {
                return null;
            }
            
            // 解压
            let decompressed = this._decompressData(dataStr);
            
            // 解密
            if (this.config.encryptData && this.crypto) {
                try {
                    decompressed = this.crypto.decrypt(decompressed);
                } catch (e) {
                    this.logger.warn(`Decryption failed for key: ${key}, data may not be encrypted`);
                }
            }
            
            // 解析 JSON
            const parsed = JSON.parse(decompressed);
            
            // 检查过期
            if (parsed.expireTime && parsed.expireTime > 0 && parsed.expireTime < Date.now()) {
                this.remove(key);
                return null;
            }
            
            // 更新内存缓存
            this.memoryCache.set(key, {
                value: parsed.data,
                expireTime: parsed.expireTime
            });
            
            return parsed.data;
            
        } catch (e) {
            this.logger.warn(`Failed to get data for key: ${key}`, e);
            return null;
        }
    }

    /**
     * 删除数据
     * @param {string} key 键名
     */
    remove(key) {
        this.stats.removeCount++;
        
        // 从内存缓存删除
        this.memoryCache.delete(key);
        
        // 从存储删除
        this._removeFromStorage(key);
        
        this._updateStats();
    }

    /**
     * 批量添加数据到队列
     * @param {Array} events 事件数组
     */
    addToQueue(events) {
        let queue = this.get('event_queue') || [];
        
        // 添加新事件
        queue.push(...events);
        
        // 限制队列大小
        if (queue.length > this.config.maxCacheSize) {
            queue = queue.slice(-this.config.maxCacheSize);
        }
        
        this.set('event_queue', queue);
    }

    /**
     * 获取并清除队列
     * @param {number} count 获取数量，0表示全部
     * @returns {Array}
     */
    shiftFromQueue(count = 0) {
        let queue = this.get('event_queue') || [];
        
        let items = [];
        if (count > 0 && count < queue.length) {
            items = queue.slice(0, count);
            queue = queue.slice(count);
        } else {
            items = [...queue];
            queue = [];
        }
        
        this.set('event_queue', queue);
        
        return items;
    }

    /**
     * 获取队列长度
     * @returns {number}
     */
    getQueueLength() {
        const queue = this.get('event_queue') || [];
        return queue.length;
    }

    /**
     * 写入存储
     * @param {string} key 键名
     * @param {string} dataStr 数据字符串
     * @private
     */
    _setToStorage(key, dataStr) {
        const prefixedKey = this._getPrefixedKey(key);
        
        try {
            // #ifdef H5
            this.storage.setItem(prefixedKey, dataStr);
            // #endif
            
            // #ifdef MP-WEIXIN
            this.storage.setStorageSync(prefixedKey, dataStr);
            // #endif
            
            // #ifdef APP-PLUS
            this.storage.setItem(prefixedKey, dataStr);
            // #endif
        } catch (e) {
            this.logger.error(`Failed to write to storage: ${key}`, e);
            // 存储失败时尝试清理
            this._handleStorageFull();
        }
    }

    /**
     * 从存储读取
     * @param {string} key 键名
     * @returns {string|null}
     * @private
     */
    _getFromStorage(key) {
        const prefixedKey = this._getPrefixedKey(key);
        
        try {
            // #ifdef H5
            return this.storage.getItem(prefixedKey);
            // #endif
            
            // #ifdef MP-WEIXIN
            return this.storage.getStorageSync(prefixedKey);
            // #endif
            
            // #ifdef APP-PLUS
            return this.storage.getItem(prefixedKey);
            // #endif
        } catch (e) {
            this.logger.warn(`Failed to read from storage: ${key}`, e);
            return null;
        }
    }

    /**
     * 从存储删除
     * @param {string} key 键名
     * @private
     */
    _removeFromStorage(key) {
        const prefixedKey = this._getPrefixedKey(key);
        
        try {
            // #ifdef H5
            this.storage.removeItem(prefixedKey);
            // #endif
            
            // #ifdef MP-WEIXIN
            this.storage.removeStorageSync(prefixedKey);
            // #endif
            
            // #ifdef APP-PLUS
            this.storage.removeItem(prefixedKey);
            // #endif
        } catch (e) {
            this.logger.warn(`Failed to remove from storage: ${key}`, e);
        }
    }

    /**
     * 处理存储满的情况
     * @private
     */
    _handleStorageFull() {
        this.logger.warn('Storage is full, cleaning old data...');
        
        // 获取所有键
        const keys = this._getAllKeys();
        
        // 按时间排序，删除最旧的数据
        const keyInfos = keys.map(k => {
            const data = this._getFromStorage(k);
            try {
                const parsed = JSON.parse(data);
                return { key: k, timestamp: parsed.timestamp || 0 };
            } catch (e) {
                return { key: k, timestamp: 0 };
            }
        }).sort((a, b) => a.timestamp - b.timestamp);
        
        // 删除前30%的数据
        const deleteCount = Math.ceil(keyInfos.length * 0.3);
        for (let i = 0; i < deleteCount; i++) {
            const key = keyInfos[i].key;
            const originalKey = key.replace(this.storagePrefix, '');
            this._removeFromStorage(originalKey);
        }
        
        this.logger.info(`Cleaned ${deleteCount} old data entries`);
    }

    /**
     * 获取所有存储键
     * @returns {Array}
     * @private
     */
    _getAllKeys() {
        try {
            // #ifdef H5
            const keys = [];
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key.startsWith(this.storagePrefix)) {
                    keys.push(key);
                }
            }
            return keys;
            // #endif
            
            // #ifdef MP-WEIXIN
            const info = this.storage.getStorageInfoSync();
            return info.keys.filter(k => k.startsWith(this.storagePrefix));
            // #endif
            
            // #ifdef APP-PLUS
            return plus.storage.getAllData() || [];
            // #endif
        } catch (e) {
            return [];
        }
    }

    /**
     * 清理过期数据
     * @private
     */
    async _cleanExpiredData() {
        const keys = this._getAllKeys();
        const now = Date.now();
        
        for (const key of keys) {
            try {
                const dataStr = this._getFromStorage(key.replace(this.storagePrefix, ''));
                if (dataStr) {
                    // 解压
                    let decompressed = this._decompressData(dataStr);
                    
                    // 解密
                    if (this.config.encryptData && this.crypto) {
                        try {
                            decompressed = this.crypto.decrypt(decompressed);
                        } catch (e) {
                            continue;
                        }
                    }
                    
                    const parsed = JSON.parse(decompressed);
                    
                    if (parsed.expireTime && parsed.expireTime > 0 && parsed.expireTime < now) {
                        this._removeFromStorage(key.replace(this.storagePrefix, ''));
                    }
                }
            } catch (e) {
                // 解析失败，跳过
            }
        }
    }

    /**
     * 更新统计数据
     * @private
     */
    _updateStats() {
        this.stats.keyCount = this._getAllKeys().length;
        
        let totalSize = 0;
        for (const key of this._getAllKeys()) {
            const value = this._getFromStorage(key);
            if (value) {
                totalSize += value.length;
            }
        }
        this.stats.totalSize = totalSize;
    }

    /**
     * 获取存储统计
     * @returns {Object}
     */
    getStats() {
        this._updateStats();
        
        return {
            ...this.stats,
            queueLength: this.getQueueLength(),
            eventCount: (this.get('pending_events') || []).length,
            memoryCacheSize: this.memoryCache.size
        };
    }

    /**
     * 清除所有数据
     */
    clearAll() {
        this.logger.info('Clearing all storage data...');
        
        // 清除内存缓存
        this.memoryCache.clear();
        
        // 清除存储
        const keys = this._getAllKeys();
        for (const key of keys) {
            this.storage.removeItem(key);
        }
        
        // 重置统计
        this.stats = {
            getCount: 0,
            setCount: 0,
            removeCount: 0,
            totalSize: 0,
            keyCount: 0
        };
        
        this.logger.info('All storage data cleared');
    }

    /**
     * 销毁存储管理器
     */
    destroy() {
        this.memoryCache.clear();
        this.logger.info('Storage manager destroyed');
    }
}

export default StorageManager;
