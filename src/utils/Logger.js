/**
 * =====================================================
 * 日志模块 - Logger
 * =====================================================
 * 
 * 功能说明：
 * - 统一日志输出
 * - 支持不同日志级别
 * - 开发时实时查看日志
 * - 日志分级显示（颜色区分）
 * - 日志格式化
 * - 日志持久化（可选）
 */

export class Logger {
    /**
     * 构造函数
     * @param {boolean} enable 是否启用日志
     * @param {Object} options 配置选项
     */
    constructor(enable = false, options = {}) {
        this.enable = enable;
        
        // 日志级别
        this.level = options.level || Logger.levels.DEBUG;
        
        // 日志前缀
        this.prefix = options.prefix || '[Analytics]';
        
        // 时间格式
        this.timeFormat = options.timeFormat || 'HH:mm:ss.SSS';
        
        // 最大日志条数（内存中）
        this.maxLogs = options.maxLogs || 500;
        
        // 日志存储
        this.logs = [];
        
        // 日志回调（用于实时查看）
        this.logCallback = null;
        
        // 是否启用持久化
        this.enablePersist = options.enablePersist || false;
        
        // 日志级别映射
        this.levelMap = {
            [Logger.levels.DEBUG]: { color: '#999', label: 'DEBUG', priority: 0 },
            [Logger.levels.INFO]: { color: '#1890ff', label: 'INFO', priority: 1 },
            [Logger.levels.WARN]: { color: '#faad14', label: 'WARN', priority: 2 },
            [Logger.levels.ERROR]: { color: '#f5222d', label: 'ERROR', priority: 3 }
        };
    }

    /**
     * 日志级别常量
     */
    static get levels() {
        return {
            DEBUG: 'debug',
            INFO: 'info',
            WARN: 'warn',
            ERROR: 'error'
        };
    }

    /**
     * 启用日志
     */
    setEnable(enable) {
        this.enable = enable;
    }

    /**
     * 设置日志级别
     * @param {string} level 日志级别
     */
    setLevel(level) {
        if (this.levelMap[level] !== undefined) {
            this.level = level;
        }
    }

    /**
     * 设置日志回调（用于实时查看）
     * @param {Function} callback 回调函数
     */
    setLogCallback(callback) {
        this.logCallback = callback;
    }

    /**
     * 启用日志持久化
     * @param {boolean} enable 是否启用
     */
    setPersist(enable) {
        this.enablePersist = enable;
    }

    /**
     * 格式化时间
     * @returns {string}
     * @private
     */
    _formatTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');
        
