/**
 * =====================================================
 * 工具函数模块 - Utils
 * =====================================================
 * 
 * 包含常用的工具函数：
 * - UUID 生成
 * - 字符串处理
 * - 日期格式化
 * - 数据验证
 * - 对象合并
 */

/**
 * 生成 UUID v4
 * @returns {string}
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 生成短 ID
 * @param {number} length 长度
 * @returns {string}
 */
export function generateShortId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

/**
 * 深拷贝对象
 * @param {*} obj 对象
 * @returns {*}
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
    if (obj instanceof Object) {
        const copy = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = deepClone(obj[key]);
            }
        }
        return copy;
    }
    
    return obj;
}

/**
 * 防抖函数
 * @param {Function} func 函数
 * @param {number} wait 等待时间
 * @param {boolean} immediate 是否立即执行
 * @returns {Function}
 */
export function debounce(func, wait = 300, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) {
                func.apply(this, args);
            }
        };
        
        const callNow = immediate && !timeout;
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) {
            func.apply(this, args);
        }
    };
}

/**
 * 节流函数
 * @param {Function} func 函数
 * @param {number} limit 时间限制
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * 格式化日期
 * @param {Date|number} date 日期
 * @param {string} format 格式
 * @returns {string}
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = date instanceof Date ? date : new Date(date);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds)
        .replace('SSS', ms);
}

/**
 * 格式化时间戳为相对时间
 * @param {number} timestamp 时间戳
 * @returns {string}
 */
export function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    if (seconds > 0) return `${seconds}秒前`;
    return '刚刚';
}

/**
 * 判断是否为对象
 * @param {*} obj 对象
 * @returns {boolean}
 */
export function isObject(obj) {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * 判断是否为数组
 * @param {*} arr 数组
 * @returns {boolean}
 */
export function isArray(arr) {
    return Array.isArray(arr);
}

/**
 * 判断是否为空
 * @param {*} value 值
 * @returns {boolean}
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * 安全获取对象属性
 * @param {Object} obj 对象
 * @param {string} path 属性路径
 * @param {*} defaultValue 默认值
 * @returns {*}
 */
export function safeGet(obj, path, defaultValue = undefined) {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = result[key];
    }
    
    return result ?? defaultValue;
}

/**
 * 安全设置对象属性
 * @param {Object} obj 对象
 * @param {string} path 属性路径
 * @param {*} value 值
 */
export function safeSet(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
        if (current[key] === undefined || current[key] === null) {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[lastKey] = value;
}

/**
 * 合并对象
 * @param {...Object} objects 对象
 * @returns {Object}
 */
export function merge(...objects) {
    return Object.assign({}, ...objects);
}

/**
 * 深度合并对象
 * @param {...Object} objects 对象
 * @returns {Object}
 */
export function deepMerge(...objects) {
    const result = {};
    
    for (const obj of objects) {
        if (!obj) continue;
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (isObject(obj[key]) && isObject(result[key])) {
                    result[key] = deepMerge(result[key], obj[key]);
                } else {
                    result[key] = deepClone(obj[key]);
                }
            }
        }
    }
    
    return result;
}

/**
 * URL 参数解析
 * @param {string} url URL
 * @returns {Object}
 */
export function parseQueryString(url) {
    const query = url.split('?')[1] || '';
    const params = {};
    
    query.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key) {
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
    });
    
    return params;
}

/**
 * 对象转 URL 参数
 * @param {Object} params 参数对象
 * @returns {string}
 */
export function buildQueryString(params) {
    return Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
}

/**
 * 限制数字在范围内
 * @param {number} num 数字
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {number}
 */
export function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

/**
 * 生成哈希值
 * @param {string} str 字符串
 * @returns {number}
 */
export function hashCode(str) {
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return hash;
}

/**
 * 等待指定时间
 * @param {number} ms 毫秒
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 * @param {Function} fn 函数
 * @param {number} retries 重试次数
 * @param {number} delay 延迟时间
 * @returns {Promise<*>}
 */
export async function retry(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (e) {
            if (i === retries - 1) {
                throw e;
            }
            await sleep(delay * (i + 1));
        }
    }
}

export default {
    generateUUID,
    generateShortId,
    deepClone,
    debounce,
    throttle,
    formatDate,
    formatRelativeTime,
    isObject,
    isArray,
    isEmpty,
    safeGet,
    safeSet,
    merge,
    deepMerge,
    parseQueryString,
    buildQueryString,
    clamp,
    hashCode,
    sleep,
    retry
};
