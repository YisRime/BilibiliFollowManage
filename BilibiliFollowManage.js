// ==UserScript==
// @name         B站关注管理
// @namespace    https://github.com/YisRime/BilibiliFollowManage
// @version      4.0
// @description  关注管理，支持筛选、导入导出、批量取关与关注
// @author       苡淞, float0108
// @match        https://space.bilibili.com/*/relation/follow*
// @match        https://space.bilibili.com/*/fans/follow*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.bilibili.com
// @license      AGPLv3
// ==/UserScript==

(function () {
    "use strict";

    // 样式
    GM_addStyle(`
        :root {
            --b-blue: #00aeec; --b-pink: #fb7299; --b-red: #f44336; --b-orange: #ff9800; --b-green: #4caf50;
            --b-text-1: #18191c; --b-text-2: #61666d; --b-text-3: #9499a0;
            --b-bg-1: #ffffff; --b-bg-2: #f1f2f3; --b-bg-3: #e3e5e7;
            --b-border-color: #dcdfe6; --b-shadow-color: rgba(0, 0, 0, 0.1);
            --b-transition: all 0.2s ease-in-out;
        }
        .bm-btn {
            position: fixed; top: 160px; right: 20px; z-index: 999;
            background: var(--b-blue); color: var(--b-bg-1);
            padding: 8px 16px; border-radius: 8px; border: none;
            cursor: pointer; box-shadow: 0 4px 12px rgba(0,174,236,0.3);
            font-size: 14px; font-weight: 500; transition: var(--b-transition);
        }
        .bm-btn:hover { background: #00a1d6; transform: translateY(-2px) scale(1.05); }
        .bm-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 10000;
            display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px);
        }
        .bm-win {
            width: 95vw; max-width: 1400px; height: 85vh;
            background: var(--b-bg-1); border-radius: 12px;
            display: flex; flex-direction: column; overflow: hidden;
            box-shadow: 0 12px 32px var(--b-shadow-color);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .bm-top-bar { display: flex; flex-direction: column; }
        .bm-bar {
            padding: 12px 16px; background: var(--b-bg-1); display: flex; gap: 10px;
            align-items: center; border-bottom: 1px solid var(--b-bg-3); flex-wrap: wrap;
        }
        .bm-filter-panel, .bm-io-panel {
            display: none; padding: 10px 16px; gap: 10px; align-items: center; flex-wrap: wrap;
            border-bottom: 1px solid var(--b-bg-3); background: #fafbfc;
        }
        .bm-control {
            padding: 6px 10px; border: 1px solid var(--b-border-color); border-radius: 6px;
            font-size: 13px; outline: none; color: var(--b-text-1);
            background: var(--b-bg-1); transition: var(--b-transition); box-sizing: border-box; height: 31px;
        }
        .bm-control:focus, .bm-control:hover { border-color: var(--b-blue); box-shadow: 0 0 0 2px rgba(0,174,236,0.1); }
        .bm-group { display: flex; align-items: center; }
        .bm-group .bm-control { border-radius: 6px 0 0 6px; }
        .bm-group .bm-toggle {
            padding: 6px 10px; background: var(--b-bg-2); cursor: pointer;
            font-size: 13px; color: var(--b-text-2); font-weight: 600; user-select: none;
            border: 1px solid var(--b-border-color); border-left: none;
            border-radius: 0 6px 6px 0; transition: var(--b-transition);
            box-sizing: border-box; height: 31px; display: flex; align-items: center;
        }
        .bm-group .bm-toggle:hover { background: #dce0e6; color: var(--b-text-1); }
        .bm-act-btn {
            padding: 6px 14px; background: var(--b-bg-1); border-radius: 6px;
            cursor: pointer; font-size: 13px; transition: var(--b-transition);
            border: 1px solid var(--b-border-color); white-space: nowrap;
        }
        .bm-act-btn:hover:not(:disabled) { color: var(--b-blue); border-color: var(--b-blue); background: #f0faff; }
        .bm-act-btn.primary { background: var(--b-blue); color: #fff; border-color: var(--b-blue); }
        .bm-act-btn.primary:hover:not(:disabled) { background: #00a1d6; border-color: #00a1d6; color: #fff; }
        .bm-act-btn.danger { color: var(--b-red); border-color: #ffcdd2; }
        .bm-act-btn.danger:hover:not(:disabled) { background: var(--b-red); color: #fff; border-color: var(--b-red); }
        .bm-act-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .bm-actions { margin-left: auto; display: flex; gap: 10px; align-items: center; }
        .bm-status { font-size: 13px; color: var(--b-text-3); font-variant-numeric: tabular-nums; }
        .bm-close {
            font-size: 24px; cursor: pointer; color: var(--b-text-3);
            margin-left: 8px; line-height: 1; transition: var(--b-transition);
        }
        .bm-close:hover { color: var(--b-text-1); transform: scale(1.1) rotate(90deg); }
        .bm-body { flex: 1; overflow-y: auto; scrollbar-width: thin; }
        .bm-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
        .bm-table th {
            position: sticky; top: 0; background: #fafafa; z-index: 10;
            padding: 12px 10px; border-bottom: 1px solid var(--b-bg-3);
            color: var(--b-text-2); cursor: pointer; text-align: left; font-weight: 600;
            white-space: nowrap; user-select: none; transition: var(--b-transition);
        }
        .bm-table th:hover { color: var(--b-blue); background: var(--b-bg-2); }
        .bm-table th.sorting { color: var(--b-blue); background: #eaf8ff; }
        .bm-table th .sort-order { font-size: 11px; color: var(--b-text-3); margin-left: 2px; }
        .bm-table td {
            padding: 6px 10px; border-bottom: 1px solid var(--b-bg-2); height: 44px;
            box-sizing: border-box; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--b-text-1);
        }
        .bm-table tr:hover { background: #f9faff; }
        .bm-table tr.sel { background: #e3f5ff !important; }
        .bm-table tr.new-import { background: #fff0f0; }
        .bm-user-row { display: flex; align-items: center; gap: 10px; width: 100%; overflow: hidden; }
        .bm-face { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; border: 1px solid #f1f1f1; object-fit: cover; }
        .bm-info { flex: 1; overflow: hidden; }
        .bm-name { font-weight: 500; color: var(--b-text-1); text-decoration: none; font-size: 14px; }
        .bm-name:hover { color: var(--b-blue); }
        .bm-name.special { color: var(--b-orange); font-weight: 600; }
        .bm-sign { color: var(--b-text-2); font-size: 12px; overflow: hidden; text-overflow: ellipsis; display: block; }
        .bm-tag {
            font-size: 12px; padding: 2px 6px; border-radius: 4px; border: 1px solid;
            cursor: default; background-color: var(--b-bg-1);
        }
        .tag-vip { color: var(--b-pink); border-color: var(--b-pink); }
        .tag-off { color: var(--b-blue); border-color: var(--b-blue); }
        .tag-per { color: var(--b-orange); border-color: var(--b-orange); }
        .tag-none { color: var(--b-text-3); border-color: var(--b-bg-3); }
    `);

    class App {
        constructor() {
            // 状态管理
            this.state = {
                list: [], // 关注数据
                running: false, // 任务状态
                sortCriteria: [], // 复合排序
                filterMode: { fans: '>=', date: '<=' }, // 筛选模式
                selectedMids: new Set() // 选中状态
            };
            this.uiRoot = null;
            this.dataLoaded = false;
            // 获取 UID
            this.uid = window.location.pathname.match(/space\/(\d+)/)?.[1] || document.cookie.match(/DedeUserID=(\d+)/)?.[1];
            // 创建入口
            const btn = document.createElement('button');
            btn.className = 'bm-btn';
            btn.textContent = '关注管理';
            btn.onclick = () => this.show();
            document.body.appendChild(btn);
        }

        // 显示 UI
        show() {
            if (!this.uiRoot) {
                this.initUI();
            }
            this.uiRoot.style.display = 'flex';
            if (!this.dataLoaded) {
                this.loadData();
            }
        }

        // 隐藏UI
        hide() {
            if (this.uiRoot) {
                this.uiRoot.style.display = 'none';
            }
        }

        // 网络请求
        req(url, method = 'GET', data = null) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method, url, data,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': document.cookie },
                    onload: r => {
                        try {
                            const res = JSON.parse(r.responseText);
                            res.code === 0 ? resolve(res) : reject(res.message);
                        } catch(e) { reject('JSON Parse Error'); }
                    },
                    onerror: () => reject('Network Error')
                });
            });
        }

        // 初始化
        initUI() {
            if (this.uiRoot) return;
            const el = document.createElement('div');
            el.className = 'bm-overlay';
            el.style.display = 'none';
            this.uiRoot = el;
            el.innerHTML = `
                <div class="bm-win">
                    <div class="bm-top-bar">
                        <div class="bm-bar">
                            <input id="bm-k" class="bm-control" placeholder="搜索..." style="width:160px">
                            <button class="bm-act-btn" id="bm-btn-toggle-filter">筛选</button>
                            <button class="bm-act-btn" id="bm-btn-toggle-io">导入导出</button>
                            <div class="bm-actions">
                                <span class="bm-status" id="bm-status">准备中...</span>
                                <button class="bm-act-btn" id="bm-btn-fans">获取粉丝</button>
                                <button class="bm-act-btn primary" id="bm-btn-follow" disabled style="display:none;">关注</button>
                                <button class="bm-act-btn danger" id="bm-btn-unfollow" disabled>取关</button>
                                <div class="bm-close" id="bm-btn-close">✕</div>
                            </div>
                        </div>
                        <div class="bm-filter-panel" id="bm-filter-panel">
                            <div class="bm-group">
                                <input type="number" id="bm-f-val" class="bm-control" placeholder="粉丝数" style="width:80px">
                                <div class="bm-toggle" id="bm-f-tog">≥</div>
                            </div>
                            <div class="bm-group">
                                <input type="date" id="bm-d-val" class="bm-control" style="width:120px">
                                <div class="bm-toggle" id="bm-d-tog">早于</div>
                            </div>
                            <select id="bm-sel-vip" class="bm-control">
                                <option value="">会员</option>
                                <option value="2">年度</option>
                                <option value="1">会员</option>
                                <option value="0">无</option>
                            </select>
                            <select id="bm-sel-verify" class="bm-control">
                                <option value="">认证</option>
                                <option value="1">官方</option>
                                <option value="0">个人</option>
                                <option value="-1">无</option>
                            </select>
                            <button class="bm-act-btn" id="bm-btn-sel-deactivated" style="margin-left: 10px;">勾选注销</button>
                             <button class="bm-act-btn" id="bm-btn-deselect-special">排除特关</button>
                        </div>
                        <div class="bm-io-panel" id="bm-io-panel">
                             <button class="bm-act-btn" id="bm-btn-import">导入 CSV</button>
                             <button class="bm-act-btn" id="bm-btn-import-json">导入 JSON</button>
                             <button class="bm-act-btn" id="bm-btn-export">导出 CSV</button>
                             <button class="bm-act-btn" id="bm-btn-export-json">导出 JSON</button>
                        </div>
                    </div>
                    <div class="bm-body">
                        <table class="bm-table">
                            <thead>
                                <tr>
                                    <th width="30"><input type="checkbox" id="bm-all"></th>
                                    <th data-sort="uname">用户 ↕</th>
                                    <th width="110" data-sort="follower">粉丝数 ↕</th>
                                    <th width="120" data-sort="mtime">关注时间 ↕</th>
                                    <th width="80" data-sort="vip">会员 ↕</th>
                                    <th width="70" data-sort="verify">认证 ↕</th>
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
            // 绑定按钮事件
            Q('bm-btn-toggle-filter').onclick = () => {
                const panel = Q('bm-filter-panel');
                panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
            };
            Q('bm-btn-toggle-io').onclick = () => {
                const panel = Q('bm-io-panel');
                panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
            };
            Q('bm-btn-sel-deactivated').onclick = () => {
                document.querySelectorAll('#bm-list tr').forEach(tr => {
                    const user = this.state.list.find(u => u.mid == tr.dataset.mid);
                    if (user && user.uname === '账号已注销') {
                        this.state.selectedMids.add(user.mid);
                    }
                });
                this.render();
            };
            Q('bm-btn-deselect-special').onclick = () => {
                document.querySelectorAll('#bm-list tr').forEach(tr => {
                    const user = this.state.list.find(u => u.mid == tr.dataset.mid);
                    if (user && user.tag?.includes(-10)) {
                         this.state.selectedMids.delete(user.mid);
                    }
                });
                this.render();
            };
            Q('bm-btn-fans').onclick = () => this.act('fans');
            Q('bm-btn-import').onclick = () => this.act('import');
            Q('bm-btn-import-json').onclick = () => this.act('import-json');
            Q('bm-btn-export').onclick = () => this.act('export');
            Q('bm-btn-export-json').onclick = () => this.act('export-json');
            Q('bm-btn-follow').onclick = () => this.act('follow');
            Q('bm-btn-unfollow').onclick = () => this.act('unfollow');
            Q('bm-btn-close').onclick = () => this.hide();
            Q('bm-all').onchange = (e) => this.toggleAll(e.target.checked);

            // 即时筛选监听
            ['bm-k', 'bm-f-val'].forEach(id => Q(id).oninput = () => this.render());
            ['bm-d-val', 'bm-sel-vip', 'bm-sel-verify'].forEach(id => Q(id).onchange = () => this.render());
            // 切换筛选模式
            Q('bm-f-tog').onclick = (e) => {
                this.state.filterMode.fans = e.target.textContent === '≥' ? '<' : '≥';
                e.target.textContent = this.state.filterMode.fans;
                if (Q('bm-f-val').value) this.render();
            };
            Q('bm-d-tog').onclick = (e) => {
                const isBefore = e.target.textContent === '早于';
                this.state.filterMode.date = isBefore ? '>' : '<='; 
                e.target.textContent = isBefore ? '晚于' : '早于';
                if (Q('bm-d-val').value) this.render();
            };
            // 绑定排序表头
            root.querySelectorAll('th[data-sort]').forEach(th => {
                th.onclick = (e) => this.sort(th.dataset.sort, e);
            });
            // 绑定列表点击
            root.querySelector('#bm-list').onclick = (e) => {
                const tr = e.target.closest('tr');
                if (!tr || e.target.tagName === 'A') return;
                const mid = parseInt(tr.dataset.mid, 10);
                const chk = tr.querySelector('.bm-chk');
                if (!chk) return;
                if (e.target.type !== 'checkbox') chk.checked = !chk.checked;
                if (chk.checked) this.state.selectedMids.add(mid);
                else this.state.selectedMids.delete(mid);
                this.updateSelectionUI();
            };
        }

        // 加载关注数据
        async loadData() {
            if (!this.uid) return alert('请先登录');
            this.state.list = [];
            const status = document.getElementById('bm-status');
            this.dataLoaded = false;
            try {
                let page = 1;
                while (this.uiRoot && this.uiRoot.style.display !== 'none') {
                    const res = await this.req(`https://api.bilibili.com/x/relation/followings?vmid=${this.uid}&pn=${page}&ps=50&order=desc&order_type=attention`).catch(()=>null);
                    const items = res?.data?.list || [];
                    if (!items.length) break;
                    this.state.list.push(...items);
                    status.textContent = `共 ${this.state.list.length} 人`;
                    if (this.isFilterEmpty() && !this.state.sortCriteria.length) this.appendRows(items);
                    if (items.length < 50) break;
                    page++;
                    await new Promise(r => setTimeout(r, 200));
                }
                if (!this.isFilterEmpty() || this.state.sortCriteria.length) this.render();
                else this.updateSelectionUI();
                this.dataLoaded = true;
            } catch (e) {
                console.error(e);
                status.textContent = '加载出错';
            }
        }
        
        // 检查筛选条件
        isFilterEmpty() {
            const Q = (id) => document.getElementById(id);
            if (!Q('bm-k')) return true;
            return !Q('bm-k').value && !Q('bm-f-val').value && !Q('bm-d-val').value && !Q('bm-sel-verify').value && !Q('bm-sel-vip').value;
        }

        // 渲染重绘表格
        render() {
            const tbody = document.getElementById('bm-list');
            if(!tbody) return;
            tbody.innerHTML = '';
            // 获取控件值
            const key = document.getElementById('bm-k').value.toLowerCase();
            const fansVal = parseInt(document.getElementById('bm-f-val').value);
            const dateStr = document.getElementById('bm-d-val').value;
            let dateTs = dateStr ? new Date(dateStr).getTime() / 1000 : 0;
            const verifyFilter = document.getElementById('bm-sel-verify').value;
            const vipFilter = document.getElementById('bm-sel-vip').value;
            // 筛选
            let view = this.state.list.filter(u => {
                // 关键词筛选
                if (key && !u.uname.toLowerCase().includes(key) && !String(u.mid).includes(key) && !(u.sign||'').toLowerCase().includes(key)) return false;
                // 粉丝数筛选
                if (!isNaN(fansVal)) {
                    if (this.state.filterMode.fans === '>=' && (u.follower || 0) < fansVal) return false;
                    if (this.state.filterMode.fans === '<' && (u.follower || 0) >= fansVal) return false;
                }
                // 关注日期筛选
                if (dateTs && u.mtime) {
                    if (this.state.filterMode.date === '<=' && u.mtime > dateTs) return false;
                    if (this.state.filterMode.date === '>' && u.mtime < dateTs) return false;
                }
                // 认证类型筛选
                if (verifyFilter !== "") {
                    const type = u.official_verify?.type ?? -1;
                    if (String(type) !== verifyFilter && !(verifyFilter === "1" && type > 1)) return false;
                }
                // 会员类型筛选
                if (vipFilter !== "") {
                    const vt = u.vip?.vipStatus === 1 ? (u.vip.vipType) : 0;
                    if (String(vt) !== vipFilter) return false;
                }
                return true;
            });
            // 复合排序
            if (this.state.sortCriteria.length > 0) {
                view.sort((a, b) => {
                    for (const { key, desc } of this.state.sortCriteria) {
                        const d = desc ? -1 : 1;
                        let vA, vB;
                        switch(key) {
                            case 'uname': return a.uname.localeCompare(b.uname, 'zh') * d;
                            case 'follower': vA = a.follower||0; vB = b.follower||0; break;
                            case 'mtime': vA = a.mtime||0; vB = b.mtime||0; break;
                            case 'verify': vA = a.official_verify?.type ?? -1; vB = b.official_verify?.type ?? -1; break;
                            case 'vip': vA = a.vip?.vipStatus === 1 ? a.vip.vipType : 0; vB = b.vip?.vipStatus === 1 ? b.vip.vipType : 0; break;
                            default: continue;
                        }
                        if (vA > vB) return d;
                        if (vA < vB) return -d;
                    }
                    return 0;
                });
            }
            // 渲染表格
            this.appendRows(view);
        }

        // 添加表格行
        appendRows(items) {
            const tbody = document.getElementById('bm-list');
            if (!tbody) return;
            const frag = document.createDocumentFragment();
            items.forEach(u => {
                const tr = document.createElement('tr');
                tr.dataset.mid = u.mid;
                const isChecked = this.state.selectedMids.has(u.mid);
                const isSpecial = u.tag?.includes(-10);
                if (isChecked) tr.classList.add('sel');
                if (u.isImport) tr.classList.add('new-import');
                tr.title = `UID: ${u.mid}`;
                
                const dateStr = u.mtime ? new Date(u.mtime * 1000).toISOString().split('T')[0] : 'N/A';
                const fans = u.follower === undefined ? '-' : u.follower.toLocaleString();
                const face = u.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg';
                let vipText = '无', vipClass = 'tag-none';
                if (u.vip?.vipStatus === 1) {
                    vipText = u.vip.vipType === 2 ? '年度' : '月度';
                    vipClass = 'tag-vip';
                }
                const offType = u.official_verify?.type;
                const offDesc = u.official_verify?.desc || '';
                let offHtml = `<span class="bm-tag tag-none" title="无">无</span>`;
                if (offType === 0) offHtml = `<span class="bm-tag tag-per" title="${offDesc}">个人</span>`;
                else if (offType >= 1) offHtml = `<span class="bm-tag tag-off" title="${offDesc}">官方</span>`;
                
                tr.innerHTML = `
                    <td><input type="checkbox" class="bm-chk" ${isChecked ? 'checked' : ''}></td>
                    <td>
                        <div class="bm-user-row">
                            <a href="//space.bilibili.com/${u.mid}" target="_blank"><img src="${face.replace('http:', '')}" class="bm-face" loading="lazy"></a>
                            <div class="bm-info">
                                <a href="//space.bilibili.com/${u.mid}" target="_blank" class="bm-name ${isSpecial ? 'special' : ''}" title="${u.uname}">${u.uname}</a>
                                <span class="bm-sign" title="${u.sign||''}">${u.sign || '...'}</span>
                            </div>
                        </div>
                    </td>
                    <td>${fans}</td>
                    <td style="color:var(--b-text-2)">${dateStr}</td>
                    <td><span class="bm-tag ${vipClass}">${vipText}</span></td>
                    <td>${offHtml}</td>`;
                frag.appendChild(tr);
            });
            tbody.appendChild(frag);
            this.updateSelectionUI();
        }

        // 排序
        sort(key, event) {
            const criteria = this.state.sortCriteria;
            const index = criteria.findIndex(c => c.key === key);
            // 复合排序
            if (event.shiftKey) {
                if (index > -1) {
                    criteria[index].desc = !criteria[index].desc;
                } else {
                    criteria.push({ key, desc: true });
                }
            } else {
                if (index > -1 && criteria.length === 1) {
                    criteria[0].desc = !criteria[0].desc;
                } else {
                    this.state.sortCriteria = [{ key, desc: true }];
                }
            }
            // 更新排序
            document.querySelectorAll('.bm-table th[data-sort]').forEach(th => {
                const sortKey = th.dataset.sort;
                const crit = this.state.sortCriteria.find(c => c.key === sortKey);
                th.classList.remove('sorting');
                th.innerHTML = th.innerHTML.replace(/ [↑↓](<span.*)?/, ' ↕');
                if (crit) {
                    const orderIndex = this.state.sortCriteria.indexOf(crit) + 1;
                    const arrow = crit.desc ? '↓' : '↑';
                    const orderBadge = this.state.sortCriteria.length > 1 ? `<span class="sort-order">${orderIndex}</span>` : '';
                    th.classList.add('sorting');
                    th.innerHTML = th.innerHTML.replace(' ↕', ` ${arrow}${orderBadge}`);
                }
            });
            this.render();
        }

        // 切换全选
        toggleAll(checked) {
            document.querySelectorAll('#bm-list .bm-chk').forEach(c => {
                const mid = parseInt(c.closest('tr').dataset.mid, 10);
                if (checked) {
                    this.state.selectedMids.add(mid);
                } else {
                    this.state.selectedMids.delete(mid);
                }
                c.checked = checked;
            });
            this.updateSelectionUI();
        }

        // 更新 UI
        updateSelectionUI() {
            if (!this.uiRoot) return;
            document.querySelectorAll('#bm-list tr').forEach(tr => {
                const mid = parseInt(tr.dataset.mid, 10);
                tr.classList.toggle('sel', this.state.selectedMids.has(mid));
            });

            const hasSelection = this.state.selectedMids.size > 0;
            const hasImport = !!document.querySelector('.new-import');
            const followBtn = document.getElementById('bm-btn-follow');

            document.getElementById('bm-btn-unfollow').disabled = !hasSelection;

            if (followBtn) {
                followBtn.style.display = hasImport ? 'inline-block' : 'none';
                followBtn.disabled = !hasSelection;
            }
            
            const el = document.getElementById('bm-status');
            const totNum = document.querySelectorAll('#bm-list tr').length;
            const selNum = this.state.selectedMids.size;

            if (selNum > 0) {
                 el.innerHTML = `已选 <b style="color:var(--b-blue)">${selNum}</b> / 共 ${totNum} 人`;
            } else {
                 el.textContent = `共 ${totNum} 人`;
            }
        }
        
        // 操作入口
        async act(type) {
            if (this.state.running) return;
            // 获取选中用户
            let targets = Array.from(this.state.selectedMids)
                .map(mid => this.state.list.find(u => u.mid === mid))
                .filter(u => u);

            // 导出 CSV
            if (type === 'export') {
                const list = targets.length ? targets : this.state.list;
                const csv = '\uFEFFUID,昵称,粉丝数,关注时间,会员,认证\n' + list.map(u => 
                    [u.mid, `"${u.uname}"`, u.follower||0, u.mtime?new Date(u.mtime*1000).toISOString().split('T')[0]:'-', 
                    u.vip?.vipStatus === 1 ? (u.vip.vipType === 2 ? '年度大会员' : '月度大会员') : '无', `"${u.official_verify?.desc || ''}"`]
                    .join(',')
                ).join('\n');
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
                a.download = `B站关注列表_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                URL.revokeObjectURL(a.href);
                return;
            }
            // 导出 JSON
            if (type === 'export-json') {
                const list = targets.length ? targets : this.state.list;
                const json = JSON.stringify(list, null, 2);
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([json], {type:'application/json'}));
                a.download = `B站关注列表_${new Date().toISOString().slice(0,10)}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
                return;
            }
            // 导入 CSV
            if (type === 'import') {
                const input = document.createElement('input'); input.type='file'; input.accept = ".csv,.txt";
                input.onchange = e => {
                    const reader = new FileReader();
                    reader.onload = evt => {
                        const mids = [...new Set(evt.target.result.match(/\d+/g))].filter(m => !this.state.list.some(u => u.mid == m));
                        if(!mids.length) return alert('未发现新增用户');
                        const newItems = mids.map(m => ({ mid: parseInt(m, 10), uname: '待关注', sign: `UID: ${m}`, mtime: 0, isImport: true }));
                        this.state.list.unshift(...newItems);
                        this.render();
                        setTimeout(() => {
                            newItems.forEach(item => this.state.selectedMids.add(item.mid));
                            this.render();
                        }, 100);
                        alert(`已导入 ${mids.length} 位用户，已自动选中以便关注。`);
                    };
                    reader.readAsText(e.target.files[0]);
                };
                input.click();
                return;
            }
            // 导入 JSON
            if (type === 'import-json') {
                const input = document.createElement('input'); input.type='file'; input.accept = ".json";
                input.onchange = e => {
                    const reader = new FileReader();
                    reader.onload = evt => {
                        try {
                            const importedData = JSON.parse(evt.target.result);
                            if (!Array.isArray(importedData)) {
                                return alert('JSON 文件格式错误');
                            }
                            const newItems = importedData.filter(item => 
                                item.mid && !this.state.list.some(u => u.mid == item.mid)
                            );
                            if (!newItems.length) return alert('未发现新增用户');

                            newItems.forEach(item => {
                                item.isImport = true;
                                item.uname = item.uname || '待关注';
                                item.sign = item.sign || `UID: ${item.mid}`;
                            });

                            this.state.list.unshift(...newItems);
                            this.render();
                            setTimeout(() => {
                                newItems.forEach(item => this.state.selectedMids.add(item.mid));
                                this.render();
                            }, 100);
                            alert(`已导入 ${newItems.length} 位用户，已自动选中以便关注。`);
                        } catch(err) {
                            console.error("JSON Parse Error:", err);
                            alert('导入失败');
                        }
                    };
                    reader.readAsText(e.target.files[0]);
                };
                input.click();
                return;
            }
            // 其他
            if (!targets.length) {
                 if (type === 'fans') {
                     const visibleMids = Array.from(document.querySelectorAll('#bm-list tr')).map(tr => tr.dataset.mid);
                     targets = this.state.list.filter(u => visibleMids.includes(String(u.mid)));
                     if(!targets.length || !confirm(`是否更新 ${targets.length} 人的粉丝数？`)) return;
                 } else {
                     return alert('请先勾选需要操作的用户');
                 }
            } else if (type !== 'fans') {
                if (!confirm(`确定要${type==='follow'?'批量关注':'批量取关'} ${targets.length} 位用户吗？`)) return;
            }
            // 执行任务
            await this.runTask(targets, type);
        }

        // 执行任务
        async runTask(items, type) {
            this.state.running = true;
            const status = document.getElementById('bm-status');
            const csrf = document.cookie.match(/bili_jct=([^;]+)/)?.[1];
            let ok = 0, fail = 0;
            for (let i = 0; i < items.length; i++) {
                if(!this.uiRoot || this.uiRoot.style.display === 'none') { this.state.running=false; return; }
                const u = items[i];
                const actMap = { 'follow': 1, 'unfollow': 2 };
                const actName = type === 'fans' ? '查询' : (actMap[type] === 1 ? '关注' : '取关');
                status.textContent = `[${i+1}/${items.length}] ${actName}: ${u.uname}`;
                try {
                    if (type === 'fans') {
                        const res = await this.req(`https://api.bilibili.com/x/relation/stat?vmid=${u.mid}`);
                        u.follower = res.data.follower;
                        const cell = document.querySelector(`tr[data-mid="${u.mid}"]`)?.cells[2];
                        if(cell) cell.textContent = u.follower.toLocaleString();
                        ok++;
                    } else {
                        const actCode = actMap[type];
                        await this.req('https://api.bilibili.com/x/relation/modify', 'POST', `fid=${u.mid}&act=${actCode}&re_src=11&csrf=${csrf}`);
                        if (type === 'unfollow') {
                            this.state.list = this.state.list.filter(x => x.mid != u.mid);
                            this.state.selectedMids.delete(u.mid);
                        } else if (type === 'follow') {
                            u.isImport = false;
                        }
                        ok++;
                    }
                } catch(e) { console.error(e); fail++; }
                
                await new Promise(r => setTimeout(r, 200));
            }
            this.state.running = false;
            status.textContent = `任务完成: 成功 ${ok}, 失败 ${fail}`;
            this.render();
        }
    }
    // 启动
    new App();
})();