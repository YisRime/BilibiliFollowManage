// ==UserScript==
// @name         B站关注管理
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  高效管理B站关注列表，支持批量取关、智能筛选等功能。支持智能筛选、实时粉丝数获取、批量操作等功能
// @author       苡淞（Yis_Rime）
// @homepage     https://github.com/YisRime/BilibiliFollowManage
// @match        https://space.bilibili.com/*/relation/follow*
// @match        https://space.bilibili.com/*/fans/follow*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.bilibili.com
// @license      AGPLv3
// ==/UserScript==

(function() {
    'use strict';    const CONFIG = {
        CACHE_DURATION: 30 * 24 * 60 * 60 * 1000, 
        API_DELAY: 500, 
        PAGE_SIZE: 100,
        FILTER_DEBOUNCE: 300, 
        BATCH_DELAY: 200, 
        FANS_API_DELAY: 500, 
        MAX_RENDER_ITEMS: 2000
    };// 统一文字提示
    const MESSAGES = {
        LOADING: '正在加载数据...', LOADING_PAGE: '正在加载第{0}页...', RETRY: '加载失败，正在重试...',
        ERROR_PERMISSION: '权限不足或用户隐私设置不允许访问', ERROR_API: 'API错误: {0}', ERROR_NETWORK: '网络请求失败',
        ERROR_NO_DATA: '未能获取关注列表，请检查是否已登录', ERROR_NO_UID: '无法获取用户UID，请确保已登录',
        CONFIRM_UNFOLLOW: '确定要取关以下 {0} 个用户吗？\n\n{1}\n\n此操作不可撤销！',
        CONFIRM_FETCH_ALL: '确定要获取所有用户的粉丝数吗？这可能需要一些时间。',
        CONFIRM_CLEAR_CACHE: '确定要清除缓存吗？下次打开将重新加载关注列表。',
        SUCCESS_CACHE_CLEARED: '缓存已清除！', SUCCESS_UNFOLLOW: '批量取关完成！\n成功: {0}个，失败: {1}个',
        SUCCESS_FETCH_FANS: '粉丝数获取完成！\n成功处理: {0}/{1} 个用户',
        PROGRESS_UNFOLLOW: '取关进度: {0}/{1} (成功{2}个)', PROGRESS_FETCH: '获取中... {0}/{1} ({2}%)',
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
        .filter-row input[type="text"] { flex: 1; min-width: 200px; }
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
        get() {
            const cached = localStorage.getItem('bilibili_follow_cache');
            if (!cached) return null;
            const data = JSON.parse(cached);
            return data.expiry > Date.now() ? data.list : null;
        },
        set(list) {
            localStorage.setItem('bilibili_follow_cache', JSON.stringify({
                list, expiry: Date.now() + CONFIG.CACHE_DURATION
            }));
        },
        getUserInfo(mid) {
            const cached = localStorage.getItem(`bilibili_user_${mid}`);
            if (!cached) return null;
            const data = JSON.parse(cached);
            return (data.timestamp && Date.now() - data.timestamp < CONFIG.CACHE_DURATION) ? data : null;
        },
        setUserInfo(mid, info) {
            localStorage.setItem(`bilibili_user_${mid}`, JSON.stringify({...info, timestamp: Date.now()}));
        }
    };    // 工具函数
    const formatMessage = (template, ...args) => 
        template.replace(/\{(\d+)\}/g, (match, index) => args[index] || match);

    const getUserId = () => {
        const uidMatch = location.pathname.match(/space\/(\d+)/);
        return uidMatch?.[1] || document.cookie.match(/DedeUserID=(\d+)/)?.[1] || null;
    };

    const getCsrfToken = () => document.cookie.match(/bili_jct=([^;]+)/)?.[1] || '';    // 获取用户粉丝数信息
    const fetchUserInfo = async (mid) => {
        const cached = cache.getUserInfo(mid);
        if (cached) return cached;

        try {
            const res = await fetch(`https://api.bilibili.com/x/relation/stat?vmid=${mid}`, {
                credentials: 'include',
                headers: { 'Referer': 'https://space.bilibili.com/' }
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            let info;
            if (data.code === 0 && data.data) {
                info = { follower: data.data.follower || 0, following: data.data.following || 0, timestamp: Date.now() };
            } else if (data.code === -404 || data.code === -400) {
                info = { follower: -1, following: -1, timestamp: Date.now() };
            } else {
                info = { follower: 0, following: 0, timestamp: Date.now() };
            }
            
            cache.setUserInfo(mid, info);
            return info;
        } catch (error) {
            const defaultInfo = { follower: 0, following: 0, timestamp: Date.now() };
            cache.setUserInfo(mid, defaultInfo);
            return defaultInfo;
        }
    };// 取消关注函数
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
                    const data = JSON.parse(response.responseText);
                    data.code === 0 ? resolve(data) : reject(new Error(data.message || '取关失败'));
                },
                onerror: () => reject(new Error('网络请求失败'))
            });
        });
    };class FollowManager {
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
                    this.modal.fetchBatchUsersFansRealtime(cachedList);
                } else {
                    this.modal.showLoading(MESSAGES.LOADING);
                    const list = await this.fetchFollowList();
                    if (list.length > 0) {
                        cache.set(list);
                        this.modal.updateData(list);
                    } else {
                        this.modal.showError(MESSAGES.ERROR_NO_DATA);
                    }
                }
            } catch (error) {
                const errorMsg = '加载失败: ' + error.message;
                console.error(errorMsg, error);
                this.modal ? this.modal.showError(errorMsg) : alert(errorMsg);
            } finally {
                this.setLoading(false);
            }
        }        closeModal() {
            this.isOperationCancelled = true;
            if (this.modal) {
                this.modal.cancelOperations();
                this.modal.remove();
                this.modal = null;
            }
            this.isOperationCancelled = false;
        }

        setLoading(loading) {
            this.isLoading = loading;
            this.btn.disabled = loading;
        }        async fetchFollowList() {
            const uid = getUserId();
            if (!uid) throw new Error(MESSAGES.ERROR_NO_UID);

            let page = 1, result = [];
            const maxRetries = 3;

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

                        if (!res.ok) throw new Error(`HTTP ${res.status}`);                        const data = await res.json();
                        
                        if (data.code === 0 && data.data?.list) {
                            data.data.list.forEach(user => {
                                if (!user.follower && user.follower !== 0) {
                                    user.follower = null;
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
                            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retry)));
                        }
                    }
                }

                if (!success) break;
            }

            if (this.modal && result.length > 0) {
                this.modal.updateData(result);
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
        }        // 显示状态消息
        showMessage(message, isError = false) {
            const tbody = this.overlay?.querySelector('#table-tbody');
            if (!tbody) return;
            
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

        showLoading(message) { this.showMessage(message); }
        showError(message) { this.showMessage(message, true); }

                // 更新数据
        updateData(newList) {
            this.list = newList;
            this.filteredList = newList;
            const totalCountSpan = this.overlay?.querySelector('#modal-total-count');
            if (totalCountSpan) totalCountSpan.textContent = newList.length;
            this.renderTable(this.filteredList);
        }

        // 移除模态窗口
        remove() {
            if (this.overlay) {
                this.overlay.remove();
                this.overlay = null;
            }
        }// 取消所有操作
        cancelOperations() {
            this.isCancelled = true;
            const processedUsers = this.list.filter(user => user.follower !== null && user.follower !== undefined);
            cache.set(this.list);
            
            const hasActiveOperations = this.currentOperations.size > 0;
            this.currentOperations.clear();

            if (this.overlay) {
                this.setButtonsState(false);
                this.showCancelButton(false);
                const unfollowBtn = this.overlay.querySelector('#modal-unfollow-selected');
                const fetchBtn = this.overlay.querySelector('#modal-fetch-fans');
                if (unfollowBtn) unfollowBtn.textContent = '取关选中用户';
                if (fetchBtn) fetchBtn.textContent = '获取全部粉丝数';
            }

            if (hasActiveOperations && processedUsers.length > 0 && !this.isFromClearCache) {
                setTimeout(() => {
                    alert(`操作已终止\n\n已成功获取 ${processedUsers.length}/${this.list.length} 个用户的粉丝数据\n数据已保存到缓存中`);
                }, 100);
            }

            this.isFromClearCache = false;
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
                                    <option value='false'>单向关注</option>
                                    <option value='true'>互粉</option>
                                </select>
                                <input type='date' id='modal-filter-date-start' title='开始日期'>
                                <input type='date' id='modal-filter-date-end' title='结束日期'>
                                <input type='number' id='modal-filter-fans-min' placeholder='最少粉丝数' min='0' title='最少粉丝数'>
                                <input type='number' id='modal-filter-fans-max' placeholder='最多粉丝数' min='0' title='最多粉丝数'>
                                <label><input type='checkbox' id='modal-select-all'> 全选</label>
                            </div>
                        </div>
                        <div class="modal-list">
                            <table class="follow-table" id="follow-table">
                                <thead>
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
                            <button id='modal-clear-cache'>清除缓存</button>
                        </div>
                    </div>
                </div>`;

            document.body.appendChild(this.overlay);
            this.bindEvents();
        }        bindEvents() {            // 关闭按钮事件
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
            };            // 筛选事件 - 使用防抖优化
            ['#modal-filter', '#modal-filter-vip', '#modal-filter-official', '#modal-filter-invalid',
             '#modal-filter-mutual', '#modal-filter-date-start', '#modal-filter-date-end', '#modal-filter-fans-min', '#modal-filter-fans-max'].forEach(selector => {
                const el = this.overlay.querySelector(selector);
                if (el) {
                    const eventType = el.type === 'text' || el.type === 'number' ? 'input' : 'change';
                    el.addEventListener(eventType, () => {
                        clearTimeout(this.filterTimer);
                        this.filterTimer = setTimeout(() => this.filterGrid(), CONFIG.FILTER_DEBOUNCE);
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
            this.overlay.querySelector('#modal-clear-cache').onclick = () => this.clearCache();
        }        async fetchBatchUsersFans(users, isRealtime = false) {
            const needFetchUsers = users.filter(user => user.follower === null || user.follower === undefined);
            if (needFetchUsers.length === 0) return;

            this.showCancelButton(true);
            const operationId = isRealtime ? 'fetchRealtime' : 'fetchBatchFans';
            this.currentOperations.add(operationId);
            this.isCancelled = false;
            
            const fetchBtn = this.overlay?.querySelector('#modal-fetch-fans');
            let processedCount = 0;

            const batchSize = isRealtime ? 5 : 10;
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
                cache.set(this.list);
                if (batchIndex + batchSize < needFetchUsers.length && !this.isCancelled) {
                    await new Promise(resolve => setTimeout(resolve, isRealtime ? 800 : 500));
                }
            }

            this.currentOperations.delete(operationId);
            cache.set(this.list);
            if (!this.isCancelled) {
                this.showCancelButton(false);
                if (fetchBtn) fetchBtn.textContent = '获取全部粉丝数';
            }
            if (this.isCancelled && processedCount > 0) {
                setTimeout(() => {
                    alert(`批量获取粉丝数已取消\n\n已成功获取 ${processedCount}/${needFetchUsers.length} 个用户的粉丝数据\n数据已保存到缓存中`);
                }, 100);
            }
        }

        // 简化调用方法
        fetchBatchUsersFansRealtime(users) {
            return this.fetchBatchUsersFans(users, true);
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
                        userInList.follower = info.follower >= 0 ? info.follower : 0;
                        userInList.following = info.following;
                        this.updateUserRow(userInList, true);
                        cache.set(this.list);
                    } catch (error) {
                        userInList.follower = 0;
                        this.updateUserRow(userInList, true);
                    }

                    processedCount++;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        }        // 工具函数
        isInvalidUser(user) {
            return user.face.includes("noface.jpg") && user.uname === "账号已注销";
        }

        formatFollowerCount(count) {
            return !count ? '0' : count.toLocaleString();
        }

        getOfficialTitle(officialInfo) {
            if (!officialInfo || officialInfo.type < 0) return '';
            const titles = { 0: '个人', 1: '机构' };
            const typeTitle = titles[officialInfo.type] || '认证';
            return officialInfo.desc ? `${typeTitle}: ${officialInfo.desc}` : typeTitle;
        }

        getVipType(vipInfo) {
            if (!vipInfo || vipInfo.vipType === 0) return '';
            return vipInfo.label?.text || '大会员';
        }// 筛选功能
        filterGrid() {
            const filters = this.getFilterState();
            this.filteredList = this.list.filter(user => this.applyFilters(user, filters));
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
                fansMin: this.overlay.querySelector('#modal-filter-fans-min').value,
                fansMax: this.overlay.querySelector('#modal-filter-fans-max').value
            };
        }        applyFilters(user, filters) {
            // 关键词筛选
            if (filters.keyword) {
                const keyword = filters.keyword.toLowerCase();
                const nameMatch = user.uname.toLowerCase().includes(keyword);
                const signMatch = user.sign && user.sign.toLowerCase().includes(keyword);
                if (!nameMatch && !signMatch) return false;
            }

            // 大会员筛选
            if (filters.vip) {
                const hasVip = user.vip && user.vip.vipType > 0;
                if (filters.vip === 'false' && hasVip) return false;
                if (filters.vip === 'annual' && (!hasVip || user.vip.vipType !== 2)) return false;
                if (filters.vip === 'monthly' && (!hasVip || user.vip.vipType !== 1)) return false;
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

            // 互粉关系筛选
            if (filters.mutual) {
                const isMutual = user.attribute === 2;
                if (filters.mutual === 'true' && isMutual) return false;
                if (filters.mutual === 'false' && !isMutual) return false;
            }

            // 日期筛选
            if ((filters.dateStart || filters.dateEnd) && user.mtime) {
                const userDate = new Date(user.mtime * 1000).toISOString().split('T')[0];
                if (filters.dateStart && userDate < filters.dateStart) return false;
                if (filters.dateEnd && userDate > filters.dateEnd) return false;
            }

            // 粉丝数筛选
            if (filters.fansMin || filters.fansMax) {
                const followerCount = user.follower || 0;
                const minFans = filters.fansMin ? parseInt(filters.fansMin) : 0;
                const maxFans = filters.fansMax ? parseInt(filters.fansMax) : Infinity;

                if (followerCount < minFans || followerCount > maxFans) return false;
            }

            return true;
        }        // 排序功能
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
        }// 表格渲染
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
        }        // 创建表格行的辅助方法
        createTableRows(users) {
            const fragment = document.createDocumentFragment();

            users.forEach(user => {
                const followTime = user.mtime ? new Date(user.mtime * 1000).toLocaleDateString() : '未知';
                const isInvalid = this.isInvalidUser(user);
                const followerCount = user.follower !== null && user.follower !== undefined
                    ? this.formatFollowerCount(user.follower)
                    : '<span style="color:#999;">获取中...</span>';
                const officialTitle = this.getOfficialTitle(user.official_verify);
                const vipType = this.getVipType(user.vip);

                const row = document.createElement('tr');
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
        }        // 行点击事件处理（事件委托）
        handleRowClick(e) {
            const row = e.currentTarget;
            const checkbox = row.querySelector('.row-checkbox');

            if (e.target.type !== 'checkbox') {
                checkbox.checked = !checkbox.checked;
            }

            row.classList.toggle('selected', checkbox.checked);
            this.updateSelectedCount();
        }// 全选功能
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

            const selectedUsers = Array.from(checked).map(cb => ({
                mid: cb.value,
                name: cb.getAttribute('data-name'),
                row: cb.closest('tr')
            }));

            const confirmText = formatMessage(MESSAGES.CONFIRM_UNFOLLOW, selectedUsers.length,
                selectedUsers.slice(0, 10).map(u => u.name).join('\n') + (selectedUsers.length > 10 ? '\n...' : ''));

            if (!confirm(confirmText)) return;

            this.setButtonsState(true);
            this.showCancelButton(true);
            const unfollowBtn = this.overlay.querySelector('#modal-unfollow-selected');
            const operationId = 'unfollowUsers';
            this.currentOperations.add(operationId);
            this.isCancelled = false;

            unfollowBtn.textContent = '取关中...';

            let successCount = 0;
            let failedCount = 0;
            const failedUsers = [];
            const processedRows = new Set(); // 跟踪已处理的行

            try {                // 记录成功取关的用户ID
                const successfulUnfollowedMids = new Set();

                for (let i = 0; i < selectedUsers.length; i++) {
                    if (this.isCancelled) {
                        unfollowBtn.textContent = '操作已取消';
                        break;
                    }

                    const user = selectedUsers[i];
                    let unfollowSuccess = false;                    try {
                        // 尝试取关
                        await unfollowUser(user.mid);
                        unfollowSuccess = true;
                        successCount++;
                        successfulUnfollowedMids.add(user.mid);
                        
                        // 标记行为成功状态
                        if (user.row) {
                            user.row.style.backgroundColor = '#d4edda';
                            user.row.style.transition = 'all 0.3s ease';
                            processedRows.add(user.mid);
                        }

                    } catch(error) {
                        failedCount++;
                        failedUsers.push({
                            name: user.name,
                            error: error.message || '未知错误'
                        });

                        console.error(`取关用户 ${user.name} 失败:`, error);

                        // 标记失败的行
                        if (user.row) {
                            user.row.style.backgroundColor = '#ffe6e6';
                            user.row.style.border = '1px solid #ff9999';
                            setTimeout(() => {
                                user.row.style.backgroundColor = '';
                                user.row.style.border = '';
                            }, 5000);
                        }
                    }

                    // 更新进度显示
                    if (!this.isCancelled) {
                        const progress = formatMessage(MESSAGES.PROGRESS_UNFOLLOW, i + 1, selectedUsers.length, successCount);
                        unfollowBtn.textContent = progress;
                    }                    // 每处理3个用户后更新缓存
                    if ((i + 1) % 3 === 0) {
                        cache.set(this.list);
                    }

                    // 延迟避免请求过快
                    if (i < selectedUsers.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
                    }
                }                // 批量处理完成后，统一移除所有成功取关的用户
                for (const mid of successfulUnfollowedMids) {
                    this.removeUserFromList(mid);
                    this.removeUserFromFilteredList(mid);
                }

                // 最终更新缓存、计数并重新渲染表格
                this.updateCacheAndCounts();
                this.renderTable(this.filteredList);

                if (!this.isCancelled) {
                    this.showUnfollowResult(successCount, failedCount, failedUsers);
                } else {
                    // 操作被取消时显示已取关的结果
                    setTimeout(() => {
                        let cancelMsg = `批量取关已取消\n\n已成功取关 ${successCount} 个用户`;
                        if (failedCount > 0) {
                            cancelMsg += `\n失败 ${failedCount} 个用户`;
                        }
                        if (failedUsers.length > 0) {
                            cancelMsg += `\n\n失败用户：\n${failedUsers.slice(0, 3).map(u => `${u.name}: ${u.error}`).join('\n')}`;
                            if (failedUsers.length > 3) cancelMsg += '\n...';
                        }
                        alert(cancelMsg);
                    }, 100);
                }

            } catch (error) {
                console.error('批量取关过程中出现严重错误:', error);
                if (!this.isCancelled) {
                    alert(`批量取关过程中出现严重错误: ${error.message}\n\n已成功取关 ${successCount} 个用户\n失败 ${failedCount} 个用户`);
                }
            } finally {
                this.currentOperations.delete(operationId);
                this.setButtonsState(false);
                this.showCancelButton(false);
                if (!this.isCancelled) {
                    unfollowBtn.textContent = '取关选中用户';
                }
            }
        }

        // 显示取关结果的专用方法
        showUnfollowResult(successCount, failedCount, failedUsers) {
            let resultMsg = `批量取关完成！\n成功: ${successCount}个，失败: ${failedCount}个`;

            if (failedUsers.length > 0) {
                resultMsg += `\n\n失败用户详情：`;
                failedUsers.slice(0, 5).forEach(user => {
                    resultMsg += `\n${user.name}: ${user.error}`;
                });

                if (failedUsers.length > 5) {
                    resultMsg += `\n... 还有 ${failedUsers.length - 5} 个失败用户`;
                }

                // 如果有多个用户失败，提供调试建议
                if (failedUsers.length > 2) {
                    resultMsg += `\n\n建议：\n1. 检查网络连接\n2. 确认登录状态\n3. 稍后重试失败的用户`;
                }
            }

            alert(resultMsg);
        }        // 获取全部粉丝数
        async fetchAllFans() {
            if (!confirm(MESSAGES.CONFIRM_FETCH_ALL)) return;

            this.setButtonsState(true);
            this.showCancelButton(true);
            const btn = this.overlay.querySelector('#modal-fetch-fans');
            const operationId = 'fetchAllFans';
            this.currentOperations.add(operationId);
            this.isCancelled = false;

            btn.textContent = '获取中...';

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
                } catch (error) {
                    // 静默失败，继续下一个
                }

                processedCount++;
                btn.textContent = formatMessage(MESSAGES.PROGRESS_FETCH, processedCount, totalCount, Math.round(processedCount/totalCount*100));

                if (processedCount % 10 === 0) {
                    cache.set(this.list);
                }

                if (i < this.list.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, CONFIG.API_DELAY));
                }
            }

            cache.set(this.list);
            this.currentOperations.delete(operationId);
            this.setButtonsState(false);
            this.showCancelButton(false);

            if (!this.isCancelled) {
                alert(formatMessage(MESSAGES.SUCCESS_FETCH_FANS, processedCount, totalCount));
                btn.textContent = '获取全部粉丝数';
            } else {
                // 操作被取消时显示已获取的结果
                setTimeout(() => {
                    alert(`获取全部粉丝数已取消\n\n已成功获取 ${processedCount}/${totalCount} 个用户的粉丝数据\n数据已保存到缓存中`);
                }, 100);
            }
        }// 取消当前操作
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
        }        // 统一处理用户列表和缓存的方法
        removeUserFromList(mid) {
            const index = this.list.findIndex(u => u.mid === mid);
            if (index !== -1) this.list.splice(index, 1);
        }

        removeUserFromFilteredList(mid) {
            const index = this.filteredList.findIndex(u => u.mid === mid);
            if (index !== -1) this.filteredList.splice(index, 1);
        }

        updateCacheAndCounts() {
            cache.set(this.list);
            this.overlay.querySelector('#modal-show-count').textContent = this.filteredList.length;
            this.overlay.querySelector('#modal-total-count').textContent = this.list.length;
            this.updateSelectedCount();
        }

        // 按钮状态管理
        showCancelButton(show) {
            const btn = this.overlay?.querySelector('#modal-cancel-operation');
            if (btn) btn.style.display = show ? 'inline-block' : 'none';
        }

        setButtonsState(disabled) {
            this.overlay?.querySelectorAll('button:not(#modal-cancel-operation)')
                .forEach(btn => btn.disabled = disabled);
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
        }        // 清除缓存
        clearCache() {
            // 创建自定义确认对话框
            const modalOverlay = document.createElement('div');
            modalOverlay.style.cssText = `
                position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 10001;
                display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px);
            `;

            const confirmDialog = document.createElement('div');
            confirmDialog.style.cssText = `
                background: #fff; border-radius: 12px; padding: 25px; max-width: 400px; width: 90%;
                box-shadow: 0 20px 40px rgba(0,0,0,0.15); text-align: center;
            `;

            confirmDialog.innerHTML = `
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">清除缓存选项</h3>
                <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">请选择要清除的缓存类型：</p>
                <div style="text-align: left; margin: 20px 0;">
                    <label style="display: block; margin: 10px 0; cursor: pointer;">
                        <input type="checkbox" id="clear-follow-cache" checked style="margin-right: 8px;">
                        <span>关注列表缓存 (下次打开将重新加载关注列表)</span>
                    </label>
                    <label style="display: block; margin: 10px 0; cursor: pointer;">
                        <input type="checkbox" id="clear-fans-cache" style="margin-right: 8px;">
                        <span>粉丝数缓存 (下次将重新获取所有用户的粉丝数)</span>
                    </label>
                </div>
                <div style="margin-top: 25px;">
                    <button id="confirm-clear" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-right: 10px; cursor: pointer;">确定</button>
                    <button id="cancel-clear" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">取消</button>
                </div>
            `;

            modalOverlay.appendChild(confirmDialog);
            document.body.appendChild(modalOverlay);

            // 绑定事件
            const confirmBtn = confirmDialog.querySelector('#confirm-clear');
            const cancelBtn = confirmDialog.querySelector('#cancel-clear');
            const followCacheCheckbox = confirmDialog.querySelector('#clear-follow-cache');
            const fansCacheCheckbox = confirmDialog.querySelector('#clear-fans-cache');

            const cleanup = () => {
                document.body.removeChild(modalOverlay);
            };

            cancelBtn.onclick = cleanup;
            modalOverlay.onclick = (e) => {
                if (e.target === modalOverlay) cleanup();
            };

            confirmBtn.onclick = () => {
                const clearFollowCache = followCacheCheckbox.checked;
                const clearFansCache = fansCacheCheckbox.checked;

                if (!clearFollowCache && !clearFansCache) {
                    alert('请至少选择一种缓存类型');
                    return;
                }

                cleanup();
                this.performClearCache(clearFollowCache, clearFansCache);
            };
        }        // 执行清除缓存操作
        performClearCache(clearFollowCache, clearFansCache) {
            // 先取消所有进行中的操作，但不显示"操作已终止"消息
            this.isFromClearCache = true; // 标记来自清除缓存操作
            this.cancelOperations();

            let clearedItems = [];

            if (clearFollowCache) {
                localStorage.removeItem('bilibili_follow_cache');
                clearedItems.push('关注列表缓存');
            }

            if (clearFansCache) {
                let fansCount = 0;
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('bilibili_user_')) {
                        localStorage.removeItem(key);
                        fansCount++;
                    }
                }
                clearedItems.push(`粉丝数缓存 (${fansCount}个用户)`);
            }

            const successMsg = `缓存已清除！\n\n已清除：\n${clearedItems.join('\n')}`;
            alert(successMsg);

            // 清除缓存后关闭模态窗口
            this.remove();
            if (this.onClose) this.onClose();

            // 重置标记，确保清理状态
            this.isFromClearCache = false;
        }
    }

    // 初始化应用
    new FollowManager();
})();
