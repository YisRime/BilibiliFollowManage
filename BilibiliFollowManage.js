// ==UserScript==
// @name         B站关注管理
// @namespace    https://github.com/YisRime/BilibiliFollowManage
// @version      5.0
// @description  关注列表管理，支持筛选会员/认证/原始粉丝/互相关注状态，支持粉丝数/投稿时间/动态时间排序，可导出/导入关注列表，支持批量取关/批量关注/转移分组等操作
// @author       苡淞, float0108
// @match        https://space.bilibili.com/*/relation/follow*
// @match        https://space.bilibili.com/*/fans/follow*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.bilibili.com
// @require      https://cdn.bootcdn.net/ajax/libs/blueimp-md5/2.19.0/js/md5.min.js
// @license      AGPLv3
// ==/UserScript==

(function () {
    "use strict";

    // WBI 签名
    const MIXIN_KEY_ENC_TAB = [
        46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
        33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
        61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
        36, 20, 34, 44, 52
    ];
    // 获取 Key
    const getMixinKey = (orig) => MIXIN_KEY_ENC_TAB.map(n => orig[n]).join('').slice(0, 32);
    // WBI 加密
    const encWbi = (params, img_key, sub_key) => {
        const mixin_key = getMixinKey(img_key + sub_key), curr_time = Math.round(Date.now() / 1000), chr_filter = /[!'()*]/g;
        const newParams = { ...params, wts: curr_time };
        const query = Object.keys(newParams).sort().map(key => `${encodeURIComponent(key)}=${encodeURIComponent(newParams[key].toString().replace(chr_filter, ''))}`).join('&');
        return query + '&w_rid=' + md5(query + mixin_key);
    };

    // 样式定义
    GM_addStyle(`
        :root {
            --b-blue: #00aeec; --b-blue-hover: #00a1d6;
            --b-pink: #fb7299; --b-red: #ff4d4f; --b-green: #52c41a; --b-orange: #fa8c16;
            --b-text-main: #18191c; --b-text-sub: #61666d; --b-text-dis: #9499a0;
            --b-bg-body: #ffffff; --b-bg-gray: #f6f7f8; --b-bg-hover: #e3f5ff;
            --b-border: #e3e5e7; --b-shadow: 0 4px 16px rgba(0,0,0,0.08);
            --b-radius: 6px;
        }
        /* 入口 */
        .bm-btn-entry {
            position: fixed; top: 160px; right: 20px; z-index: 999;
            background: var(--b-blue); color: #fff;
            padding: 8px 16px; border-radius: 8px; border: none;
            cursor: pointer; box-shadow: 0 4px 12px rgba(0,174,236,0.3);
            font-size: 14px; font-weight: 500; transition: all 0.2s;
        }
        .bm-btn-entry:hover { transform: translateY(-2px); background: var(--b-blue-hover); }
        /* 遮罩 */
        .bm-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000;
            display: flex; justify-content: center; align-items: center; backdrop-filter: blur(2px);
        }
        /* 窗口 */
        .bm-win {
            width: 95vw; max-width: 1380px; height: 90vh;
            background: var(--b-bg-body); border-radius: 12px;
            display: flex; flex-direction: column; overflow: hidden;
            box-shadow: var(--b-shadow);
            font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", sans-serif;
            color: var(--b-text-main);
        }
        /* 顶部操作 */
        .bm-header {
            flex-shrink: 0; background: var(--b-bg-body);
            border-bottom: 1px solid var(--b-border);
            display: flex; flex-direction: column;
            padding: 12px 16px; gap: 10px;
            position: relative;
        }
        .bm-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        /* 输入选择 */
        .bm-input, .bm-select {
            height: 32px; box-sizing: border-box;
            border: 1px solid var(--b-border); border-radius: var(--b-radius);
            padding: 0 8px; font-size: 13px; color: var(--b-text-main);
            outline: none; transition: border 0.2s; background: var(--b-bg-body);
        }
        .bm-input:focus, .bm-select:focus { border-color: var(--b-blue); }
        /* 组合输入 */
        .bm-group { display: flex; align-items: center; }
        .bm-group .bm-input { border-radius: 0; border-right: none; border-left: none; }
        .bm-group .bm-input:first-child { border-radius: var(--b-radius) 0 0 var(--b-radius); border-left: 1px solid var(--b-border); }
        .bm-group .bm-toggle {
            height: 32px; padding: 0 8px; background: var(--b-bg-gray);
            border: 1px solid var(--b-border);
            font-size: 12px; color: var(--b-text-sub); cursor: pointer;
            display: flex; align-items: center; justify-content: center; user-select: none;
        }
        .bm-group .bm-toggle:first-child { border-radius: var(--b-radius) 0 0 var(--b-radius); border-right: none; }
        .bm-group .bm-toggle:last-child { border-radius: 0 var(--b-radius) var(--b-radius) 0; border-left: none; }
        .bm-group .bm-toggle:hover { background: #eee; color: var(--b-text-main); }
        /* 按钮 */
        .bm-btn {
            height: 32px; padding: 0 12px; border-radius: var(--b-radius);
            border: 1px solid var(--b-border); background: var(--b-bg-body);
            color: var(--b-text-main); font-size: 13px; cursor: pointer;
            display: inline-flex; align-items: center; justify-content: center;
            transition: all 0.2s; white-space: nowrap;
        }
        .bm-btn:hover:not(:disabled) { border-color: var(--b-blue); color: var(--b-blue); background: var(--b-bg-hover); }
        .bm-btn:disabled { opacity: 0.5; cursor: not-allowed; background: var(--b-bg-gray); }
        .bm-btn.primary { background: var(--b-blue); color: #fff; border-color: var(--b-blue); }
        .bm-btn.primary:hover:not(:disabled) { background: var(--b-blue-hover); border-color: var(--b-blue-hover); }
        .bm-btn.danger { color: var(--b-red); border-color: #ffccc7; background: #fff1f0; }
        .bm-btn.danger:hover:not(:disabled) { border-color: var(--b-red); background: var(--b-red); color: #fff; }
        .bm-divider { width: 1px; height: 20px; background: var(--b-border); margin: 0 4px; }
        /* 状态 */
        .bm-spacer { flex: 1; text-align: center; color: var(--b-text-sub); font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .bm-close {
            font-size: 20px; color: var(--b-text-dis); cursor: pointer;
            transition: color 0.2s;
            position: absolute; top: 12px; right: 16px;
        }
        .bm-close:hover { color: var(--b-text-main); }
        /* 列表 */
        .bm-body { flex: 1; overflow-y: auto; scrollbar-width: thin; background: var(--b-bg-gray); }
        .bm-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; background: var(--b-bg-body); }
        .bm-table th {
            position: sticky; top: 0; background: #fafafa; z-index: 10;
            padding: 10px; border-bottom: 1px solid var(--b-border);
            color: var(--b-text-sub); text-align: left; font-weight: 600;
            white-space: nowrap; user-select: none; cursor: pointer;
        }
        .bm-table th:hover { background: #f0f0f0; color: var(--b-text-main); }
        .bm-table th.active { color: var(--b-blue); background: #e6f7ff; }
        .bm-table td {
            padding: 8px 10px; border-bottom: 1px solid var(--b-bg-gray);
            height: 50px; box-sizing: border-box; white-space: nowrap;
            overflow: hidden; text-overflow: ellipsis; color: var(--b-text-main);
        }
        .bm-table tr:hover { background: #fafafa; }
        .bm-table tr.sel { background: var(--b-bg-hover) !important; }
        /* 用户信息 */
        .bm-user-cell { display: flex; align-items: center; gap: 10px; }
        .bm-face { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid var(--b-border); cursor: help; }
        .bm-u-info { display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
        .bm-u-row1 { display: flex; align-items: center; gap: 6px; }
        .bm-name { font-weight: 500; color: var(--b-text-main); text-decoration: none; font-size: 14px; }
        .bm-name:hover { color: var(--b-blue); }
        .bm-sign { font-size: 12px; color: var(--b-text-dis); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; }
        /* 标签 */
        .bm-tag {
            font-size: 11px; padding: 0 6px; height: 18px; border-radius: 4px;
            display: inline-flex; align-items: center; justify-content: center;
            border: 1px solid; line-height: 1; flex-shrink: 0;
            font-weight: 400; margin-left: 2px;
        }
        /* VIP */
        .t-vip { color: #d6249f; background: #fdf2f8; border-color: #fbcfe8; }
        /* 认证-组织 */
        .t-org { color: #0066ff; background: #e6f0ff; border-color: #b3d1ff; }
        /* 认证-个人 */
        .t-per { color: #ff6b00; background: #fff4e6; border-color: #ffd8a8; }
        /* 分组 */
        .t-group { color: #10b981; background: #ecfdf5; border-color: #a7f3d0; }
        /* 特别关注 */
        .t-special { color: #e63946; background: #ffe5e5; border-color: #ffadad; }
        /* 互相关注 */
        .t-mutual { color: #8b5cf6; background: #f5f3ff; border-color: #c4b5fd; }
        /* 原始粉丝 */
        .t-other { color: #b45309; background: #fffbeb; border-color: #fde68a; }
        /* 无 */
        .t-none { color: #9ca3af; background: #f9fafb; border-color: #e5e7eb; }
    `);

    class App {
        constructor() {
            // 初始化
            this.state = {
                list: [], groups: {}, wbiKeys: null, running: false,
                sortKey: null, sortOrder: 0,
                filterMode: { fans: '>=', date: '<=', dateType: 'mtime' }, selectedMids: new Set()
            };
            this.uiRoot = null; this.dataLoaded = false;
            // 获取 UID
            this.uid = window.location.pathname.match(/space\/(\d+)/)?.[1] || document.cookie.match(/DedeUserID=(\d+)/)?.[1];
            // 创建入口
            const btn = document.createElement('button');
            btn.className = 'bm-btn-entry'; btn.textContent = '关注管理'; btn.onclick = () => this.show();
            document.body.appendChild(btn);
        }

        // 封装请求
        req(url, method = 'GET', data = null) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method, url, data,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': document.cookie },
                    onload: r => {
                        try { const res = JSON.parse(r.responseText); (res.code === 0 || res.code === 22003) ? resolve(res) : reject(res); }
                        catch(e) { reject({ message: 'JSON Error' }); }
                    }, onerror: () => reject({ message: 'Net Error' })
                });
            });
        }

        // 获取 WBI 鉴权
        async getWbiKeys() {
            if (this.state.wbiKeys) return this.state.wbiKeys;
            try {
                const res = await this.req('https://api.bilibili.com/x/web-interface/nav');
                const { img_url, sub_url } = res.data.wbi_img;
                return this.state.wbiKeys = {
                    img_key: img_url.slice(img_url.lastIndexOf('/') + 1, img_url.lastIndexOf('.')),
                    sub_key: sub_url.slice(sub_url.lastIndexOf('/') + 1, sub_url.lastIndexOf('.'))
                };
            } catch (e) { return { img_key: '', sub_key: '' }; }
        }

        // 初始化 UI
        initUI() {
            if (this.uiRoot) return;
            const el = document.createElement('div'); el.className = 'bm-overlay'; el.style.display = 'none'; this.uiRoot = el;
            el.innerHTML = `
                <div class="bm-win">
                    <div class="bm-header">
                        <div class="bm-close" id="bm-btn-close">✕</div>
                        <div class="bm-row">
                            <input id="bm-k" class="bm-input" placeholder="搜索..." style="width:240px">
                            <div class="bm-group">
                                <input type="number" id="bm-f-val" class="bm-input" placeholder="粉丝数" style="border-radius:var(--b-radius) 0 0 var(--b-radius)">
                                <div class="bm-toggle" id="bm-f-tog">≥</div>
                            </div>
                            <div class="bm-group">
                                <div class="bm-toggle" id="bm-d-type">关注</div>
                                <input type="date" id="bm-d-val" class="bm-input">
                                <div class="bm-toggle" id="bm-d-tog">早于</div>
                            </div>
                            <select id="bm-sel-vip" class="bm-select">
                                <option value="">会员</option><option value="hundred">百年</option><option value="ten">十年</option>
                                <option value="2">年度</option><option value="1">月度</option><option value="0">无</option>
                            </select>
                            <select id="bm-sel-verify" class="bm-select">
                                <option value="">认证</option><option value="1">组织</option><option value="0">个人</option><option value="-1">无</option>
                            </select>
                            <select id="bm-sel-status" class="bm-select">
                                <option value="">状态</option><option value="mutual">互相关注</option><option value="special">特别关注</option>
                                <option value="contract">原始粉丝</option><option value="deactivated">账号注销</option>
                            </select>
                            <select id="bm-sel-group" class="bm-select">
                                <option value="">分组</option><option value="-10">特别关注</option><option value="0">默认分组</option>
                            </select>
                        </div>
                        <div class="bm-row">
                            <select id="bm-io-fmt" class="bm-select">
                                <option value="csv">CSV</option>
                                <option value="json">JSON</option>
                            </select>
                            <button class="bm-btn" id="bm-btn-import">导入</button>
                            <button class="bm-btn" id="bm-btn-export">导出</button>
                            <div class="bm-spacer" id="bm-status">加载中...</div>
                            <select id="bm-sel-target-group" class="bm-select">
                                <option value="">目标分组</option>
                            </select>
                            <button class="bm-btn" id="bm-btn-group-add">添加</button>
                            <button class="bm-btn" id="bm-btn-group-copy">复制</button>
                            <button class="bm-btn" id="bm-btn-group-move">移动</button>
                            <div class="bm-divider"></div>
                            <button class="bm-btn" id="bm-btn-fans">获取粉丝</button>
                            <button class="bm-btn" id="bm-btn-video">获取投稿</button>
                            <button class="bm-btn" id="bm-btn-dynamic">获取动态</button>
                            <button class="bm-btn danger" id="bm-btn-unfollow" disabled>取关</button>
                            <button class="bm-btn primary" id="bm-btn-follow" disabled>关注</button>
                        </div>
                    </div>
                    <div class="bm-body">
                        <table class="bm-table">
                            <thead>
                                <tr>
                                    <th width="40"><input type="checkbox" id="bm-all"></th>
                                    <th data-sort="uname">用户 ↕</th>
                                    <th width="100" data-sort="follower">粉丝数 ↕</th>
                                    <th width="100" data-sort="last_dynamic">最新动态 ↕</th>
                                    <th width="100" data-sort="last_video">最新投稿 ↕</th>
                                    <th width="100" data-sort="mtime">关注时间 ↕</th>
                                    <th width="60" data-sort="vip">会员 ↕</th>
                                    <th width="60" data-sort="verify">认证 ↕</th>
                                </tr>
                            </thead>
                            <tbody id="bm-list"></tbody>
                        </table>
                    </div>
                </div>`;
            document.body.appendChild(el);
            this.bindEvents(el);
        }

        // 绑定 DOM 事件
        bindEvents(root) {
            const Q = (id) => root.querySelector('#' + id);
            Q('bm-btn-close').onclick = () => this.hide();
            Q('bm-all').onchange = (e) => this.toggleAll(e.target.checked);
            // 操作按钮
            ['bm-btn-fans', 'bm-btn-follow', 'bm-btn-unfollow', 'bm-btn-video', 'bm-btn-dynamic'].forEach(id => Q(id).onclick = () => this.act(id.replace('bm-btn-', '')));
            ['bm-btn-group-add', 'bm-btn-group-copy', 'bm-btn-group-move'].forEach(id => Q(id).onclick = () => this.act(id.replace('bm-btn-', '')));
            // IO 按钮
            Q('bm-btn-import').onclick = () => this.act('import');
            Q('bm-btn-export').onclick = () => this.act('export');
            // 筛选事件
            ['bm-k', 'bm-f-val'].forEach(id => Q(id).oninput = () => this.render());
            ['bm-d-val', 'bm-sel-vip', 'bm-sel-verify', 'bm-sel-status', 'bm-sel-group'].forEach(id => Q(id).onchange = () => this.render());
            // 切换符号
            Q('bm-f-tog').onclick = (e) => { 
                e.target.textContent = (this.state.filterMode.fans = e.target.textContent === '≥' ? '<' : '≥'); 
                if(Q('bm-f-val').value) this.render(); 
            };
            Q('bm-d-tog').onclick = (e) => { 
                const isBefore = e.target.textContent === '早于'; 
                this.state.filterMode.date = isBefore ? '>' : '<='; 
                e.target.textContent = isBefore ? '晚于' : '早于'; 
                if(Q('bm-d-val').value) this.render(); 
            };
            // 日期类型切换
            Q('bm-d-type').onclick = (e) => {
                const types = { 'mtime': '关注', 'last_video_ts': '投稿', 'last_dynamic_ts': '动态' };
                const keys = Object.keys(types);
                const currIdx = keys.indexOf(this.state.filterMode.dateType);
                const nextKey = keys[(currIdx + 1) % keys.length];
                this.state.filterMode.dateType = nextKey;
                e.target.textContent = types[nextKey];
                if(Q('bm-d-val').value) this.render();
            };
            // 排序点击
            root.querySelectorAll('th[data-sort]').forEach(th => th.onclick = () => this.sort(th.dataset.sort));
            // 列表点击
            root.querySelector('#bm-list').onclick = (e) => {
                const tr = e.target.closest('tr'); if (!tr || e.target.tagName === 'A') return;
                const mid = parseInt(tr.dataset.mid, 10), chk = tr.querySelector('.bm-chk');
                if (e.target.type !== 'checkbox') chk.checked = !chk.checked;
                chk.checked ? this.state.selectedMids.add(mid) : this.state.selectedMids.delete(mid);
                this.updateSelectionUI();
            };
        }

        // 显示窗口
        show() { if (!this.uiRoot) this.initUI(); this.uiRoot.style.display = 'flex'; if (!this.dataLoaded) this.loadData(); }
        // 隐藏窗口
        hide() { if (this.uiRoot) this.uiRoot.style.display = 'none'; }

        // 加载分组
        async loadGroups() {
            try {
                const res = await this.req('https://api.bilibili.com/x/relation/tags');
                if (res.data) {
                    this.state.groups = {};
                    const selFilter = document.getElementById('bm-sel-group');
                    const selTarget = document.getElementById('bm-sel-target-group');
                    selTarget.innerHTML = '<option value="">目标分组</option>';
                    res.data.forEach(g => {
                        this.state.groups[g.tagid] = g.name;
                        if (g.tagid !== 0 && g.tagid !== -10) {
                            selFilter.add(new Option(g.name, g.tagid));
                            selTarget.add(new Option(g.name, g.tagid));
                        }
                    });
                    selTarget.add(new Option('特别关注', -10));
                }
            } catch (e) { console.error('加载分组失败', e); }
        }

        // 加载关注
        async loadData() {
            if (!this.uid) return alert('请先登录');
            await this.loadGroups();
            this.state.list = [];
            const status = document.getElementById('bm-status');
            try {
                let page = 1;
                while (this.uiRoot.style.display !== 'none') {
                    const res = await this.req(`https://api.bilibili.com/x/relation/followings?vmid=${this.uid}&pn=${page}&ps=50&order=desc&order_type=attention`).catch(()=>null);
                    const items = res?.data?.list || [];
                    if (!items.length) break;
                    this.state.list.push(...items);
                    status.textContent = `读取中... (${this.state.list.length} / ${res.data.total})`;
                    if (this.isFilterEmpty() && this.state.sortOrder === 0) this.appendRows(items);
                    if (items.length < 50) break;
                    page++;
                    await new Promise(r => setTimeout(r, 200));
                }
                this.dataLoaded = true;
                this.render();
            } catch (e) { status.textContent = '加载关注失败'; console.error(e); }
        }

        // 检查过滤
        isFilterEmpty() {
            const Q = (id) => document.getElementById(id);
            return !Q('bm-k').value && !Q('bm-f-val').value && !Q('bm-d-val').value && 
                   !Q('bm-sel-verify').value && !Q('bm-sel-vip').value && 
                   !Q('bm-sel-status').value && !Q('bm-sel-group').value;
        }

        // 渲染列表
        render() {
            const tbody = document.getElementById('bm-list'); if(!tbody) return;
            tbody.innerHTML = '';
            // 获取条件
            const key = document.getElementById('bm-k').value.toLowerCase();
            const fansVal = parseInt(document.getElementById('bm-f-val').value);
            const dateStr = document.getElementById('bm-d-val').value;
            let dateTs = dateStr ? new Date(dateStr).getTime() / 1000 : 0;
            const verifyFilter = document.getElementById('bm-sel-verify').value;
            const vipFilter = document.getElementById('bm-sel-vip').value;
            const statusFilter = document.getElementById('bm-sel-status').value;
            const groupFilter = document.getElementById('bm-sel-group').value;
            // 过滤
            let view = this.state.list.filter(u => {
                const verifyDesc = (u.official_verify?.desc || '').toLowerCase();
                if (key && !u.uname.toLowerCase().includes(key) && !String(u.mid).includes(key) && !(u.sign||'').toLowerCase().includes(key) && !verifyDesc.includes(key)) return false;
                
                if (!isNaN(fansVal)) {
                    if (this.state.filterMode.fans === '>=' && (u.follower || 0) < fansVal) return false;
                    if (this.state.filterMode.fans === '<' && (u.follower || 0) >= fansVal) return false;
                }
                if (dateTs) {
                    let targetTime = 0;
                    const dtype = this.state.filterMode.dateType;
                    if (dtype === 'mtime') targetTime = u.mtime;
                    else if (dtype === 'last_video_ts') targetTime = u.last_video_ts || 0;
                    else if (dtype === 'last_dynamic_ts') targetTime = u.last_dynamic_ts || 0;
                    
                    if (targetTime) {
                        if (this.state.filterMode.date === '<=' && targetTime > dateTs) return false;
                        if (this.state.filterMode.date === '>' && targetTime < dateTs) return false;
                    }
                }
                if (verifyFilter !== "") {
                    const type = u.official_verify?.type ?? -1;
                    if (String(type) !== verifyFilter && !(verifyFilter === "1" && type > 1)) return false;
                }
                if (vipFilter !== "") {
                    const txt = u.vip?.label?.text || "";
                    const vt = u.vip?.vipStatus === 1 ? u.vip.vipType : 0;
                    if (vipFilter === "hundred" && !txt.includes("百年")) return false;
                    if (vipFilter === "ten" && !txt.includes("十年")) return false;
                    if (vipFilter === "2" && vt !== 2) return false;
                    if (vipFilter === "1" && vt !== 1) return false;
                    if (vipFilter === "0" && vt !== 0) return false;
                }
                if (statusFilter !== "") {
                    if (statusFilter === "mutual" && u.attribute !== 6) return false;
                    if (statusFilter === "special" && !(u.tag?.includes(-10) || u.special === 1)) return false;
                    if (statusFilter === "contract" && !u.contract_info?.is_contract) return false;
                    if (statusFilter === "deactivated" && u.uname !== "账号已注销") return false;
                }
                if (groupFilter !== "") {
                    const tags = u.tag || [];
                    if (groupFilter === "0") { if (tags.length > 0 && !tags.includes(0)) return false; }
                    else { if (!tags.includes(parseInt(groupFilter))) return false; }
                }
                return true;
            });
            // 排序
            if (this.state.sortKey && this.state.sortOrder !== 0) {
                const k = this.state.sortKey;
                const d = this.state.sortOrder; // 1 or -1
                view.sort((a, b) => {
                    let vA, vB;
                    switch(k) {
                        case 'uname': return a.uname.localeCompare(b.uname, 'zh') * d;
                        case 'follower': vA = a.follower||0; vB = b.follower||0; break;
                        case 'mtime': vA = a.mtime||0; vB = b.mtime||0; break;
                        case 'last_video': vA = a.last_video_ts||0; vB = b.last_video_ts||0; break;
                        case 'last_dynamic': vA = a.last_dynamic_ts||0; vB = b.last_dynamic_ts||0; break;
                        case 'verify': vA = a.official_verify?.type ?? -1; vB = b.official_verify?.type ?? -1; break;
                        case 'vip': 
                            const getVipScore = (u) => {
                                if(u.vip?.label?.text?.includes("百年")) return 100;
                                if(u.vip?.label?.text?.includes("十年")) return 50;
                                if(u.vip?.vipStatus===1) return u.vip.vipType === 2 ? 10 : 5;
                                return 0;
                            };
                            vA = getVipScore(a); vB = getVipScore(b); break;
                    }
                    return (vA - vB) * d;
                });
            }
            this.appendRows(view);
            this.updateSelectionUI(view.length);
        }

        // 添加数据
        appendRows(items) {
            const tbody = document.getElementById('bm-list'); if (!tbody) return;
            const frag = document.createDocumentFragment();
            items.forEach(u => {
                const tr = document.createElement('tr'); 
                tr.dataset.mid = u.mid;
                const isChecked = this.state.selectedMids.has(u.mid);
                if (isChecked) tr.classList.add('sel');
                const dateStr = u.mtime ? new Date(u.mtime * 1000).toISOString().split('T')[0] : '-';
                const fans = u.follower === undefined ? '-' : u.follower.toLocaleString();
                const lastVideoStr = u.last_video_ts ? new Date(u.last_video_ts * 1000).toISOString().split('T')[0] : '-';
                const lastDynamicStr = u.last_dynamic_ts ? new Date(u.last_dynamic_ts * 1000).toISOString().split('T')[0] : '-';
                
                // 生成 VIP 标签
                let vipHtml = '<span class="bm-tag t-none">无</span>';
                if (u.vip?.vipStatus === 1) {
                    const txt = u.vip.label?.text || "";
                    let label = "会员";
                    if (txt.includes("百年")) label = "百年";
                    else if (txt.includes("十年")) label = "十年";
                    else if (u.vip.vipType === 2) label = "年度";
                    else if (u.vip.vipType === 1) label = "月度";
                    vipHtml = `<span class="bm-tag t-vip">${label}</span>`;
                }
                // 生成认证标签
                const offType = u.official_verify?.type;
                let offHtml = '<span class="bm-tag t-none">无</span>';
                if (offType === 0) offHtml = `<span class="bm-tag t-per" title="${u.official_verify.desc}">个人</span>`;
                else if (offType > 0) offHtml = `<span class="bm-tag t-org" title="${u.official_verify.desc}">组织</span>`;
                // 生成其他标签
                let tagList = [];
                if (u.attribute === 6) tagList.push(`<span class="bm-tag t-mutual">互相关注</span>`);
                if (u.contract_info?.is_contract) tagList.push(`<span class="bm-tag t-other">原始粉丝</span>`);
                if (u.tag && u.tag.length) {
                    u.tag.forEach(tid => {
                        if(tid === -10) tagList.push(`<span class="bm-tag t-special">特别关注</span>`);
                        else if(tid !== 0 && this.state.groups[tid]) tagList.push(`<span class="bm-tag t-group">${this.state.groups[tid]}</span>`);
                    });
                }
                // 提示 UID
                tr.innerHTML = `
                    <td><input type="checkbox" class="bm-chk" ${isChecked ? 'checked' : ''}></td>
                    <td>
                        <div class="bm-user-cell">
                            <a href="//space.bilibili.com/${u.mid}" target="_blank">
                                <img src="${(u.face||'').replace('http:', '')}" class="bm-face" loading="lazy" title="UID: ${u.mid}">
                            </a>
                            <div class="bm-u-info">
                                <div class="bm-u-row1">
                                    <a href="//space.bilibili.com/${u.mid}" target="_blank" class="bm-name" title="${u.uname}">${u.uname}</a>
                                    ${tagList.join('')}
                                </div>
                                <span class="bm-sign" title="${u.sign||''}">${u.sign || '-'}</span>
                            </div>
                        </div>
                    </td>
                    <td>${fans}</td>
                    <td style="color:var(--b-text-sub)">${lastDynamicStr}</td>
                    <td style="color:var(--b-text-sub)">${lastVideoStr}</td>
                    <td style="color:var(--b-text-sub)">${dateStr}</td>
                    <td>${vipHtml}</td>
                    <td>${offHtml}</td>`;
                frag.appendChild(tr);
            });
            tbody.appendChild(frag);
        }

        // 排序
        sort(key) {
            if (this.state.sortKey !== key) {
                this.state.sortKey = key;
                this.state.sortOrder = 1;
            } else {
                if (this.state.sortOrder === 1) this.state.sortOrder = -1;
                else if (this.state.sortOrder === -1) { this.state.sortOrder = 0; this.state.sortKey = null; }
                else this.state.sortOrder = 1;
            }
            // UI 更新
            document.querySelectorAll('.bm-table th[data-sort]').forEach(th => {
                const sKey = th.dataset.sort;
                th.classList.remove('active');
                let icon = ' ↕';
                if (sKey === this.state.sortKey && this.state.sortOrder !== 0) {
                    th.classList.add('active');
                    icon = this.state.sortOrder === 1 ? ' ↑' : ' ↓';
                }
                th.innerHTML = th.textContent.split(' ')[0] + icon;
            });
            this.render();
        }

        // 全选/反选
        toggleAll(checked) {
            document.querySelectorAll('#bm-list .bm-chk').forEach(c => {
                const mid = parseInt(c.closest('tr').dataset.mid, 10);
                checked ? this.state.selectedMids.add(mid) : this.state.selectedMids.delete(mid);
                c.checked = checked;
            });
            this.updateSelectionUI();
        }

        // 更新状态
        updateSelectionUI(viewCount) {
            if (!this.uiRoot) return;
            const trs = document.querySelectorAll('#bm-list tr');
            trs.forEach(tr => tr.classList.toggle('sel', this.state.selectedMids.has(parseInt(tr.dataset.mid, 10))));
            const selNum = this.state.selectedMids.size;
            const allTotal = this.state.list.length;
            const hasSel = selNum > 0;
            ['bm-btn-follow', 'bm-btn-unfollow', 'bm-btn-group-add', 'bm-btn-group-copy', 'bm-btn-group-move'].forEach(id => {
                const b = document.getElementById(id); if(b) b.disabled = !hasSel;
            });
            let statusText = `共 ${allTotal} 人`;
            if (viewCount !== undefined && viewCount !== allTotal) statusText += ` | 筛选 ${viewCount} 人`;
            if (selNum > 0) statusText += ` | <span style="color:var(--b-blue);font-weight:bold">已选 ${selNum} 人</span>`;
            document.getElementById('bm-status').innerHTML = statusText;
        }

        // 统一入口
        async act(type) {
            if (this.state.running) return;
            const format = document.getElementById('bm-io-fmt').value;
            // 导出
            if (type === 'export') {
                let targets = Array.from(this.state.selectedMids).map(mid => this.state.list.find(u => u.mid === mid)).filter(u => u);
                if (targets.length === 0) targets = this.state.list;
                const isJson = format === 'json';
                const blob = new Blob([isJson ? JSON.stringify(targets, null, 2) : 
                    // CSV 导出头部和内容
                    '\uFEFFUID,昵称,粉丝数,关注时间,最新投稿,最新动态,认证信息,会员状态,关注状态,分组,签名\n' + targets.map(u => {
                        const dateStr = (ts) => ts ? new Date(ts*1000).toISOString().split('T')[0] : '-';
                        const groups = (u.tag||[]).map(t=>this.state.groups[t]||(t==-10?'特别关注':t)).join(';');
                        const vipTxt = u.vip?.label?.text || (u.vip?.vipStatus?'会员':'');
                        const verifyTxt = u.official_verify?.desc || (u.official_verify?.type>=0 ? (u.official_verify.type==0?'个人':'组织') : '');
                        const statusTxt = [u.attribute===6?'互相关注':'', u.special===1?'特别关注':''].filter(x=>x).join(';');
                        // 处理字段中的逗号和引号
                        const esc = (s) => `"${String(s||'').replace(/"/g, '""')}"`;
                        return [
                            u.mid, esc(u.uname), u.follower||0, dateStr(u.mtime), dateStr(u.last_video_ts), dateStr(u.last_dynamic_ts),
                            esc(verifyTxt), esc(vipTxt), esc(statusTxt), esc(groups), esc(u.sign)
                        ].join(',');
                    }).join('\n')], 
                    {type: isJson ? 'application/json' : 'text/csv'});
                const a = document.createElement('a'); 
                a.href = URL.createObjectURL(blob); 
                a.download = `Bilibili_Follows_${new Date().toISOString().slice(0,10)}.${format}`; 
                a.click(); return;
            }
            // 导入
            if (type === 'import') {
                const input = document.createElement('input'); input.type='file'; 
                input.accept = format === 'json' ? ".json" : ".csv,.txt";
                input.onchange = e => {
                    const reader = new FileReader();
                    reader.onload = evt => {
                        let newItems = [];
                        if (format === 'json') {
                            try { 
                                newItems = (JSON.parse(evt.target.result)||[]).filter(i => i.mid && !this.state.list.some(u => u.mid == i.mid)); 
                                newItems.forEach(i=>{ if(!i.uname)i.uname='导入用户'; }); 
                            } catch(e){ return alert('JSON 格式错误'); }
                        } else {
                            // CSV 解析
                            const text = evt.target.result;
                            const lines = text.split(/\r?\n/).filter(l => l.trim());
                            const header = lines[0].split(',');
                            // 简单 CSV 解析器
                            const parseCSVLine = (str) => {
                                const res = []; let cur = '', inQuote = false;
                                for (let i = 0; i < str.length; i++) {
                                    const c = str[i], next = str[i+1];
                                    if (c === '"') {
                                        if (inQuote && next === '"') { cur += '"'; i++; }
                                        else inQuote = !inQuote;
                                    } else if (c === ',' && !inQuote) { res.push(cur); cur = ''; }
                                    else cur += c;
                                }
                                res.push(cur); return res;
                            };
                            // 尝试解析 CSV
                            const dateToTs = (s) => { if(!s||s==='-')return 0; const d = Date.parse(s); return isNaN(d)?0:d/1000; };
                            newItems = lines.slice(1).map(line => {
                                const cols = parseCSVLine(line);
                                if (!cols[0] || isNaN(parseInt(cols[0]))) return null;
                                const mid = parseInt(cols[0], 10);
                                if (this.state.list.some(u => u.mid === mid)) return null;
                                // 映射 CSV 列到对象
                                return {
                                    mid: mid,
                                    uname: cols[1] || '导入用户',
                                    follower: parseInt(cols[2]) || 0,
                                    mtime: dateToTs(cols[3]),
                                    last_video_ts: dateToTs(cols[4]),
                                    last_dynamic_ts: dateToTs(cols[5]),
                                    official_verify: { desc: cols[6] || '' },
                                    vip: { label: { text: cols[7] || '' } },
                                    attribute: cols[8]?.includes('互相关注') ? 6 : 2,
                                    sign: cols[10] || `UID: ${mid}`,
                                    tag: [] // 分组暂不反向解析，略复杂
                                };
                            }).filter(x => x);
                        }
                        if(!newItems.length) return alert('无新增用户');
                        this.state.list.unshift(...newItems); this.render();
                        setTimeout(() => { newItems.forEach(item => this.state.selectedMids.add(item.mid)); this.render(); }, 100);
                        alert(`已导入 ${newItems.length} 人`);
                    };
                    reader.readAsText(e.target.files[0]);
                };
                input.click(); return;
            }
            let targets = Array.from(this.state.selectedMids).map(mid => this.state.list.find(u => u.mid === mid)).filter(u => u);
            const batchTypes = ['fans', 'video', 'dynamic'];
            if (!targets.length && !batchTypes.includes(type)) return alert('请先选择用户');
            if (batchTypes.includes(type) && !targets.length) {
                const visible = Array.from(document.querySelectorAll('#bm-list tr')).map(tr => tr.dataset.mid);
                targets = this.state.list.filter(u => visible.includes(String(u.mid)));
                if(!targets.length) return;
            }
            // 分组操作
            if (type.startsWith('group-')) {
                const gid = document.getElementById('bm-sel-target-group').value;
                if (!gid) return alert('请先选择目标分组');
                const gname = this.state.groups[gid] || (gid==-10?'特别关注':'未知');
                if (type === 'group-move') {
                    const sourceGid = document.getElementById('bm-sel-group').value;
                    if (!sourceGid || sourceGid == 0) return alert('请先选择来源分组');
                    if (!confirm(`将 ${targets.length} 人移动到分组 ${gname}?`)) return;
                    await this.runTaskGroup(targets, 'move', gid, sourceGid);
                    return;
                }
                if (!confirm(`${type.includes('copy')?'复制':'添加'} ${targets.length} 人到分组 ${gname}?`)) return;
                await this.runTaskGroup(targets, type.includes('copy')?'copy':'add', gid);
                return;
            }
            // 关注/取关
            if (type === 'follow' || type === 'unfollow') {
                if (!confirm(`确定${type==='follow'?'关注':'取关'} ${targets.length} 人?`)) return;
            }
            this.state.running = true;
            if (type === 'fans') await this.runTaskFans(targets);
            else if (type === 'video') await this.runTaskVideo(targets);
            else if (type === 'dynamic') await this.runTaskDynamic(targets);
            else await this.runTaskModify(targets, type === 'follow' ? 1 : 2);
            this.state.running = false;
        }

        // 刷新粉丝
        async runTaskFans(items) {
            const status = document.getElementById('bm-status'); let ok=0;
            for (let i = 0; i < items.length; i++) {
                if(this.uiRoot.style.display === 'none') break;
                const u = items[i]; status.textContent = `查询 (${i+1}/${items.length}): ${u.uname}`;
                try {
                    const res = await this.req(`https://api.bilibili.com/x/relation/stat?vmid=${u.mid}`);
                    u.follower = res.data.follower;
                    const cell = document.querySelector(`tr[data-mid="${u.mid}"]`)?.cells[2];
                    if(cell) cell.textContent = u.follower.toLocaleString();
                    ok++;
                } catch(e) {}
                await new Promise(r => setTimeout(r, 250));
            }
            status.textContent = `已刷新 ${ok} 人`;
        }

        // 刷新投稿
        async runTaskVideo(items) {
            const status = document.getElementById('bm-status'); let ok=0;
            const wbi = await this.getWbiKeys();
            for (let i = 0; i < items.length; i++) {
                if(this.uiRoot.style.display === 'none') break;
                const u = items[i]; status.textContent = `查询 (${i+1}/${items.length}): ${u.uname}`;
                try {
                    const params = { mid: u.mid, ps: 1, pn: 1 };
                    const query = encWbi(params, wbi.img_key, wbi.sub_key);
                    const res = await this.req(`https://api.bilibili.com/x/space/wbi/arc/search?${query}`);
                    u.last_video_ts = res.data?.list?.vlist?.[0]?.created || 0;
                    const cell = document.querySelector(`tr[data-mid="${u.mid}"]`)?.cells[4];
                    if(cell) cell.textContent = u.last_video_ts ? new Date(u.last_video_ts * 1000).toISOString().split('T')[0] : '-';
                    ok++;
                } catch(e) {}
                await new Promise(r => setTimeout(r, 300));
            }
            status.textContent = `已刷新 ${ok} 人`;
        }

        // 刷新动态
        async runTaskDynamic(items) {
            const status = document.getElementById('bm-status'); let ok=0;
            for (let i = 0; i < items.length; i++) {
                if(this.uiRoot.style.display === 'none') break;
                const u = items[i]; status.textContent = `查询 (${i+1}/${items.length}): ${u.uname}`;
                try {
                    const res = await this.req(`https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid=${u.mid}&offset=`);
                    const items_list = res.data?.items || [];
                    let ts = 0;
                    if (items_list.length > 0 && items_list[0]?.modules?.module_author?.pub_ts) {
                        ts = items_list[0].modules.module_author.pub_ts;
                    }
                    u.last_dynamic_ts = ts;
                    const cell = document.querySelector(`tr[data-mid="${u.mid}"]`)?.cells[3]; // 注意列索引变化
                    if(cell) cell.textContent = u.last_dynamic_ts ? new Date(u.last_dynamic_ts * 1000).toISOString().split('T')[0] : '-';
                    ok++;
                } catch(e) {}
                await new Promise(r => setTimeout(r, 300));
            }
            status.textContent = `已刷新 ${ok} 人`;
        }

        // 修改关注
        async runTaskModify(items, act) {
            const status = document.getElementById('bm-status'), csrf = document.cookie.match(/bili_jct=([^;]+)/)?.[1];
            if (act === 2) {
                for (let i = 0; i < items.length; i++) {
                    if (this.uiRoot.style.display === 'none') break;
                    status.textContent = `取关 (${i+1}/${items.length}): ${items[i].uname}`;
                    try {
                        await this.req('https://api.bilibili.com/x/relation/modify', 'POST', `fid=${items[i].mid}&act=2&re_src=11&csrf=${csrf}`);
                        this.state.list = this.state.list.filter(x => x.mid != items[i].mid); this.state.selectedMids.delete(items[i].mid);
                    } catch(e){} await new Promise(r => setTimeout(r, 300));
                }
                this.render();
            } else {
                for (let i = 0; i < items.length; i += 50) {
                    if (this.uiRoot.style.display === 'none') break;
                    const chunk = items.slice(i, i + 50); status.textContent = `关注 (${Math.min(i+50,items.length)}/${items.length})`;
                    try {
                        const res = await this.req('https://api.bilibili.com/x/relation/batch/modify', 'POST', `fids=${chunk.map(u=>u.mid).join(',')}&act=1&re_src=11&csrf=${csrf}`);
                        const failed = res.data?.failed_fids || [];
                        chunk.forEach(u => { if(!failed.includes(u.mid)) { u.attribute=2; } });
                        if(failed.length) {
                            for(let u of chunk.filter(x=>failed.includes(x.mid))) {
                                try { await this.req('https://api.bilibili.com/x/relation/modify', 'POST', `fid=${u.mid}&act=1&re_src=11&csrf=${csrf}`); u.attribute=2; } catch(e){}
                                await new Promise(r => setTimeout(r, 300));
                            }
                        }
                    } catch(e){} await new Promise(r => setTimeout(r, 1000));
                }
            }
            status.textContent = `操作完成`; this.render();
        }

        // 修改分组
        async runTaskGroup(items, mode, targetGid, sourceGid) {
            const status = document.getElementById('bm-status'), csrf = document.cookie.match(/bili_jct=([^;]+)/)?.[1];
            const url = mode === 'move' ? 'https://api.bilibili.com/x/relation/tags/moveUsers' : (mode === 'copy' ? 'https://api.bilibili.com/x/relation/tags/copyUsers' : 'https://api.bilibili.com/x/relation/tags/addUsers');
            for (let i = 0; i < items.length; i += 50) {
                if (this.uiRoot.style.display === 'none') break;
                const chunk = items.slice(i, i + 50); status.textContent = `处理 (${Math.min(i+50,items.length)}/${items.length})`;
                const fids = chunk.map(u => u.mid).join(',');
                let postData = `fids=${fids}&csrf=${csrf}`;
                if (mode === 'move') postData += `&beforeTagids=${sourceGid}&afterTagids=${targetGid}`;
                else postData += `&tagids=${targetGid}`;
                try {
                    await this.req(url, 'POST', postData);
                    const gidInt = parseInt(targetGid);
                    chunk.forEach(u => {
                        if(!u.tag) u.tag = [];
                        if(mode === 'move') u.tag = u.tag.filter(t => t != sourceGid);
                        if(!u.tag.includes(gidInt)) u.tag.push(gidInt);
                    });
                } catch(e) { console.error(e); }
                await new Promise(r => setTimeout(r, 300));
            }
            status.textContent = `操作完成`; this.render();
        }
    }
    new App();
})();
