// ==UserScript==
// @name         B站关注管理
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  高效管理B站关注列表，支持批量取关、智能筛选等功能。支持智能筛选、实时粉丝数获取、批量操作等功能
// @author       苡淞（Yis_Rime）
// @homepage     https://github.com/YisRime/BilibiliFollowManage
// @match        https://space.bilibili.com/*/relation/follow*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.bilibili.com
// @license      AGPLv3
// ==/UserScript==

(function() {
    'use strict';      // 配置常量
    const CONFIG = {
        CACHE_DURATION: 24 * 60 * 60 * 1000,
        API_DELAY: 500, // 进一步增加API延迟
        RETRY_DELAY: 1000, // 增加重试延迟
        MAX_RETRIES: 2, // 减少重试次数避免卡死
        PAGE_SIZE: 100, // 减少页面大小
        SCROLL_DEBOUNCE: 200, // 增加滚动防抖时间
        FILTER_DEBOUNCE: 250, // 增加筛选防抖时间
        BATCH_DELAY: 200, // 增加批量操作延迟
        PARALLEL_FANS_COUNT: 1,
        FANS_BATCH_SIZE: 1,
        FANS_API_DELAY: 500, // 大幅增加粉丝数API延迟
        FANS_RETRY_DELAY: 1000, // 大幅增加重试延迟
        MAX_CONCURRENT_REQUESTS: 1, // 限制并发请求数
        REQUEST_TIMEOUT: 10000, // 请求超时时间
        MAX_RENDER_ITEMS: 5000, // 最大渲染项目数
        VIRTUAL_SCROLL_THRESHOLD: 200 // 虚拟滚动阈值
    };
      // 统一文字提示
    const MESSAGES = {
        LOADING: '正在加载数据...',
        LOADING_PAGE: '正在加载第{0}页...',
        RETRY: '加载失败，正在重试...',
        ERROR_PERMISSION: '权限不足或用户隐私设置不允许访问',
        ERROR_API: 'API错误: {0}',
        ERROR_NETWORK: '网络请求失败',
        ERROR_NO_DATA: '未能获取关注列表，请检查是否已登录',
        ERROR_NO_UID: '无法获取用户UID，请确保已登录',
        CONFIRM_UNFOLLOW: '确定要取关以下 {0} 个用户吗？\n\n{1}\n\n此操作不可撤销！',
        CONFIRM_FETCH_ALL: '确定要获取所有用户的粉丝数吗？这可能需要一些时间。',
        CONFIRM_CLEAR_CACHE: '确定要清除缓存吗？下次打开将重新加载关注列表。',
        SUCCESS_CACHE_CLEARED: '缓存已清除！',
        SUCCESS_UNFOLLOW: '批量取关完成！\n成功: {0}个，失败: {1}个',
        SUCCESS_FETCH_FANS: '粉丝数获取完成！\n成功处理: {0}/{1} 个用户',
        PROGRESS_UNFOLLOW: '取关进度: {0}/{1} (成功{2}个)',        PROGRESS_FETCH: '获取中... {0}/{1} ({2}%)',
        SELECT_USERS: '请选择要取关的用户'
    };// 添加样式
    GM_addStyle(`
        .follow-manager-btn { position: fixed; top: 100px; right: 30px; z-index: 9999; background: #00a1d6; color: #fff; padding: 10px 20px; border-radius: 6px; cursor: pointer; border: none; box-shadow: 0 4px 12px rgba(0,161,214,0.3); transition: all 0.3s; font-size: 14px; font-weight: 500; }
        .follow-manager-btn:hover { background: #0088cc; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,161,214,0.4); }
        .follow-manager-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
        .modal-content { background: #fff; border-radius: 12px; width: 95vw; max-width: 1600px; height: 90vh; max-height: 900px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
        .modal-header { padding: 20px 25px; border-bottom: 1px solid #e9ecef; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; }
        .modal-header h3 { margin: 0; font-size: 20px; font-weight: 600; }
        .close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #fff; transition: color 0.2s; margin-left: auto; }
        .close-btn:hover { color: #ff4757; }
        .modal-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 20px; }
        .modal-filters { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #dee2e6; }
        .filter-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .filter-row input, .filter-row select { padding: 8px 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 13px; background: #fff; transition: all 0.2s; }
        .filter-row input:focus, .filter-row select:focus { outline: none; border-color: #007bff; box-shadow: 0 0 0 2px rgba(0,123,255,0.25); }
        .filter-row input[type="text"] { flex: 1; min-width: 300px; }
        .filter-row input[type="date"] { min-width: 120px; }
        .filter-row select { min-width: 100px; }
        .filter-row label { font-size: 13px; white-space: nowrap; color: #495057; font-weight: 500; }
        .modal-list { flex: 1; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 8px; background: #fff; }
        .modal-stats { padding: 15px 20px; background: #f8f9fa; border-top: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; font-weight: 500; }
        .follow-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .follow-table th { background: #fff; padding: 12px 8px; border-bottom: 2px solid #dee2e6; text-align: left; font-weight: 600; position: sticky; top: 0; z-index: 2; cursor: pointer; user-select: none; transition: all 0.2s; white-space: nowrap; }
        .follow-table th:hover { background: #f8f9fa; }
        .follow-table th.sortable::after { content: '↕'; margin-left: 4px; color: #6c757d; font-size: 11px; }
        .follow-table th.sort-asc::after { content: '↑'; color: #007bff; }
        .follow-table th.sort-desc::after { content: '↓'; color: #007bff; }
        .follow-table td { padding: 10px 8px; border-bottom: 1px solid #f1f3f4; vertical-align: middle; word-wrap: break-word; }
        .follow-table tr:hover { background: #f8f9fa; }
        .follow-table tr.selected { background: #e3f2fd; }
        .follow-table img { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .batch-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .batch-actions button { padding: 8px 16px; border: 1px solid #007bff; border-radius: 4px; background: #007bff; color: white; cursor: pointer; transition: all 0.2s; font-size: 13px; }
        .batch-actions button:hover { background: #0056b3; }
        .batch-actions button:disabled { background: #6c757d; border-color: #6c757d; cursor: not-allowed; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .loading-spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid #007bff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px; }
        .follow-table th:nth-child(1) { width: 40px; } .follow-table th:nth-child(2) { width: 50px; } .follow-table th:nth-child(3) { width: 80px; max-width: 80px; } .follow-table th:nth-child(4) { width: 80px; } .follow-table th:nth-child(5) { width: 100px; } .follow-table th:nth-child(6) { width: 600px; max-width: 600px; } .follow-table th:nth-child(7) { width: 120px; }
        .follow-table td:nth-child(3), .follow-table td:nth-child(6) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .modal-list::-webkit-scrollbar { width: 18px; } .modal-list::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 9px; } .modal-list::-webkit-scrollbar-thumb { background: #888; border-radius: 9px; min-height: 30px; } .modal-list::-webkit-scrollbar-thumb:hover { background: #555; }
    `);    // 缓存管理
    const cache = {
        memoryCache: new Map(), // 内存缓存
        filterCache: new Map(), // 筛选结果缓存
        debounceTimers: new Map(), // 防抖定时器
        
        get() {
            try {
                const cached = localStorage.getItem('bilibili_follow_cache');
                if (cached) {
                    const data = JSON.parse(cached);
                    if (data.expiry > Date.now()) {
                        this.memoryCache.set('followList', data.list);
                        return data.list;
                    }
                }
            } catch (e) { console.warn('读取缓存失败:', e); }
            return null;
        },
        set(list) {
            try {
                this.memoryCache.set('followList', list);
                localStorage.setItem('bilibili_follow_cache', JSON.stringify({
                    list, expiry: Date.now() + CONFIG.CACHE_DURATION
                }));
            } catch (e) { console.warn('保存缓存失败:', e); }
        },
        getUserInfo(mid) {
            return this.memoryCache.get(`user_${mid}`);
        },
        setUserInfo(mid, info) {
            this.memoryCache.set(`user_${mid}`, info);
        },
        // 从本地存储获取用户信息
        getUserInfoFromLocal(mid) {
            try {
                const cached = localStorage.getItem(`bilibili_user_${mid}`);
                if (cached) {
                    const data = JSON.parse(cached);
                    // 检查缓存是否过期（24小时）
                    if (data.timestamp && Date.now() - data.timestamp < CONFIG.CACHE_DURATION) {
                        return data;
                    }
                }
            } catch (e) { 
                console.warn(`读取用户${mid}本地缓存失败:`, e); 
            }
            return null;
        },        // 保存用户信息到本地存储
        setUserInfoToLocal(mid, info) {
            try {
                localStorage.setItem(`bilibili_user_${mid}`, JSON.stringify(info));
            } catch (e) { 
                console.warn(`保存用户${mid}本地缓存失败:`, e); 
            }
        },
        getFilterResult(key) {
            return this.filterCache.get(key);
        },
        setFilterResult(key, result) {
            if (this.filterCache.size > 10) {
                const firstKey = this.filterCache.keys().next().value;
                this.filterCache.delete(firstKey);
            }
            this.filterCache.set(key, result);
        },
        debounce(key, fn, delay) {
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            const timer = setTimeout(() => {
                fn();
                this.debounceTimers.delete(key);
            }, delay);
            this.debounceTimers.set(key, timer);
        }
    };

    // 内存管理和错误恢复
    const memoryManager = {
        // 清理内存缓存
        cleanMemoryCache() {
            if (cache.memoryCache.size > 1000) {
                const entries = Array.from(cache.memoryCache.entries());
                // 保留最近使用的500个
                const recentEntries = entries.slice(-500);
                cache.memoryCache.clear();
                recentEntries.forEach(([key, value]) => {
                    cache.memoryCache.set(key, value);
                });
            }
        },
        
        // 检查页面响应性
        checkPageResponsiveness() {
            let lastTime = performance.now();
            return new Promise(resolve => {
                requestAnimationFrame(() => {
                    const currentTime = performance.now();
                    const lagTime = currentTime - lastTime;
                    resolve(lagTime < 50); // 如果延迟超过50ms认为页面卡顿
                });
            });
        },
        
        // 强制垃圾回收提示
        triggerGC() {
            if (window.gc && typeof window.gc === 'function') {
                try {
                    window.gc();
                } catch (e) {
                    // 忽略错误
                }
            }
        }
    };

    // 操作监控器 - 避免长时间运行操作卡死页面
    const operationMonitor = {
        activeOperations: new Map(),
        
        // 注册操作
        register(id, operation) {
            this.activeOperations.set(id, {
                operation,
                startTime: Date.now(),
                lastUpdate: Date.now()
            });
        },
        
        // 更新操作时间戳
        update(id) {
            const op = this.activeOperations.get(id);
            if (op) {
                op.lastUpdate = Date.now();
            }
        },
        
        // 注销操作
        unregister(id) {
            this.activeOperations.delete(id);
        },
        
        // 检查是否有长时间运行的操作
        checkLongRunningOperations() {
            const now = Date.now();
            const maxDuration = 60000; // 60秒
            
            for (const [id, op] of this.activeOperations) {
                if (now - op.startTime > maxDuration) {
                    console.warn(`操作 ${id} 已运行超过60秒，可能出现卡死`);
                    // 可以在这里添加自动取消逻辑
                }
            }
        }
    };

    // 定期检查长时间运行的操作
    setInterval(() => {
        operationMonitor.checkLongRunningOperations();
    }, 30000); // 每30秒检查一次

    // 页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
        // 清理定时器
        cache.debounceTimers.forEach(timer => clearTimeout(timer));
        cache.debounceTimers.clear();
        
        // 清理内存缓存
        memoryManager.cleanMemoryCache();
    });

    // 定期清理内存
    setInterval(() => {
        memoryManager.cleanMemoryCache();
        memoryManager.triggerGC();
    }, 60000); // 每分钟清理一次

    // 工具函数
    const formatMessage = (template, ...args) => {
        return template.replace(/\{(\d+)\}/g, (match, index) => args[index] || match);
    };

    const getUserId = () => {
        const uidMatch = location.pathname.match(/space\/(\d+)/);
        if (uidMatch) return uidMatch[1];

        const cookieMatch = document.cookie.match(/DedeUserID=(\d+)/);
        if (cookieMatch) return cookieMatch[1];

        try {
            const linkElement = document.querySelector('.h-info a[href*="/space/"]');
            if (linkElement) {
                const hrefMatch = linkElement.href.match(/space\/(\d+)/);
                if (hrefMatch) return hrefMatch[1];
            }

            if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.mid) return window.__INITIAL_STATE__.mid;
            if (window.BilibiliPlayer && window.BilibiliPlayer.mid) return window.BilibiliPlayer.mid;
        } catch (e) {}

        return null;
    };    const getCsrfToken = () => document.cookie.match(/bili_jct=([^;]+)/)?.[1] || '';    // 获取用户粉丝数信息
    const fetchUserInfo = async (mid) => {
        // 检查内存缓存
        const cached = cache.getUserInfo(mid);
        if (cached) return cached;

        // 检查本地存储缓存
        const localCached = cache.getUserInfoFromLocal(mid);
        if (localCached) {
            cache.setUserInfo(mid, localCached);
            return localCached;
        }

        // 添加请求控制器来处理超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

        try {
            const res = await fetch(`https://api.bilibili.com/x/relation/stat?vmid=${mid}`, {
                credentials: 'include',
                headers: { 'Referer': 'https://space.bilibili.com/' },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            
            if (data.code === 0 && data.data) {
                const info = { 
                    follower: data.data.follower || 0, 
                    following: data.data.following || 0,
                    timestamp: Date.now()
                };
                cache.setUserInfo(mid, info);
                cache.setUserInfoToLocal(mid, info);
                return info;
            } else if (data.code === -404 || data.code === -400) {
                const info = { follower: -1, following: -1, timestamp: Date.now() };
                cache.setUserInfo(mid, info);
                cache.setUserInfoToLocal(mid, info);
                return info;
            }
        } catch (error) {
            clearTimeout(timeoutId);
            // 静默处理错误，避免卡死
            console.warn(`获取用户${mid}信息失败:`, error.message);
        }
        
        // 默认返回0并缓存
        const defaultInfo = { follower: 0, following: 0, timestamp: Date.now() };
        cache.setUserInfo(mid, defaultInfo);
        cache.setUserInfoToLocal(mid, defaultInfo);
        return defaultInfo;
    };

    // 取消关注函数
    const unfollowUser = async (mid) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://api.bilibili.com/x/relation/modify',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': document.cookie
                },
                data: `fid=${mid}&act=2&re_src=11&csrf=${getCsrfToken()}`,
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.code === 0) {
                            resolve(data);
                        } else {
                            reject(new Error(data.message || '取关失败'));
                        }
                    } catch (e) {
                        reject(new Error('响应解析失败'));
                    }
                },
                onerror: function(error) {
                    reject(new Error('网络请求失败'));
                }
            });
        });
    };    class FollowManager {
        constructor() {
            this.modal = null;
            this.isLoading = false;
            this.isOperationCancelled = false;
            this.createButton();
        }

        createButton() {
            const btn = document.createElement('button');
            btn.innerText = '管理关注';
            btn.className = 'follow-manager-btn';
            btn.onclick = () => this.toggleModal();
            document.body.appendChild(btn);
            this.btn = btn;
        }        async toggleModal() {
            if (this.modal) return this.closeModal();
            if (this.isLoading) return;
            
            this.setLoading(true);
            try {
                this.modal = new FollowModal([], () => this.closeModal());
                const cachedList = cache.get();
                if (cachedList?.length > 0) {
                    this.modal.updateData(cachedList);
                    // 自动开始获取粉丝数
                    this.modal.fetchBatchUsersFansRealtime(cachedList);
                    return;
                }
                
                this.modal.showLoading(MESSAGES.LOADING);
                const list = await this.fetchFollowList();
                if (list.length > 0) {
                    cache.set(list);
                    this.modal.updateData(list);
                } else {
                    this.modal.showError(MESSAGES.ERROR_NO_DATA);
                }
            } catch (error) {
                console.error('加载失败:', error);
                if (this.modal) {
                    this.modal.showError('加载失败: ' + error.message);
                } else {
                    alert('加载失败: ' + error.message);
                }
            } finally {
                this.setLoading(false);
            }
        }        closeModal() {
            // 取消所有进行中的操作
            this.isOperationCancelled = true;
            if (this.modal) {
                this.modal.cancelOperations();
                this.modal.remove();
                this.modal = null;
            }
            // 重置取消状态
            this.isOperationCancelled = false;
        }

        setLoading(loading) {
            this.isLoading = loading;
            this.btn.disabled = loading;
        }async fetchFollowList() {
            const uid = getUserId();
            if (!uid) throw new Error(MESSAGES.ERROR_NO_UID);

            let page = 1, result = [];
            const maxRetries = CONFIG.MAX_RETRIES;

            while (true) {
                let success = false;

                for (let retry = 0; retry < maxRetries && !success; retry++) {
                    try {
                        if (this.modal) {
                            this.modal.showLoading(formatMessage(MESSAGES.LOADING_PAGE, page));
                        }

                        const res = await fetch(`https://api.bilibili.com/x/relation/followings?vmid=${uid}&pn=${page}&ps=${CONFIG.PAGE_SIZE}&order=desc&order_type=attention`, {
                            credentials: 'include',
                            headers: { 'Referer': 'https://space.bilibili.com/' }
                        });

                        if (!res.ok) throw new Error(`HTTP ${res.status}`);

                        const data = await res.json();
                        
                        if (data.code === 0 && data.data?.list) {
                            // 为新用户初始化粉丝数显示
                            data.data.list.forEach(user => {
                                if (!user.follower && user.follower !== 0) {
                                    user.follower = null; // 标记为未获取
                                }
                            });
                            
                            result = result.concat(data.data.list);
                            
                            if (data.data.list.length < CONFIG.PAGE_SIZE) break;
                            page++;
                            success = true;
                            await new Promise(resolve => setTimeout(resolve, CONFIG.API_DELAY));
                        } else if ([22007, 22115].includes(data.code)) {
                            throw new Error(MESSAGES.ERROR_PERMISSION);
                        } else {
                            throw new Error(formatMessage(MESSAGES.ERROR_API, data.message));
                        }
                    } catch (error) {
                        console.warn(`获取第${page}页失败 (重试${retry + 1}/${maxRetries}):`, error.message);
                        if (retry < maxRetries - 1) {
                            if (this.modal) {
                                this.modal.showLoading(MESSAGES.RETRY);
                            }
                            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * Math.pow(2, retry)));
                        }
                    }
                }
                
                if (!success) break;
            }

            // 获取完所有数据后一次性更新界面
            if (this.modal && result.length > 0) {
                this.modal.updateData(result);
                // 开始获取所有用户的粉丝数，并实时更新
                this.modal.fetchBatchUsersFansRealtime(result);
            }

            return result;
        }
    }    // 统一的模态窗口类
    class FollowModal {
        constructor(list, onClose) {
            this.list = list;
            this.filteredList = list;
            this.onClose = onClose;
            this.sortField = 'mtime';
            this.sortOrder = 'desc';
            this.scrollTimeout = null;
            this.overlay = null;
            this.isCancelled = false;
            this.currentOperations = new Set(); // 跟踪当前进行的操作
            this.createModal();
        }// 显示状态消息
        showMessage(message, isError = false) {
            const tbody = this.overlay?.querySelector('#table-tbody');
            if (tbody) {
                const icon = isError ? '⚠️' : '<div class="loading-spinner"></div>';
                const color = isError ? '#dc3545' : '#007bff';
                tbody.innerHTML = `
                    <tr><td colspan="8" style="text-align: center; padding: 40px;">
                        <div style="color: ${color}; font-size: 16px;">
                            ${icon}${message}
                        </div>
                    </td></tr>
                `;
            }
        }

        showLoading(message) { this.showMessage(message); }
        showError(message) { this.showMessage(message, true); }

        // 更新数据
        updateData(newList) {
            this.list = newList;
            this.filteredList = newList;
            const totalCountSpan = this.overlay?.querySelector('#modal-total-count');
            if (totalCountSpan) totalCountSpan.textContent = newList.length;
            this.renderTable(this.filteredList);
        }        // 移除模态窗口
        remove() {
            if (this.overlay) {
                this.overlay.remove();
                this.overlay = null;
            }
        }        // 取消所有操作
        cancelOperations() {
            this.isCancelled = true;
            
            // 统计已获取的数据
            const processedUsers = this.list.filter(user => user.follower !== null && user.follower !== undefined);
            const totalUsers = this.list.length;
            
            // 保存已获取的数据到缓存
            cache.set(this.list);
            
            this.currentOperations.clear();
            
            // 检查overlay是否存在再操作
            if (this.overlay) {
                // 恢复按钮状态
                this.setButtonsState(false);
                this.showCancelButton(false);
                
                // 恢复按钮文本
                const unfollowBtn = this.overlay.querySelector('#modal-unfollow-selected');
                const fetchBtn = this.overlay.querySelector('#modal-fetch-fans');
                if (unfollowBtn) unfollowBtn.textContent = '取关选中用户';
                if (fetchBtn) fetchBtn.textContent = '获取全部粉丝数';
            }
            
            // 如果有已获取的数据，显示统计信息
            if (processedUsers.length > 0) {
                setTimeout(() => {
                    alert(`操作已终止\n\n已成功获取 ${processedUsers.length}/${totalUsers} 个用户的粉丝数据\n数据已保存到缓存中`);
                }, 100);
            }
        }createModal() {
            // 移除已存在的模态窗口
            const existingModal = document.querySelector('.modal-overlay');
            if (existingModal) {
                existingModal.remove();
            }

            this.overlay = document.createElement('div');
            this.overlay.className = 'modal-overlay';
            this.overlay.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>所有关注</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="modal-filters">
                            <div class="filter-row">
                                <input id='modal-filter' type='text' placeholder='搜索UP主昵称'>                                <select id='modal-filter-vip'>
                                    <option value=''>大会员</option>
                                    <option value='annual'>年度大会员</option>
                                    <option value='monthly'>月度大会员</option>
                                    <option value='false'>非大会员</option>
                                </select>
                                <select id='modal-filter-official'>
                                    <option value=''>认证状态</option>
                                    <option value='0'>个人认证</option>
                                    <option value='1'>机构认证</option>
                                    <option value='false'>未认证</option>
                                </select>
                                <select id='modal-filter-invalid'>
                                    <option value=''>账号状态</option>
                                    <option value='true'>失效账号</option>
                                    <option value='false'>正常账号</option>
                                </select>
                                <select id='modal-filter-mutual'>
                                    <option value=''>关注关系</option>
                                    <option value='true'>单向关注</option>
                                    <option value='false'>互粉</option>
                                </select>
                                <input type='date' id='modal-filter-date-start' title='开始日期'>
                                <input type='date' id='modal-filter-date-end' title='结束日期'>
                                <select id='modal-filter-fans'>
                                    <option value=''>粉丝数</option>
                                    <option value='1w-'>1万以下</option>
                                    <option value='1w-10w'>1万-10万</option>
                                    <option value='10w-100w'>10万-100万</option>
                                    <option value='100w+'>100万以上</option>
                                </select>
                                <label><input type='checkbox' id='modal-select-all'> 全选</label>
                            </div>
                        </div>
                        <div class="modal-list">
                            <table class="follow-table" id="follow-table">                                <thead>
                                    <tr>
                                        <th><input type="checkbox" id="table-select-all"></th>
                                        <th>头像</th>
                                        <th class="sortable" data-sort="uname">昵称</th>
                                        <th class="sortable" data-sort="follower">粉丝数</th>
                                        <th class="sortable" data-sort="mtime">关注时间</th>
                                        <th>简介</th>
                                        <th>认证</th>
                                        <th>大会员</th>
                                    </tr>
                                </thead>
                                <tbody id="table-tbody"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-stats">
                        <span>显示: <span id='modal-show-count'>0</span> / <span id='modal-total-count'>0</span>人 | 已选择: <span id='modal-selected-count'>0</span>人</span>                        <div class="batch-actions">
                            <button id='modal-unfollow-selected'>取关选中用户</button>
                            <button id='modal-fetch-fans'>获取全部粉丝数</button>
                            <button id='modal-cancel-operation' style='display:none; background:#dc3545; border-color:#dc3545;'>取消操作</button>
                            <button id='modal-clear-cache' onclick="if(confirm('${MESSAGES.CONFIRM_CLEAR_CACHE}')){localStorage.removeItem('bilibili_follow_cache');alert('${MESSAGES.SUCCESS_CACHE_CLEARED}');}">清除缓存</button>
                        </div>
                    </div>
                </div>`;

            document.body.appendChild(this.overlay);
            this.bindEvents();
        }        bindEvents() {
            // 关闭按钮事件
            this.overlay.querySelector('.close-btn').onclick = () => {
                this.cancelOperations();
                this.remove();
                if (this.onClose) this.onClose();
            };

            // 点击遮罩层关闭
            this.overlay.onclick = (e) => {
                if (e.target === this.overlay) {
                    this.cancelOperations();
                    this.remove();
                    if (this.onClose) this.onClose();
                }
            };// 筛选事件 - 使用防抖优化
            ['#modal-filter', '#modal-filter-vip', '#modal-filter-official', '#modal-filter-invalid', 
             '#modal-filter-mutual', '#modal-filter-date-start', '#modal-filter-date-end', '#modal-filter-fans'].forEach(selector => {
                const el = this.overlay.querySelector(selector);
                if (el) {
                    const eventType = el.type === 'text' ? 'input' : 'change';
                    el.addEventListener(eventType, () => {
                        cache.debounce('filter', () => this.filterGrid(), CONFIG.FILTER_DEBOUNCE);
                    });
                }
            });

            // 排序事件
            this.overlay.querySelectorAll('th.sortable').forEach(th => {
                th.addEventListener('click', () => this.sortList(th.getAttribute('data-sort')));
            });

            // 全选事件
            ['#modal-select-all', '#table-select-all'].forEach(selector => {
                const checkbox = this.overlay.querySelector(selector);
                if (checkbox) checkbox.onchange = () => this.toggleSelectAll(checkbox.checked);
            });

            // 滚动事件 - 自动获取可见用户粉丝数
            this.overlay.querySelector('.modal-list').addEventListener('scroll', () => {
                if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
                this.scrollTimeout = setTimeout(() => this.fetchVisibleUsersFans(), CONFIG.SCROLL_DEBOUNCE);
            });            // 批量操作事件
            this.overlay.querySelector('#modal-unfollow-selected').onclick = () => this.unfollowSelected();
            this.overlay.querySelector('#modal-fetch-fans').onclick = () => this.fetchAllFans();
            this.overlay.querySelector('#modal-cancel-operation').onclick = () => this.cancelCurrentOperation();
        }        // 批量获取用户粉丝数 - 优化版本
        async fetchBatchUsersFans(users) {
            const needFetchUsers = users.filter(user => user.follower === null || user.follower === undefined);
            if (needFetchUsers.length === 0) return;

            this.showCancelButton(true);
            const operationId = 'fetchBatchFans';
            this.currentOperations.add(operationId);
            this.isCancelled = false;

            const fetchBtn = this.overlay?.querySelector('#modal-fetch-fans');
            let processedCount = 0;

            try {
                // 分批处理，避免一次性处理太多数据
                const batchSize = 10;
                for (let batchIndex = 0; batchIndex < needFetchUsers.length; batchIndex += batchSize) {
                    if (this.isCancelled) break;
                    
                    const batch = needFetchUsers.slice(batchIndex, batchIndex + batchSize);
                    
                    // 逐个获取粉丝数并实时更新
                    for (const user of batch) {
                        if (this.isCancelled) break;
                        
                        try {
                            const info = await fetchUserInfo(user.mid);
                            user.follower = info.follower >= 0 ? info.follower : 0;
                            user.following = info.following || 0;
                            // 立即显示粉丝数
                            this.updateUserRow(user, true);
                        } catch (error) {
                            user.follower = 0;
                            // 立即显示失败状态
                            this.updateUserRow(user, true);
                        }
                        
                        processedCount++;
                        
                        if (fetchBtn && !this.isCancelled) {
                            const progress = Math.round(processedCount / needFetchUsers.length * 100);
                            fetchBtn.textContent = `获取粉丝数中... ${processedCount}/${needFetchUsers.length} (${progress}%)`;
                        }
                        
                        // 延迟避免频率限制
                        await new Promise(resolve => setTimeout(resolve, CONFIG.FANS_API_DELAY));
                    }
                    
                    // 每批次后保存缓存，防止数据丢失
                    cache.set(this.list);
                    
                    // 批次间额外延迟
                    if (batchIndex + batchSize < needFetchUsers.length && !this.isCancelled) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                
            } finally {
                this.currentOperations.delete(operationId);
                
                // 保存已获取的数据
                cache.set(this.list);
                
                if (!this.isCancelled) {
                    this.showCancelButton(false);
                    if (fetchBtn) fetchBtn.textContent = '获取全部粉丝数';
                }
                
                // 如果操作被取消，显示已获取的结果统计
                if (this.isCancelled && processedCount > 0) {
                    setTimeout(() => {
                        alert(`批量获取粉丝数已取消\n\n已成功获取 ${processedCount}/${needFetchUsers.length} 个用户的粉丝数据\n数据已保存到缓存中`);
                    }, 100);
                }
            }
        }        async fetchVisibleUsersFans() {
            const fetchBtn = this.overlay.querySelector('#modal-fetch-fans');
            if (fetchBtn && fetchBtn.disabled) return;

            const modalList = this.overlay.querySelector('.modal-list');
            const tbody = this.overlay.querySelector('#table-tbody');
            const visibleRows = Array.from(tbody.querySelectorAll('tr')).filter(row => {
                const rect = row.getBoundingClientRect();
                const listRect = modalList.getBoundingClientRect();
                return rect.top < listRect.bottom && rect.bottom > listRect.top;
            });

            // 限制每次处理的数量，避免一次性请求太多
            const maxProcessCount = 5;
            let processedCount = 0;

            for (const row of visibleRows) {
                if (processedCount >= maxProcessCount) break;
                
                const checkbox = row.querySelector('.row-checkbox');
                if (!checkbox) continue;

                const mid = checkbox.value;
                const userInList = this.list.find(u => u.mid === mid);

                if (userInList && (userInList.follower === null || userInList.follower === undefined)) {
                    try {
                        const info = await fetchUserInfo(mid);
                        if (info.follower >= 0) {
                            userInList.follower = info.follower;
                            userInList.following = info.following;
                            // 立即显示粉丝数
                            this.updateUserRow(userInList, true);
                            cache.set(this.list);
                        }
                    } catch (error) {
                        userInList.follower = 0;
                        // 立即显示粉丝数0
                        this.updateUserRow(userInList, true);
                    }

                    processedCount++;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        }

        // 工具函数
        isInvalidUser(user) {
            return user.face.includes("noface.jpg") && user.uname === "账号已注销";
        }        formatFollowerCount(count) {
            return !count ? '0' : count.toLocaleString();
        }getOfficialTitle(officialInfo) {
            if (!officialInfo || officialInfo.type < 0) return '';
            const titles = { 0: '个人', 1: '机构' };
            const typeTitle = titles[officialInfo.type] || '认证';
            return officialInfo.desc ? `${typeTitle}: ${officialInfo.desc}` : typeTitle;
        }

        getVipType(vipInfo) {
            if (!vipInfo || vipInfo.vipType === 0) return '';
            return vipInfo.label?.text || '大会员';
        }

        // 筛选功能 - 优化版本
        filterGrid() {
            const filters = this.getFilterState();
            const filterKey = JSON.stringify(filters);
            
            // 检查缓存
            const cached = cache.getFilterResult(filterKey);
            if (cached) {
                this.filteredList = cached;
                this.renderTable(this.filteredList);
                return;
            }
            
            // 执行筛选
            this.filteredList = this.list.filter(user => this.applyFilters(user, filters));
            
            // 缓存结果
            cache.setFilterResult(filterKey, this.filteredList);
            this.renderTable(this.filteredList);
        }

        getFilterState() {
            return {
                keyword: this.overlay.querySelector('#modal-filter').value.trim().toLowerCase(),
                vip: this.overlay.querySelector('#modal-filter-vip').value,
                official: this.overlay.querySelector('#modal-filter-official').value,
                invalid: this.overlay.querySelector('#modal-filter-invalid').value,
                mutual: this.overlay.querySelector('#modal-filter-mutual').value,
                dateStart: this.overlay.querySelector('#modal-filter-date-start').value,
                dateEnd: this.overlay.querySelector('#modal-filter-date-end').value,
                fans: this.overlay.querySelector('#modal-filter-fans').value
            };
        }        applyFilters(user, filters) {
            // 快速退出优化
            if (filters.keyword) {
                const nameMatch = user.uname.toLowerCase().includes(filters.keyword);
                if (!nameMatch) return false;
            }
            
            // 大会员筛选 - 修复并区分年度和月度
            if (filters.vip) {
                const hasVip = user.vip && user.vip.vipType > 0;
                if (filters.vip === 'false' && hasVip) return false;
                if (filters.vip === 'annual' && (!hasVip || user.vip.vipType !== 2)) return false; // 年度大会员
                if (filters.vip === 'monthly' && (!hasVip || user.vip.vipType !== 1)) return false; // 月度大会员
            }
            
            // 认证状态筛选
            if (filters.official) {
                const hasOfficial = user.official_verify && user.official_verify.type >= 0;
                if (filters.official === 'false' && hasOfficial) return false;
                if (filters.official === '0' && (!hasOfficial || user.official_verify.type !== 0)) return false;
                if (filters.official === '1' && (!hasOfficial || user.official_verify.type !== 1)) return false;
            }
            
            // 失效账号筛选
            if (filters.invalid) {
                const isInvalid = this.isInvalidUser(user);
                if (filters.invalid === 'true' && !isInvalid) return false;
                if (filters.invalid === 'false' && isInvalid) return false;
            }
            
            // 互粉关系筛选 - 修复逻辑错误
            if (filters.mutual) {
                const isMutual = user.attribute === 2; // 2表示互相关注
                if (filters.mutual === 'true' && isMutual) return false; // 选择单向关注时排除互粉
                if (filters.mutual === 'false' && !isMutual) return false; // 选择互粉时排除单向关注
            }

            // 日期筛选
            if ((filters.dateStart || filters.dateEnd) && user.mtime) {
                const userDate = new Date(user.mtime * 1000).toISOString().split('T')[0];
                if (filters.dateStart && userDate < filters.dateStart) return false;
                if (filters.dateEnd && userDate > filters.dateEnd) return false;
            }

            // 粉丝数筛选
            if (filters.fans) {
                const followerCount = user.follower || 0;
                const ranges = {
                    '1w-': [0, 10000],
                    '1w-10w': [10000, 100000],
                    '10w-100w': [100000, 1000000],
                    '100w+': [1000000, Infinity]
                };
                const range = ranges[filters.fans];
                if (range && (followerCount < range[0] || followerCount >= range[1])) return false;
            }

            return true;
        }

        // 排序功能
        sortList(field) {
            if (this.sortField === field) {
                this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
            } else {
                this.sortField = field;
                this.sortOrder = 'desc';
            }

            this.filteredList.sort((a, b) => {
                const valueA = field === 'uname' ? a.uname.toLowerCase() : (a[field] || 0);
                const valueB = field === 'uname' ? b.uname.toLowerCase() : (b[field] || 0);
                
                if (this.sortOrder === 'asc') {
                    return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
                } else {
                    return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
                }
            });

            // 更新排序标记
            this.overlay.querySelectorAll('th').forEach(header => header.classList.remove('sort-asc', 'sort-desc'));
            const sortHeader = this.overlay.querySelector(`th[data-sort="${field}"]`);
            if (sortHeader) sortHeader.classList.add(`sort-${this.sortOrder}`);

            this.renderTable(this.filteredList);
        }        // 表格渲染
        renderTable(showList) {
            const tbody = this.overlay.querySelector('#table-tbody');
            const showCountSpan = this.overlay.querySelector('#modal-show-count');
            
            // 限制渲染数量，防止页面卡死
            const maxRenderItems = Math.min(showList.length, CONFIG.MAX_RENDER_ITEMS);
            const displayList = showList.slice(0, maxRenderItems);
            
            // 清空表格并使用文档片段优化DOM操作
            tbody.innerHTML = '';
            const fragment = document.createDocumentFragment();
            
            // 分批渲染，防止长时间阻塞
            const renderBatch = (startIndex) => {
                const batchSize = 50;
                const endIndex = Math.min(startIndex + batchSize, displayList.length);
                const batchUsers = displayList.slice(startIndex, endIndex);
                
                const batchFragment = this.createTableRows(batchUsers);
                fragment.appendChild(batchFragment);
                
                if (endIndex < displayList.length) {
                    // 使用 requestAnimationFrame 分批渲染
                    requestAnimationFrame(() => renderBatch(endIndex));
                } else {
                    tbody.appendChild(fragment);
                    showCountSpan.textContent = showList.length;
                    if (maxRenderItems < showList.length) {
                        const notice = document.createElement('tr');
                        notice.innerHTML = `<td colspan="8" style="text-align: center; color: #666; padding: 10px;">
                            仅显示前 ${maxRenderItems} 个结果，请使用筛选功能查看更多内容
                        </td>`;
                        tbody.appendChild(notice);
                    }
                    this.updateSelectedCount();
                }
            };
            
            if (displayList.length > 0) {
                renderBatch(0);
            } else {
                showCountSpan.textContent = showList.length;
                this.updateSelectedCount();
            }
        }// 创建表格行的辅助方法
        createTableRows(users) {
            const fragment = document.createDocumentFragment();
            
            users.forEach(user => {
                const followTime = user.mtime ? new Date(user.mtime * 1000).toLocaleDateString() : '未知';
                const isInvalid = this.isInvalidUser(user);
                // 如果没有粉丝数信息，显示"获取中..."
                const followerCount = user.follower !== null && user.follower !== undefined 
                    ? this.formatFollowerCount(user.follower) 
                    : '<span style="color:#999;">获取中...</span>';
                const officialTitle = this.getOfficialTitle(user.official_verify);
                const vipType = this.getVipType(user.vip);                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type='checkbox' class='row-checkbox' value='${user.mid}' data-name='${user.uname}'></td>
                    <td><img src='${user.face}' loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4='"></td>
                    <td style='${isInvalid ? "color:#999;text-decoration:line-through;" : ""}' title='${user.uname}'>${user.uname}</td>
                    <td>${followerCount}</td>
                    <td>${followTime}</td>
                    <td style="max-width:600px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${user.sign || ''}">${user.sign || '-'}</td>
                    <td title='${officialTitle}'>${officialTitle}</td>
                    <td>${vipType}</td>
                `;

                // 事件委托优化 - 只在父元素上绑定事件
                row.addEventListener('click', this.handleRowClick.bind(this), { passive: true });
                
                fragment.appendChild(row);
            });
            
            return fragment;
        }

        // 行点击事件处理（事件委托）
        handleRowClick(e) {
            const row = e.currentTarget;
            const checkbox = row.querySelector('.row-checkbox');
            
            if (e.target.type !== 'checkbox') {
                checkbox.checked = !checkbox.checked;
            }
            
            row.classList.toggle('selected', checkbox.checked);
            this.updateSelectedCount();
        }        // 全选功能
        toggleSelectAll(checked) {
            const tbody = this.overlay.querySelector('#table-tbody');
            const checkboxes = tbody.querySelectorAll('.row-checkbox');
            const rows = tbody.querySelectorAll('tr');
            
            checkboxes.forEach((cb, index) => {
                cb.checked = checked;
                rows[index].classList.toggle('selected', checked);
            });
            this.updateSelectedCount();
        }

        updateSelectedCount() {
            const tbody = this.overlay.querySelector('#table-tbody');
            const checked = tbody.querySelectorAll('.row-checkbox:checked');
            const total = tbody.querySelectorAll('.row-checkbox');
            const selectedCountSpan = this.overlay.querySelector('#modal-selected-count');
            const tableSelectAll = this.overlay.querySelector('#table-select-all');
            
            selectedCountSpan.textContent = checked.length;
            tableSelectAll.checked = checked.length > 0 && checked.length === total.length;
        }        // 批量取关
        async unfollowSelected() {
            const tbody = this.overlay.querySelector('#table-tbody');
            const checked = tbody.querySelectorAll('.row-checkbox:checked');
            
            if (!checked.length) {
                alert(MESSAGES.SELECT_USERS);
                return;
            }

            const selectedNames = Array.from(checked).map(cb => cb.getAttribute('data-name'));
            const confirmText = formatMessage(MESSAGES.CONFIRM_UNFOLLOW, checked.length, 
                selectedNames.slice(0, 10).join('\n') + (selectedNames.length > 10 ? '\n...' : ''));

            if (!confirm(confirmText)) return;

            this.setButtonsState(true);
            this.showCancelButton(true);
            const unfollowBtn = this.overlay.querySelector('#modal-unfollow-selected');
            const operationId = 'unfollowUsers';
            this.currentOperations.add(operationId);
            this.isCancelled = false;
            
            unfollowBtn.textContent = '取关中...';
            
            let successCount = 0;
            const failedUsers = [];

            try {
                for (let i = 0; i < checked.length; i++) {
                    if (this.isCancelled) {
                        unfollowBtn.textContent = '操作已取消';
                        break;
                    }
                    
                    const input = checked[i];
                    const userName = input.getAttribute('data-name');

                    try {
                        await unfollowUser(input.value);
                        this.removeUserFromList(input.value);
                        input.closest('tr').remove();
                        successCount++;
                        if (!this.isCancelled) {
                            unfollowBtn.textContent = formatMessage(MESSAGES.PROGRESS_UNFOLLOW, i + 1, checked.length, successCount);
                        }
                    } catch(e) {
                        console.error(`取关用户 ${userName} 失败:`, e);
                        failedUsers.push(userName);
                    }

                    if (i < checked.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
                    }
                }                this.updateCacheAndCounts();
                
                if (!this.isCancelled) {
                    this.showResult(successCount, failedUsers.length, failedUsers);
                } else {
                    // 操作被取消时显示已取关的结果
                    setTimeout(() => {
                        alert(`批量取关已取消\n\n已成功取关 ${successCount} 个用户\n失败 ${failedUsers.length} 个用户`);
                    }, 100);
                }

            } catch (error) {
                console.error('批量取关过程中出现错误:', error);
                if (!this.isCancelled) {
                    alert('批量取关过程中出现错误，请查看控制台');
                }
            } finally {
                this.currentOperations.delete(operationId);
                this.setButtonsState(false);
                this.showCancelButton(false);
                if (!this.isCancelled) {
                    unfollowBtn.textContent = '取关选中用户';
                }
            }
        }// 获取全部粉丝数
        async fetchAllFans() {
            if (!confirm(MESSAGES.CONFIRM_FETCH_ALL)) return;

            this.setButtonsState(true);
            this.showCancelButton(true);
            const btn = this.overlay.querySelector('#modal-fetch-fans');
            const operationId = 'fetchAllFans';
            this.currentOperations.add(operationId);
            this.isCancelled = false;
            
            btn.textContent = '获取中...';

            try {
                let processedCount = 0;
                const totalCount = this.list.length;

                for (let i = 0; i < this.list.length; i++) {
                    if (this.isCancelled) {
                        btn.textContent = '操作已取消';
                        break;
                    }
                    
                    const user = this.list[i];

                    try {
                        const info = await fetchUserInfo(user.mid);
                        if (info.follower >= 0) {
                            user.follower = info.follower;
                            user.following = info.following;
                            this.updateUserRow(user);
                        }
                        processedCount++;
                        btn.textContent = formatMessage(MESSAGES.PROGRESS_FETCH, processedCount, totalCount, Math.round(processedCount/totalCount*100));

                        if (processedCount % 10 === 0) {
                            cache.set(this.list);
                        }                    } catch (error) {
                        processedCount++;
                    }

                    if (i < this.list.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, CONFIG.API_DELAY));
                    }
                }                cache.set(this.list);
                if (!this.isCancelled) {
                    alert(formatMessage(MESSAGES.SUCCESS_FETCH_FANS, processedCount, totalCount));
                } else {
                    // 操作被取消时显示已获取的结果
                    setTimeout(() => {
                        alert(`获取全部粉丝数已取消\n\n已成功获取 ${processedCount}/${totalCount} 个用户的粉丝数据\n数据已保存到缓存中`);
                    }, 100);
                }

            } catch (error) {
                console.error('批量获取粉丝数失败:', error);
                alert('获取粉丝数时出现错误，请查看控制台');
            } finally {
                this.currentOperations.delete(operationId);
                this.setButtonsState(false);
                this.showCancelButton(false);
                if (!this.isCancelled) {
                    btn.textContent = '获取全部粉丝数';
                }
            }        }

        // 取消当前操作
        cancelCurrentOperation() {
            this.isCancelled = true;
            cache.set(this.list);
            this.currentOperations.clear();
            this.showCancelButton(false);
            this.setButtonsState(false);
            
            // 恢复按钮文本
            const buttons = this.overlay.querySelectorAll('#modal-unfollow-selected, #modal-fetch-fans');
            buttons[0] && (buttons[0].textContent = '取关选中用户');
            buttons[1] && (buttons[1].textContent = '获取全部粉丝数');
            
            // 显示统计
            const processed = this.list.filter(u => u.follower != null).length;
            if (processed > 0) {
                alert(`操作已取消\n\n已成功获取 ${processed}/${this.list.length} 个用户的粉丝数据\n数据已保存到缓存中`);
            }
        }

        // 显示/隐藏取消按钮
        showCancelButton(show) {
            const btn = this.overlay?.querySelector('#modal-cancel-operation');
            if (btn) btn.style.display = show ? 'inline-block' : 'none';
        }

        // 设置按钮状态
        setButtonsState(disabled) {
            this.overlay?.querySelectorAll('button:not(#modal-cancel-operation)')
                .forEach(btn => btn.disabled = disabled);
        }

        removeUserFromList(mid) {
            const index = this.list.findIndex(u => u.mid === mid);
            if (index !== -1) this.list.splice(index, 1);
        }

        updateCacheAndCounts() {
            cache.set(this.list);
            const rows = this.overlay.querySelector('#table-tbody').children.length;
            this.overlay.querySelector('#modal-show-count').textContent = rows;
            this.overlay.querySelector('#modal-total-count').textContent = this.list.length;
            this.updateSelectedCount();
        }        showResult(successCount, failCount, failedUsers) {
            let resultMsg = `批量取关完成！\n成功: ${successCount}个，失败: ${failCount}个`;
            if (failedUsers.length > 0) {
                resultMsg += `\n\n失败的用户：\n${failedUsers.slice(0, 5).join('\n')}${failedUsers.length > 5 ? '\n...' : ''}`;
            }
            alert(resultMsg);
        }

        // 统一的用户行更新方法
        updateUserRow(user, isInstant = false) {
            const tbody = this.overlay?.querySelector('#table-tbody');
            if (!tbody) return;
            
            const targetRow = Array.from(tbody.querySelectorAll('tr')).find(row => {
                const checkbox = row.querySelector('.row-checkbox');
                return checkbox && checkbox.value === user.mid;
            });

            if (targetRow) {
                const followerCell = targetRow.children[3];
                if (followerCell) {
                    followerCell.innerHTML = this.formatFollowerCount(user.follower);
                    
                    if (isInstant) {
                        // 添加视觉反馈
                        followerCell.style.background = '#d4edda';
                        followerCell.style.color = '#155724';
                        followerCell.style.transition = 'all 0.3s ease';
                        
                        setTimeout(() => {
                            followerCell.style.background = '';
                            followerCell.style.color = '';
                        }, 1500);
                    }
                }
            }
        }        // 批量获取用户粉丝数 - 实时更新版本
        async fetchBatchUsersFansRealtime(users) {
            const needFetchUsers = users.filter(user => user.follower === null || user.follower === undefined);
            if (needFetchUsers.length === 0) return;

            this.showCancelButton(true);
            const operationId = 'fetchRealtime';
            this.currentOperations.add(operationId);
            this.isCancelled = false;

            try {
                const fetchBtn = this.overlay.querySelector('#modal-fetch-fans');
                let processedCount = 0;
                
                // 分批处理，避免一次性处理太多数据
                const batchSize = 5;
                for (let batchIndex = 0; batchIndex < needFetchUsers.length; batchIndex += batchSize) {
                    if (this.isCancelled) break;
                    
                    const batch = needFetchUsers.slice(batchIndex, batchIndex + batchSize);

                    for (const user of batch) {
                        if (this.isCancelled) break;

                        try {
                            const info = await fetchUserInfo(user.mid);
                            user.follower = info.follower >= 0 ? info.follower : 0;
                            user.following = info.following || 0;
                            this.updateUserRow(user, true);
                        } catch (error) {
                            user.follower = 0;
                            this.updateUserRow(user, true);
                        }
                        
                        processedCount++;
                        
                        if (fetchBtn && !this.isCancelled) {
                            const progress = Math.round(processedCount / needFetchUsers.length * 100);
                            fetchBtn.textContent = `获取粉丝数中... ${processedCount}/${needFetchUsers.length} (${progress}%)`;
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, CONFIG.FANS_API_DELAY));
                    }
                    
                    // 每批次后保存缓存，防止数据丢失
                    if (processedCount % 5 === 0) cache.set(this.list);
                    
                    // 批次间额外延迟
                    if (batchIndex + batchSize < needFetchUsers.length && !this.isCancelled) {
                        await new Promise(resolve => setTimeout(resolve, 800));
                    }
                }
                
                if (!this.isCancelled) cache.set(this.list);
            } finally {
                this.currentOperations.delete(operationId);
                cache.set(this.list);
                
                if (!this.isCancelled || this.currentOperations.size === 0) {
                    this.showCancelButton(false);
                    const fetchBtn = this.overlay.querySelector('#modal-fetch-fans');
                    if (fetchBtn) fetchBtn.textContent = '获取全部粉丝数';
                }
                
                if (this.isCancelled && processedCount > 0) {
                    setTimeout(() => {
                        alert(`粉丝数获取已取消\n\n已成功获取 ${processedCount}/${needFetchUsers.length} 个用户的粉丝数据\n数据已保存到缓存中`);
                    }, 100);
                }
            }
        }
    }

    // 初始化应用
    new FollowManager();
})();