        return `${hours}:${minutes}:${seconds}.${ms}`;
    }

    /**
     * 格式化日志消息
     * @param {string} level 日志级别
     * @param {string} message 消息
     * @param {...*} args 其他参数
     * @returns {Array}
     * @private
     */
    _format(level, message, ...args) {
        const time = this._formatTime();
        const levelInfo = this.levelMap[level];
        
        const formattedMessage = args.length > 0 
            ? `${message} ${args.map(a => this._formatArg(a)).join(' ')}`
            : message;
        
        return [time, level, levelInfo, formattedMessage];
    }

    /**
     * 格式化参数
     * @param {*} arg 参数
     * @returns {string}
     * @private
     */
    _formatArg(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg);
            } catch (e) {
                return String(arg);
            }
        }
        
        return String(arg);
    }

    /**
     * 输出日志
     * @param {string} level 日志级别
     * @param {string} message 消息
     * @param {...*} args 其他参数
     * @private
     */
    _log(level, message, ...args) {
        if (!this.enable) {
            return;
        }
        
        // 检查日志级别
        const currentPriority = this.levelMap[this.level].priority;
        const targetPriority = this.levelMap[level].priority;
        
        if (targetPriority < currentPriority) {
            return;
        }
        
        const [time, levelName, levelInfo, formattedMessage] = this._format(level, message, ...args);
        
        // 构建日志对象
        const logEntry = {
            time,
            level: levelName,
            levelLabel: levelInfo.label,
            message: formattedMessage,
            timestamp: Date.now()
        };
        
        // 添加到内存
        this._addToMemory(logEntry);
        
        // 输出到控制台
        this._outputToConsole(logEntry, levelInfo);
        
        // 持久化
        if (this.enablePersist) {
            this._persistLog(logEntry);
        }
        
        // 回调
        if (this.logCallback) {
            this.logCallback(logEntry);
        }
    }

    /**
     * 添加到内存
     * @param {Object} logEntry 日志条目
     * @private
     */
    _addToMemory(logEntry) {
        this.logs.push(logEntry);
        
        // 限制条数
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    /**
     * 输出到控制台
     * @param {Object} logEntry 日志条目
     * @param {Object} levelInfo 级别信息
     * @private
     */
    _outputToConsole(logEntry, levelInfo) {
        const prefix = `${this.prefix}`;
        const timePrefix = `%c${logEntry.time}`;
        const levelPrefix = `%c[${logEntry.levelLabel}]`;
        const message = `%c${logEntry.message}`;
        
        const styles = [
            `color: ${levelInfo.color}; font-weight: normal;`,
            `color: ${levelInfo.color}; font-weight: bold;`,
            `color: ${levelInfo.color}; font-weight: normal;`
        ];
        
        // #ifdef H5
        console.groupCollapsed
            ? console.groupCollapsed(`${prefix} %c${logEntry.time} %c[${logEntry.levelLabel}] %c${logEntry.message}`, 
                `color: ${levelInfo.color}; font-weight: normal;`,
                `color: ${levelInfo.color}; font-weight: bold;`,
                `color: ${levelInfo.color}; font-weight: normal;`
            )
            : console.log(`${prefix} ${timePrefix} ${levelPrefix} ${message}`, ...styles);
        
        // 如果是对象参数，额外打印
        const args = [];
        const msgParts = logEntry.message.split(' ');
        if (msgParts.length > 1 && msgParts[msgParts.length - 1].startsWith('{')) {
            try {
                const objStr = msgParts.slice(-1)[0];
                JSON.parse(objStr);
            } catch (e) {
                // 不是 JSON 对象，不需要额外处理
            }
        }
        
        if (console.groupCollapsed) {
            console.groupEnd();
        }
        // #endif
        
        // #ifndef H5
        console.log(`${prefix} [${logEntry.time}] [${logEntry.levelLabel}] ${logEntry.message}`);
        // #endif
    }

    /**
     * 持久化日志
     * @param {Object} logEntry 日志条目
     * @private
     */
    _persistLog(logEntry) {
        try {
            // #ifdef H5
            const logs = JSON.parse(localStorage.getItem('analytics_logs') || '[]');
            logs.push(logEntry);
            
            // 限制条数
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            localStorage.setItem('analytics_logs', JSON.stringify(logs));
            // #endif
        } catch (e) {
            // 忽略持久化错误
        }
    }

    /**
     * Debug 日志
     * @param {string} message 消息
     * @param {...*} args 其他参数
     */
    debug(message, ...args) {
        this._log(Logger.levels.DEBUG, message, ...args);
    }

    /**
     * Info 日志
     * @param {string} message 消息
     * @param {...*} args 其他参数
     */
    info(message, ...args) {
        this._log(Logger.levels.INFO, message, ...args);
    }

    /**
     * Warn 日志
     * @param {string} message 消息
     * @param {...*} args 其他参数
     */
    warn(message, ...args) {
        this._log(Logger.levels.WARN, message, ...args);
    }

    /**
     * Error 日志
     * @param {string} message 消息
     * @param {...*} args 其他参数
     */
    error(message, ...args) {
        this._log(Logger.levels.ERROR, message, ...args);
    }

    /**
     * 获取所有日志
     * @returns {Array}
     */
    getLogs() {
        return [...this.logs];
    }

    /**
     * 获取日志统计
     * @returns {Object}
     */
    getStats() {
        const stats = {
            total: this.logs.length,
            debug: 0,
            info: 0,
            warn: 0,
            error: 0
        };
        
        for (const log of this.logs) {
            stats[log.level]++;
        }
        
        return stats;
    }

    /**
     * 清除日志
     */
    clear() {
        this.logs = [];
        
        // #ifdef H5
        if (this.enablePersist) {
            localStorage.removeItem('analytics_logs');
        }
        // #endif
    }

    /**
     * 导出日志
     * @returns {string}
     */
    export() {
        const exportData = {
            exportTime: new Date().toISOString(),
            sdkVersion: '1.0.0',
            logs: this.logs,
            stats: this.getStats()
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * 导出为可下载文件（H5）
     * @param {string} filename 文件名
     */
    // #ifdef H5
    download(filename = 'analytics_logs.json') {
        const data = this.export();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    // #endif
}

export default Logger;
