// ==UserScript==
// @name         BiliBili 关注管理
// @namespace    https://github.com/YisRime/BilibiliFollowManage
// @version      6.1
// @description  高效管理关注与分组列表，可按粉丝数/投稿时间/动态时间排序，并支持筛选会员/认证/老粉/互关等状态，然后可进行批量取关/关注/转移分组等操作，也支持导入导出数据，方便备份和迁移。
// @author       苡淞
// @match        https://space.bilibili.com/*/relation/follow*
// @match        https://space.bilibili.com/*/fans/follow*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.bilibili.com
// @license      AGPLv3
// ==/UserScript==

(function () {
    "use strict";

    // MD5 & WBI
    const md5=function(){var n={};!function(n){"use strict";function d(n,t){var r=(65535&n)+(65535&t);return(n>>16)+(t>>16)+(r>>16)<<16|65535&r}function f(n,t,r,e,o,u){return d((u=d(d(t,n),d(e,u)))<<o|u>>>32-o,r)}function l(n,t,r,e,o,u,c){return f(t&r|~t&e,n,t,o,u,c)}function g(n,t,r,e,o,u,c){return f(t&e|r&~e,n,t,o,u,c)}function v(n,t,r,e,o,u,c){return f(t^r^e,n,t,o,u,c)}function m(n,t,r,e,o,u,c){return f(r^(t|~e),n,t,o,u,c)}function c(n,t){var r,e,o,u;n[t>>5]|=128<<t%32,n[14+(t+64>>>9<<4)]=t;for(var c=1732584193,f=-271733879,i=-1732584194,a=271733878,h=0;h<n.length;h+=16)c=l(r=c,e=f,o=i,u=a,n[h],7,-680876936),a=l(a,c,f,i,n[h+1],12,-389564586),i=l(i,a,c,f,n[h+2],17,606105819),f=l(f,i,a,c,n[h+3],22,-1044525330),c=l(c,f,i,a,n[h+4],7,-176418897),a=l(a,c,f,i,n[h+5],12,1200080426),i=l(i,a,c,f,n[h+6],17,-1473231341),f=l(f,i,a,c,n[h+7],22,-45705983),c=l(c,f,i,a,n[h+8],7,1770035416),a=l(a,c,f,i,n[h+9],12,-1958414417),i=l(i,a,c,f,n[h+10],17,-42063),f=l(f,i,a,c,n[h+11],22,-1990404162),c=l(c,f,i,a,n[h+12],7,1804603682),a=l(a,c,f,i,n[h+13],12,-40341101),i=l(i,a,c,f,n[h+14],17,-1502002290),c=g(c,f=l(f,i,a,c,n[h+15],22,1236535329),i,a,n[h+1],5,-165796510),a=g(a,c,f,i,n[h+6],9,-1069501632),i=g(i,a,c,f,n[h+11],14,643717713),f=g(f,i,a,c,n[h],20,-373897302),c=g(c,f,i,a,n[h+5],5,-701558691),a=g(a,c,f,i,n[h+10],9,38016083),i=g(i,a,c,f,n[h+15],14,-660478335),f=g(f,i,a,c,n[h+4],20,-405537848),c=g(c,f,i,a,n[h+9],5,568446438),a=g(a,c,f,i,n[h+14],9,-1019803690),i=g(i,a,c,f,n[h+3],14,-187363961),f=g(f,i,a,c,n[h+8],20,1163531501),c=g(c,f,i,a,n[h+13],5,-1444681467),a=g(a,c,f,i,n[h+2],9,-51403784),i=g(i,a,c,f,n[h+7],14,1735328473),c=v(c,f=g(f,i,a,c,n[h+12],20,-1926607734),i,a,n[h+5],4,-378558),a=v(a,c,f,i,n[h+8],11,-2022574463),i=v(i,a,c,f,n[h+11],16,1839030562),f=v(f,i,a,c,n[h+14],23,-35309556),c=v(c,f,i,a,n[h+1],4,-1530992060),a=v(a,c,f,i,n[h+4],11,1272893353),i=v(i,a,c,f,n[h+7],16,-155497632),f=v(f,i,a,c,n[h+10],23,-1094730640),c=v(c,f,i,a,n[h+13],4,681279174),a=v(a,c,f,i,n[h],11,-358537222),i=v(i,a,c,f,n[h+3],16,-722521979),f=v(f,i,a,c,n[h+6],23,76029189),c=v(c,f,i,a,n[h+9],4,-640364487),a=v(a,c,f,i,n[h+12],11,-421815835),i=v(i,a,c,f,n[h+15],16,530742520),c=m(c,f=v(f,i,a,c,n[h+2],23,-995338651),i,a,n[h],6,-198630844),a=m(a,c,f,i,n[h+7],10,1126891415),i=m(i,a,c,f,n[h+14],15,-1416354905),f=m(f,i,a,c,n[h+5],21,-57434055),c=m(c,f,i,a,n[h+12],6,1700485571),a=m(a,c,f,i,n[h+3],10,-1894986606),i=m(i,a,c,f,n[h+10],15,-1051523),f=m(f,i,a,c,n[h+1],21,-2054922799),c=m(c,f,i,a,n[h+8],6,1873313359),a=m(a,c,f,i,n[h+15],10,-30611744),i=m(i,a,c,f,n[h+6],15,-1560198380),f=m(f,i,a,c,n[h+13],21,1309151649),c=m(c,f,i,a,n[h+4],6,-145523070),a=m(a,c,f,i,n[h+11],10,-1120210379),i=m(i,a,c,f,n[h+2],15,718787259),f=m(f,i,a,c,n[h+9],21,-343485551),c=d(c,r),f=d(f,e),i=d(i,o),a=d(a,u);return[c,f,i,a]}function i(n){for(var t="",r=32*n.length,e=0;e<r;e+=8)t+=String.fromCharCode(n[e>>5]>>>e%32&255);return t}function a(n){var t=[];for(t[(n.length>>2)-1]=void 0,e=0;e<t.length;e+=1)t[e]=0;for(var r=8*n.length,e=0;e<r;e+=8)t[e>>5]|=(255&n.charCodeAt(e/8))<<e%32;return t}function e(n){for(var t,r="0123456789abcdef",e="",o=0;o<n.length;o+=1)t=n.charCodeAt(o),e+=r.charAt(t>>>4&15)+r.charAt(15&t);return e}function r(n){return unescape(encodeURIComponent(n))}function o(n){return i(c(a(n=r(n)),8*n.length))}function u(n,t){return function(n,t){var r,e=a(n),o=[],u=[];for(o[15]=u[15]=void 0,16<e.length&&(e=c(e,8*n.length)),r=0;r<16;r+=1)o[r]=909522486^e[r],u[r]=1549556828^e[r];return t=c(o.concat(a(t)),512+8*t.length),i(c(u.concat(t),640))}(r(n),r(t))}function t(n,t,r){return t?r?u(t,n):e(u(t,n)):r?o(n):e(o(n))}"function"==typeof define&&define.amd?define(function(){return t}):"object"==typeof module&&module.exports?module.exports=t:n.md5=t}(n);return n.md5;}();
    const MIXIN_KEY_ENC_TAB=[46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52];
    const getMixinKey=(orig)=>MIXIN_KEY_ENC_TAB.map(n=>orig[n]).join('').slice(0,32);
    const encWbi=(params,img_key,sub_key)=>{
        const mixin_key=getMixinKey(img_key+sub_key),curr_time=Math.round(Date.now()/1000),chr_filter=/[!'()*]/g;
        const newParams={...params,wts:curr_time};
        const query=Object.keys(newParams).sort().map(key=>`${encodeURIComponent(key)}=${encodeURIComponent(newParams[key].toString().replace(chr_filter,''))}`).join('&');
        return query+'&w_rid='+md5(query+mixin_key);
    };

    GM_addStyle(`
        :root{--b-blue:#00aeec;--b-blue-hover:#00a1d6;--b-pink:#fb7299;--b-red:#ff4d4f;--b-bg-body:#ffffff;--b-bg-gray:#f6f7f8;--b-bg-hover:#e3f5ff;--b-border:#e3e5e7;--b-radius:6px;}
        .bm-btn-entry{position:fixed;top:160px;right:20px;z-index:999;background:var(--b-blue);color:#fff;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,174,236,0.3);font-size:14px;transition:all .2s}
        .bm-btn-entry:hover{transform:translateY(-2px);background:var(--b-blue-hover)}
        .bm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(2px)}
        .bm-win{width:95vw;max-width:1400px;height:90vh;background:var(--b-bg-body);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08);font-family:-apple-system,sans-serif;color:#18191c}
        .bm-header{flex-shrink:0;background:var(--b-bg-body);border-bottom:1px solid var(--b-border);display:flex;flex-direction:column;padding:16px 20px;gap:12px;position:relative}
        .bm-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .bm-input,.bm-select{height:32px;box-sizing:border-box;border:1px solid var(--b-border);border-radius:var(--b-radius);padding:0 10px;font-size:13px;color:#18191c;outline:none;transition:border .2s;background:var(--b-bg-body)}
        .bm-input:focus,.bm-select:focus{border-color:var(--b-blue);z-index:2}
        .bm-select{min-width:70px;cursor:pointer}
        .bm-group{display:flex;align-items:center}
        .bm-group>*{border-radius:0;margin-left:-1px;position:relative}
        .bm-group>*:first-child{border-radius:var(--b-radius) 0 0 var(--b-radius);margin-left:0}
        .bm-group>*:last-child{border-radius:0 var(--b-radius) var(--b-radius) 0}
        .bm-group .bm-toggle{height:32px;padding:0 10px;background:var(--b-bg-gray);border:1px solid var(--b-border);font-size:12px;color:#61666d;cursor:pointer;display:flex;align-items:center;justify-content:center;user-select:none;white-space:nowrap;flex-shrink:0}
        .bm-group .bm-toggle:hover{background:#eee;color:#18191c;z-index:1}
        .bm-group .bm-btn-add{height:32px;width:32px;padding:0;border:1px solid var(--b-border);background:var(--b-bg-body);color:var(--b-blue);font-size:18px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;line-height:1;flex-shrink:0}
        .bm-group .bm-btn-add:hover{background:var(--b-bg-hover);border-color:var(--b-blue);z-index:1}
        .bm-btn{height:32px;padding:0 14px;border-radius:var(--b-radius);border:1px solid var(--b-border);background:var(--b-bg-body);color:#18191c;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all .2s;white-space:nowrap;font-weight:500}
        .bm-btn:hover:not(:disabled){border-color:var(--b-blue);color:var(--b-blue);background:var(--b-bg-hover)}
        .bm-btn:disabled{opacity:.6;cursor:not-allowed;background:var(--b-bg-gray);color:#9499a0}
        .bm-btn.primary{background:var(--b-blue);color:#fff;border-color:var(--b-blue)}
        .bm-btn.primary:hover:not(:disabled){background:var(--b-blue-hover);border-color:var(--b-blue-hover)}
        .bm-btn.danger{color:var(--b-red);border-color:#ffccc7;background:#fff1f0}
        .bm-btn.danger:hover:not(:disabled){border-color:var(--b-red);background:var(--b-red);color:#fff}
        .bm-btn.processing{border-color:var(--b-orange);color:var(--b-orange);background:#fff7e6}
        .bm-divider{width:1px;height:20px;background:var(--b-border);margin:0 4px}
        .bm-v-divider{width:1px;height:24px;background:var(--b-border);margin:0 4px}
        .bm-filter-area{display:flex;flex-wrap:wrap;gap:8px;flex:1;align-items:center}
        .bm-filter-tag{display:flex;align-items:center;gap:6px;background:#e6f7ff;border:1px solid #91d5ff;color:#096dd9;padding:0 8px;height:24px;border-radius:4px;font-size:12px;animation:fadeIn .2s ease-out}
        .bm-filter-tag .rm{cursor:pointer;font-weight:700;opacity:.6;font-size:14px}
        .bm-filter-tag:hover .rm{opacity:1;color:var(--b-red)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:translateY(0)}}
        .bm-status-text{color:#61666d;font-size:13px;white-space:nowrap;display:flex;align-items:center}
        .bm-status-num{font-weight:700;color:#18191c;margin:0 4px;font-size:14px}
        .bm-close{font-size:20px;color:#9499a0;cursor:pointer;transition:color .2s;position:absolute;top:16px;right:20px;z-index:100}
        .bm-close:hover{color:#18191c}
        .bm-body{flex:1;overflow-y:auto;scrollbar-width:thin;background:var(--b-bg-gray)}
        .bm-table{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed;background:var(--b-bg-body)}
        .bm-table th{position:sticky;top:0;background:#fafafa;z-index:10;padding:12px 10px;border-bottom:1px solid var(--b-border);color:#61666d;text-align:left;font-weight:600;white-space:nowrap;user-select:none;cursor:pointer}
        .bm-table th:hover{background:#f0f0f0;color:#18191c}
        .bm-table th.active{color:var(--b-blue);background:#e6f7ff}
        .bm-table td{padding:8px 10px;border-bottom:1px solid var(--b-bg-gray);height:54px;box-sizing:border-box;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#18191c}
        .bm-table tr:hover{background:#fafafa}
        .bm-table tr.sel{background:var(--b-bg-hover)!important}
        .bm-user-cell{display:flex;align-items:center;gap:10px}
        .bm-face{width:38px;height:38px;border-radius:50%;object-fit:cover;border:1px solid var(--b-border)}
        .bm-u-info{display:flex;flex-direction:column;justify-content:center;overflow:hidden}
        .bm-u-row1{display:flex;align-items:center;gap:6px}
        .bm-name{font-weight:500;color:#18191c;text-decoration:none;font-size:14px}
        .bm-name:hover{color:var(--b-blue)}
        .bm-sign{font-size:12px;color:#9499a0;margin-top:3px;overflow:hidden;text-overflow:ellipsis}
        .bm-tag{font-size:11px;padding:0 6px;height:18px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;border:1px solid;line-height:1;flex-shrink:0;font-weight:400;margin-left:2px}
        .t-vip{color:#d6249f;background:#fdf2f8;border-color:#fbcfe8}.t-org{color:#0066ff;background:#e6f0ff;border-color:#b3d1ff}.t-per{color:#ff6b00;background:#fff4e6;border-color:#ffd8a8}.t-group{color:#10b981;background:#ecfdf5;border-color:#a7f3d0}.t-special{color:#e63946;background:#ffe5e5;border-color:#ffadad}.t-mutual{color:#8b5cf6;background:#f5f3ff;border-color:#c4b5fd}.t-other{color:#b45309;background:#fffbeb;border-color:#fde68a}.t-none{color:#9ca3af;background:#f9fafb;border-color:#e5e7eb}
    `);

    class App {
        constructor() {
            this.state = {
                list: [], groups: {}, wbiKeys: null, running: false, fetching: false, stopFetch: false,
                sortKey: null, sortOrder: 0,
                inputState: { fans: '>=', date: '<=', dateType: 'mtime' },
                conditions: [], selectedMids: new Set()
            };
            this.uid = window.location.pathname.match(/space\/(\d+)/)?.[1] || document.cookie.match(/DedeUserID=(\d+)/)?.[1];
            const btn = document.createElement('button');
            btn.className = 'bm-btn-entry'; btn.textContent = '关注管理'; btn.onclick = () => this.show();
            document.body.appendChild(btn);
        }

        req(url, method = 'GET', data = null) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method, url, data,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': document.cookie },
                    onload: r => { try { const res = JSON.parse(r.responseText); (res.code === 0 || res.code === 22003) ? resolve(res) : reject(res); } catch(e) { reject({ message: 'JSON Error' }); } },
                    onerror: () => reject({ message: 'Net Error' })
                });
            });
        }

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

        initUI() {
            if (this.uiRoot) return;
            const el = document.createElement('div'); el.className = 'bm-overlay'; el.style.display = 'none'; this.uiRoot = el;
            el.innerHTML = `
                <div class="bm-win">
                    <div class="bm-header">
                        <div class="bm-close" id="bm-btn-close">✕</div>
                        <div class="bm-row">
                            <input id="bm-k" class="bm-input" placeholder="搜索..." style="width:240px">
                            <div class="bm-v-divider"></div>
                            <div class="bm-group">
                                <input type="number" id="bm-f-val" class="bm-input" placeholder="粉丝数" style="width:80px">
                                <div class="bm-toggle" id="bm-f-tog">≥</div>
                                <button class="bm-btn-add" id="bm-btn-add-fans" title="添加">+</button>
                            </div>
                            <div class="bm-group">
                                <div class="bm-toggle" id="bm-d-type" style="width:40px">关注</div>
                                <input type="date" id="bm-d-val" class="bm-input" style="width:115px">
                                <div class="bm-toggle" id="bm-d-tog">早于</div>
                                <button class="bm-btn-add" id="bm-btn-add-date" title="添加">+</button>
                            </div>
                            <select id="bm-sel-vip" class="bm-select"><option value="">会员</option><option value="hundred">百年</option><option value="ten">十年</option><option value="2">年度</option><option value="1">月度</option><option value="0">无</option></select>
                            <select id="bm-sel-verify" class="bm-select"><option value="">认证</option><option value="1">组织</option><option value="0">个人</option><option value="-1">无</option></select>
                            <select id="bm-sel-status" class="bm-select"><option value="">状态</option><option value="mutual">互相关注</option><option value="special">特别关注</option><option value="contract">原始粉丝</option><option value="deactivated">账号注销</option></select>
                            <select id="bm-sel-group" class="bm-select"><option value="">分组</option><option value="-10">特别关注</option><option value="0">默认分组</option></select>
                            <div class="bm-v-divider"></div>
                            <button class="bm-btn" id="bm-btn-fetch" title="获取粉丝、投稿、动态">获取信息</button>
                            <button class="bm-btn danger" id="bm-btn-unfollow" disabled>取关</button>
                            <button class="bm-btn primary" id="bm-btn-follow" disabled>关注</button>
                        </div>
                        <div class="bm-row">
                            <select id="bm-sel-target-group" class="bm-select"><option value="">目标分组</option></select>
                            <button class="bm-btn" id="bm-btn-group-add">添加</button>
                            <button class="bm-btn" id="bm-btn-group-copy">复制</button>
                            <button class="bm-btn" id="bm-btn-group-move">移动</button>
                            <div class="bm-v-divider"></div>
                            <select id="bm-io-fmt" class="bm-select" style="min-width:60px"><option value="json" selected>JSON</option><option value="csv">CSV</option></select>
                            <button class="bm-btn" id="bm-btn-import">导入</button>
                            <button class="bm-btn" id="bm-btn-export">导出</button>
                            <div class="bm-v-divider"></div>
                            <div class="bm-status-text" id="bm-status">加载中...</div>
                            <div class="bm-filter-area" id="bm-conditions" style="display:none;"></div>
                        </div>
                    </div>
                    <div class="bm-body">
                        <table class="bm-table">
                            <thead><tr><th width="40"><input type="checkbox" id="bm-all"></th><th data-sort="uname">用户 ↕</th><th width="100" data-sort="follower">粉丝数 ↕</th><th width="100" data-sort="last_dynamic">最新动态 ↕</th><th width="100" data-sort="last_video">最新投稿 ↕</th><th width="100" data-sort="mtime">关注时间 ↕</th><th width="60" data-sort="vip">会员 ↕</th><th width="60" data-sort="verify">认证 ↕</th></tr></thead>
                            <tbody id="bm-list"></tbody>
                        </table>
                    </div>
                </div>`;
            document.body.appendChild(el);
            this.bindEvents(el);
        }

        bindEvents(root) {
            const Q = (id) => root.querySelector('#' + id);
            Q('bm-btn-close').onclick = () => this.hide();
            Q('bm-all').onchange = (e) => this.toggleAll(e.target.checked);
            ['bm-btn-follow', 'bm-btn-unfollow', 'bm-btn-group-add', 'bm-btn-group-copy', 'bm-btn-group-move'].forEach(id => Q(id).onclick = () => this.act(id.replace('bm-btn-', '')));
            Q('bm-btn-fetch').onclick = () => this.act('fetch');
            Q('bm-btn-import').onclick = () => this.act('import');
            Q('bm-btn-export').onclick = () => this.act('export');
            Q('bm-k').oninput = () => this.render();
            Q('bm-f-tog').onclick = (e) => {
                if (e.target.textContent === '≥') {
                    e.target.textContent = '<';
                    this.state.inputState.fans = '<';
                } else {
                    e.target.textContent = '≥';
                    this.state.inputState.fans = '>=';
                }
            };
            Q('bm-d-tog').onclick = (e) => { 
                const isBefore = e.target.textContent === '早于'; 
                this.state.inputState.date = isBefore ? '>' : '<='; e.target.textContent = isBefore ? '晚于' : '早于'; 
            };
            Q('bm-d-type').onclick = (e) => {
                const types = { 'mtime': '关注', 'last_video_ts': '投稿', 'last_dynamic_ts': '动态' };
                const keys = Object.keys(types), currIdx = keys.indexOf(this.state.inputState.dateType), nextKey = keys[(currIdx + 1) % keys.length];
                this.state.inputState.dateType = nextKey; e.target.textContent = types[nextKey];
            };
            Q('bm-btn-add-fans').onclick = () => this.addCondition('fans');
            Q('bm-btn-add-date').onclick = () => this.addCondition('date');
            ['bm-sel-vip', 'bm-sel-verify', 'bm-sel-status', 'bm-sel-group'].forEach(id => Q(id).onchange = (e) => this.addCondition('prop_single', e.target));
            root.querySelectorAll('th[data-sort]').forEach(th => th.onclick = () => this.sort(th.dataset.sort));
            root.querySelector('#bm-list').onclick = (e) => {
                const tr = e.target.closest('tr'); if (!tr || e.target.tagName === 'A') return;
                const mid = parseInt(tr.dataset.mid, 10), chk = tr.querySelector('.bm-chk');
                if (e.target.type !== 'checkbox') chk.checked = !chk.checked;
                chk.checked ? this.state.selectedMids.add(mid) : this.state.selectedMids.delete(mid);
                this.updateSelectionUI();
            };
        }

        addCondition(type, ...args) {
            const Q = (id) => document.getElementById(id);
            if (type === 'fans') {
                const val = parseInt(Q('bm-f-val').value); if (isNaN(val)) return;
                const op = this.state.inputState.fans;
                this.state.conditions.push({ type: 'fans', op, val, label: `粉丝数 ${Q('bm-f-tog').textContent} ${val}` });
                Q('bm-f-val').value = '';
            } else if (type === 'date') {
                const valStr = Q('bm-d-val').value; if (!valStr) return;
                const ts = new Date(valStr).getTime() / 1000;
                const op = this.state.inputState.date, dType = this.state.inputState.dateType;
                const typeName = Q('bm-d-type').textContent, opName = Q('bm-d-tog').textContent;
                this.state.conditions.push({ type: 'date', sub: dType, op, val: ts, label: `${typeName} ${opName} ${valStr}` });
                Q('bm-d-val').value = '';
            } else if (type === 'prop_single') {
                const el = args[0]; if (!el.value) return;
                const txt = el.options[el.selectedIndex].text, nameMap = { 'bm-sel-vip': '会员', 'bm-sel-verify': '认证', 'bm-sel-status': '状态', 'bm-sel-group': '分组' };
                this.state.conditions.push({ type: 'prop', sub: el.id, val: el.value, label: `${nameMap[el.id]}: ${txt}` });
                el.value = "";
            }
            this.renderConditions(); this.render();
        }

        renderConditions() {
            const c = document.getElementById('bm-conditions'); c.innerHTML = '';
            if (!this.state.conditions.length) return c.style.display = 'none';
            c.style.display = 'flex';
            this.state.conditions.forEach((cond, idx) => {
                const tag = document.createElement('div'); tag.className = 'bm-filter-tag';
                tag.innerHTML = `<span>${cond.label}</span><span class="rm">✕</span>`;
                tag.querySelector('.rm').onclick = () => { this.state.conditions.splice(idx, 1); this.renderConditions(); this.render(); };
                c.appendChild(tag);
            });
        }

        show() { if (!this.uiRoot) this.initUI(); this.uiRoot.style.display = 'flex'; if (!this.dataLoaded) this.loadData(); }
        hide() { if (this.uiRoot) this.uiRoot.style.display = 'none'; }

        async loadGroups() {
            try {
                const res = await this.req('https://api.bilibili.com/x/relation/tags');
                if (res.data) {
                    this.state.groups = {};
                    const s1 = document.getElementById('bm-sel-group'), s2 = document.getElementById('bm-sel-target-group');
                    s2.innerHTML = '<option value="">目标分组</option>'; s1.innerHTML = '<option value="">分组</option><option value="-10">特别关注</option><option value="0">默认分组</option>';
                    res.data.forEach(g => {
                        this.state.groups[g.tagid] = g.name;
                        if (g.tagid !== 0 && g.tagid !== -10) { s1.add(new Option(g.name, g.tagid)); s2.add(new Option(g.name, g.tagid)); }
                    });
                    s2.add(new Option('特别关注', -10));
                }
            } catch (e) {}
        }

        async loadData() {
            if (!this.uid) return alert('请先登录');
            await this.loadGroups();
            this.state.list = [];
            const st = document.getElementById('bm-status');
            try {
                let page = 1;
                while (this.uiRoot.style.display !== 'none') {
                    const res = await this.req(`https://api.bilibili.com/x/relation/followings?vmid=${this.uid}&pn=${page}&ps=50&order=desc&order_type=attention`).catch(()=>null);
                    const items = res?.data?.list || [];
                    if (!items.length) break;
                    this.state.list.push(...items);
                    st.innerHTML = `读取中... <span class="bm-status-num">${this.state.list.length}</span> / ${res.data.total}`;
                    if (this.isFilterEmpty() && this.state.sortOrder === 0) this.appendRows(items);
                    if (items.length < 50) break;
                    page++; await new Promise(r => setTimeout(r, 200));
                }
                this.dataLoaded = true; this.render();
            } catch (e) { st.textContent = '加载关注失败'; }
        }

        isFilterEmpty() { return !document.getElementById('bm-k').value && !this.state.conditions.length; }

        render() {
            const tbody = document.getElementById('bm-list'); if(!tbody) return;
            tbody.innerHTML = '';
            const key = document.getElementById('bm-k').value.toLowerCase(), conds = this.state.conditions;
            let view = this.state.list.filter(u => {
                if (key && !u.uname.toLowerCase().includes(key) && !String(u.mid).includes(key) && !(u.sign||'').toLowerCase().includes(key) && !(u.official_verify?.desc||'').toLowerCase().includes(key)) return false;
                for (let c of conds) {
                    if (c.type === 'fans') {
                        const v = u.follower || 0;
                        if ((c.op === '>=' && v < c.val) || (c.op === '<' && v >= c.val)) return false;
                    } else if (c.type === 'date') {
                        let t = 0;
                        if (c.sub === 'mtime') t = u.mtime;
                        else if (c.sub === 'last_video_ts') t = u.last_video_ts || 0;
                        else if (c.sub === 'last_dynamic_ts') t = u.last_dynamic_ts || 0;
                        if ((c.op === '<=' && t > c.val) || (c.op === '>' && t < c.val)) return false;
                    } else if (c.type === 'prop') {
                        if (c.sub === 'bm-sel-verify') {
                            const t = u.official_verify?.type ?? -1;
                            if (c.val !== String(t) && !(c.val === "1" && t > 1)) return false;
                        } else if (c.sub === 'bm-sel-vip') {
                            const txt = u.vip?.label?.text || "", vt = u.vip?.vipStatus === 1 ? u.vip.vipType : 0;
                            if ((c.val === "hundred" && !txt.includes("百年")) || (c.val === "ten" && !txt.includes("十年")) || (c.val === "2" && vt !== 2) || (c.val === "1" && vt !== 1) || (c.val === "0" && vt !== 0)) return false;
                        } else if (c.sub === 'bm-sel-status') {
                            if ((c.val === "mutual" && u.attribute !== 6) || (c.val === "special" && !(u.tag?.includes(-10) || u.special === 1)) || (c.val === "contract" && !u.contract_info?.is_contract) || (c.val === "deactivated" && u.uname !== "账号已注销")) return false;
                        } else if (c.sub === 'bm-sel-group') {
                            const tags = u.tag || [];
                            if ((c.val === "0" && tags.length > 0 && !tags.includes(0)) || (c.val !== "0" && !tags.includes(parseInt(c.val)))) return false;
                        }
                    }
                }
                return true;
            });
            if (this.state.sortKey && this.state.sortOrder !== 0) {
                const k = this.state.sortKey, d = this.state.sortOrder;
                view.sort((a, b) => {
                    let vA, vB;
                    if (k === 'uname') return a.uname.localeCompare(b.uname, 'zh') * d;
                    if (k === 'follower') { vA = a.follower||0; vB = b.follower||0; }
                    else if (k === 'mtime') { vA = a.mtime||0; vB = b.mtime||0; }
                    else if (k === 'last_video') { vA = a.last_video_ts||0; vB = b.last_video_ts||0; }
                    else if (k === 'last_dynamic') { vA = a.last_dynamic_ts||0; vB = b.last_dynamic_ts||0; }
                    else if (k === 'verify') { vA = a.official_verify?.type ?? -1; vB = b.official_verify?.type ?? -1; }
                    else if (k === 'vip') {
                        const sc = u => u.vip?.label?.text?.includes("百年") ? 100 : (u.vip?.label?.text?.includes("十年") ? 50 : (u.vip?.vipStatus===1 ? (u.vip.vipType===2?10:5) : 0));
                        vA = sc(a); vB = sc(b);
                    }
                    return (vA - vB) * d;
                });
            }
            this.appendRows(view); this.updateSelectionUI(view.length);
        }

        appendRows(items) {
            const tbody = document.getElementById('bm-list'), frag = document.createDocumentFragment();
            if (!tbody) return;
            items.forEach(u => {
                const tr = document.createElement('tr'); tr.dataset.mid = u.mid;
                if (this.state.selectedMids.has(u.mid)) tr.classList.add('sel');
                const d = ts => ts ? new Date(ts * 1000).toISOString().split('T')[0] : '-';
                let vH = '<span class="bm-tag t-none">无</span>';
                if (u.vip?.vipStatus === 1) {
                    const t = u.vip.label?.text || "";
                    vH = `<span class="bm-tag t-vip">${t.includes("百年")?"百年":(t.includes("十年")?"十年":(u.vip.vipType===2?"年度":"月度"))}</span>`;
                }
                let oH = u.official_verify?.type===0 ? '<span class="bm-tag t-per">个人</span>' : (u.official_verify?.type>0 ? '<span class="bm-tag t-org">组织</span>' : '<span class="bm-tag t-none">无</span>');
                let tL = [];
                if (u.attribute === 6) tL.push('<span class="bm-tag t-mutual">互相关注</span>');
                if (u.contract_info?.is_contract) tL.push('<span class="bm-tag t-other">原始粉丝</span>');
                (u.tag||[]).forEach(t => t===-10 ? tL.push('<span class="bm-tag t-special">特别关注</span>') : (t!==0 && this.state.groups[t] && tL.push(`<span class="bm-tag t-group">${this.state.groups[t]}</span>`)));
                tr.innerHTML = `<td><input type="checkbox" class="bm-chk" ${this.state.selectedMids.has(u.mid)?'checked':''}></td>
                    <td><div class="bm-user-cell"><a href="//space.bilibili.com/${u.mid}" target="_blank"><img src="${(u.face||'').replace('http:','')}" class="bm-face" loading="lazy"></a><div class="bm-u-info"><div class="bm-u-row1"><a href="//space.bilibili.com/${u.mid}" target="_blank" class="bm-name" title="${u.uname}">${u.uname}</a>${tL.join('')}</div><span class="bm-sign" title="${u.sign||''}">${u.sign||'-'}</span></div></div></td>
                    <td>${u.follower===undefined?'-':u.follower.toLocaleString()}</td><td style="color:#61666d">${d(u.last_dynamic_ts)}</td><td style="color:#61666d">${d(u.last_video_ts)}</td><td style="color:#61666d">${d(u.mtime)}</td><td>${vH}</td><td>${oH}</td>`;
                frag.appendChild(tr);
            });
            tbody.appendChild(frag);
        }

        sort(k) {
            if (this.state.sortKey !== k) { this.state.sortKey = k; this.state.sortOrder = 1; }
            else { this.state.sortOrder = this.state.sortOrder === 1 ? -1 : (this.state.sortOrder === -1 ? 0 : 1); if(this.state.sortOrder===0) this.state.sortKey = null; }
            document.querySelectorAll('.bm-table th[data-sort]').forEach(th => {
                th.classList.remove('active'); let i = ' ↕';
                if (th.dataset.sort === this.state.sortKey && this.state.sortOrder !== 0) { th.classList.add('active'); i = this.state.sortOrder === 1 ? ' ↑' : ' ↓'; }
                th.innerHTML = th.textContent.split(' ')[0] + i;
            });
            this.render();
        }

        toggleAll(c) {
            document.querySelectorAll('#bm-list tr').forEach(tr => { const m = parseInt(tr.dataset.mid); c ? this.state.selectedMids.add(m) : this.state.selectedMids.delete(m); });
            this.updateSelectionUI();
        }

        updateSelectionUI(vc) {
            if (!this.uiRoot) return;
            const trs = document.querySelectorAll('#bm-list tr');
            let sc = 0; trs.forEach(tr => { const s = this.state.selectedMids.has(parseInt(tr.dataset.mid)); tr.classList.toggle('sel', s); tr.querySelector('.bm-chk').checked = s; if(s) sc++; });
            const all = document.getElementById('bm-all'); if(all) { all.checked = trs.length>0 && sc===trs.length; all.indeterminate = sc>0 && sc<trs.length; }
            const sn = this.state.selectedMids.size, at = this.state.list.length, hs = sn > 0;
            ['bm-btn-follow', 'bm-btn-unfollow', 'bm-btn-group-add', 'bm-btn-group-copy', 'bm-btn-group-move'].forEach(id => { const b = document.getElementById(id); if(b) b.disabled = !hs; });
            const cv = vc !== undefined ? vc : trs.length;
            document.getElementById('bm-status').innerHTML = `共 <span class="bm-status-num">${at}</span> 人${cv!==at?` | 筛选 <span class="bm-status-num">${cv}</span> 人`:''}${sn>0?` | 已选 <span class="bm-status-num" style="color:var(--b-blue)">${sn}</span> 人`:''}`;
        }

        async act(type) {
            if (type === 'fetch') return this.runBackgroundFetch();
            if (this.state.running) return;
            const fmt = document.getElementById('bm-io-fmt').value;
            if (type === 'export') {
                let t = Array.from(this.state.selectedMids).map(m => this.state.list.find(u => u.mid === m)).filter(u => u);
                if (!t.length) t = this.state.list;
                const blob = new Blob([fmt === 'json' ? JSON.stringify(t, null, 2) : '\uFEFFUID,昵称,粉丝,关注,投稿,动态,认证,会员,状态,分组,签名\n' + t.map(u => {
                    const d = ts => ts ? new Date(ts*1000).toISOString().split('T')[0] : '-', esc = s => `"${String(s||'').replace(/"/g, '""')}"`;
                    return [u.mid, esc(u.uname), u.follower||0, d(u.mtime), d(u.last_video_ts), d(u.last_dynamic_ts), esc(u.official_verify?.desc), esc(u.vip?.label?.text), esc([u.attribute===6?'互相关注':'',u.special===1?'特别关注':''].filter(x=>x).join(';')), esc((u.tag||[]).map(x=>this.state.groups[x]||(x==-10?'特别关注':x)).join(';')), esc(u.sign)].join(',');
                }).join('\n')], {type: fmt === 'json' ? 'application/json' : 'text/csv'});
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Bilibili_Follows_${new Date().toISOString().slice(0,10)}.${fmt}`; a.click(); return;
            }
            if (type === 'import') {
                const i = document.createElement('input'); i.type='file'; i.accept = fmt === 'json' ? ".json" : ".csv,.txt";
                i.onchange = e => {
                    const r = new FileReader();
                    r.onload = evt => {
                        let ni = [];
                        if (fmt === 'json') { try { ni = (JSON.parse(evt.target.result)||[]).filter(x => x.mid && !this.state.list.some(u => u.mid == x.mid)); ni.forEach(x=>{if(!x.uname)x.uname='导入';}); } catch(e){return alert('JSON Error');} }
                        else {
                            const l = evt.target.result.split(/\r?\n/).filter(x => x.trim()), p = s => { const r=[]; let c='', q=false; for(let i=0;i<s.length;i++){ if(s[i]==='"'){ if(q&&s[i+1]==='"'){c+='"';i++}else q=!q } else if(s[i]===','&&!q){r.push(c);c=''} else c+=s[i] } r.push(c); return r; };
                            ni = l.slice(1).map(x => { const c = p(x), m = parseInt(c[0]); if(!m||this.state.list.some(u=>u.mid===m))return null; return { mid: m, uname: c[1]||'导入', follower: parseInt(c[2])||0, mtime: Date.parse(c[3])/1000||0, last_video_ts: Date.parse(c[4])/1000||0, last_dynamic_ts: Date.parse(c[5])/1000||0, official_verify: {desc:c[6]||''}, vip: {label:{text:c[7]||''}}, attribute: c[8]?.includes('互相')?6:2, sign: c[10]||`UID:${m}`, tag: [] }; }).filter(x => x);
                        }
                        if(!ni.length) return alert('无新增');
                        this.state.list.unshift(...ni); this.render(); setTimeout(() => { ni.forEach(x => this.state.selectedMids.add(x.mid)); this.render(); }, 100); alert(`导入 ${ni.length}`);
                    }; r.readAsText(e.target.files[0]);
                }; i.click(); return;
            }
            let t = Array.from(this.state.selectedMids).map(m => this.state.list.find(u => u.mid === m)).filter(u => u);
            if (!t.length) return alert('请先选择');
            if (type.startsWith('group-')) {
                const gid = document.getElementById('bm-sel-target-group').value; if (!gid) return alert('请选目标分组');
                const gn = this.state.groups[gid] || (gid==-10?'特别关注':'未知');
                if (type === 'group-move') {
                    const sg = (this.state.conditions.find(c => c.type === 'prop' && c.sub === 'bm-sel-group')||{}).val || 0;
                    if (sg==0 && !confirm("是否从默认分组进行移动？")) return;
                    if (!confirm(`移动 ${t.length} 人到 ${gn}?`)) return; await this.runTaskGroup(t, 'move', gid, sg);
                } else {
                    if (!confirm(`${type.includes('copy')?'复制':'添加'} ${t.length} 人到 ${gn}?`)) return; await this.runTaskGroup(t, type.includes('copy')?'copy':'add', gid);
                }
                return;
            }
            if (type === 'follow' || type === 'unfollow') { if (!confirm(`确定${type==='follow'?'关注':'取关'} ${t.length} 人?`)) return; }
            this.state.running = true; await this.runTaskModify(t, type === 'follow' ? 1 : 2); this.state.running = false;
        }

        async runBackgroundFetch() {
            if (this.state.fetching) { this.state.stopFetch = true; return; }
            let t = Array.from(this.state.selectedMids).map(m => this.state.list.find(u => u.mid === m)).filter(u => u);
            if (!t.length) t = this.state.list.filter(u => document.querySelector(`tr[data-mid="${u.mid}"]`));
            if (!t.length) return alert('请先选择');
            this.state.fetching = true; this.state.stopFetch = false;
            const b = document.getElementById('bm-btn-fetch'); b.textContent = '停止'; b.classList.add('processing');
            await this.getWbiKeys();
            await Promise.all([this.runFetchQueue(t, 'fans', 250), this.runFetchQueue(t, 'video', 5000), this.runFetchQueue(t, 'dynamic', 5000)]);
            this.state.fetching = false; b.textContent = '获取信息'; b.classList.remove('processing');
        }

        async runFetchQueue(t, type, d) {
            for (let i = 0; i < t.length; i++) {
                if (this.state.stopFetch || this.uiRoot.style.display === 'none') break;
                const u = t[i];
                try {
                    if (!this.state.list.includes(u)) continue;
                    if (type === 'fans') {
                        const r = await this.req(`https://api.bilibili.com/x/relation/stat?vmid=${u.mid}`); u.follower = r.data.follower;
                        this.updateCell(u.mid, 2, u.follower.toLocaleString());
                    } else if (type === 'video') {
                        const q = encWbi({ mid: u.mid, ps: 1, pn: 1 }, this.state.wbiKeys.img_key, this.state.wbiKeys.sub_key);
                        const r = await this.req(`https://api.bilibili.com/x/space/wbi/arc/search?${q}`);
                        u.last_video_ts = r.data?.list?.vlist?.[0]?.created || 0;
                        this.updateCell(u.mid, 4, u.last_video_ts ? new Date(u.last_video_ts * 1000).toISOString().split('T')[0] : '-');
                    } else if (type === 'dynamic') {
                        const r = await this.req(`https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid=${u.mid}&offset=`);
                        let ts = 0; (r.data?.items||[]).slice(0,3).forEach(x => { const t=x?.modules?.module_author?.pub_ts||0; if(t>ts)ts=t; });
                        u.last_dynamic_ts = ts;
                        this.updateCell(u.mid, 3, u.last_dynamic_ts ? new Date(u.last_dynamic_ts * 1000).toISOString().split('T')[0] : '-');
                    }
                } catch (e) {} await new Promise(r => setTimeout(r, d));
            }
        }

        updateCell(mid, idx, txt) { const c = document.querySelector(`tr[data-mid="${mid}"]`)?.cells[idx]; if(c) c.textContent = txt; }

        async runTaskModify(items, act) {
            const st = document.getElementById('bm-status'), csrf = document.cookie.match(/bili_jct=([^;]+)/)?.[1];
            if (act === 2) {
                for (let i = 0; i < items.length; i++) {
                    if (this.uiRoot.style.display === 'none') break;
                    st.innerHTML = `取关 <span class="bm-status-num">${i+1}/${items.length}</span>`;
                    try { await this.req('https://api.bilibili.com/x/relation/modify', 'POST', `fid=${items[i].mid}&act=2&re_src=11&csrf=${csrf}`);
                        this.state.list = this.state.list.filter(x => x.mid != items[i].mid); this.state.selectedMids.delete(items[i].mid);
                    } catch(e){} await new Promise(r => setTimeout(r, 300));
                }
            } else {
                for (let i = 0; i < items.length; i += 50) {
                    if (this.uiRoot.style.display === 'none') break;
                    const chunk = items.slice(i, i + 50); st.innerHTML = `关注 <span class="bm-status-num">${Math.min(i+50,items.length)}/${items.length}</span>`;
                    try {
                        const res = await this.req('https://api.bilibili.com/x/relation/batch/modify', 'POST', `fids=${chunk.map(u=>u.mid).join(',')}&act=1&re_src=11&csrf=${csrf}`);
                        const fail = res.data?.failed_fids || [];
                        chunk.forEach(u => { if(!fail.includes(u.mid)) u.attribute=2; });
                        if(fail.length) for(let u of chunk.filter(x=>fail.includes(x.mid))) { try{await this.req('https://api.bilibili.com/x/relation/modify', 'POST', `fid=${u.mid}&act=1&re_src=11&csrf=${csrf}`);u.attribute=2;}catch(e){} await new Promise(r=>setTimeout(r,300)); }
                    } catch(e){} await new Promise(r => setTimeout(r, 1000));
                }
            }
            st.textContent = `完成`; this.render();
        }

        async runTaskGroup(items, mode, tGid, sGid) {
            const st = document.getElementById('bm-status'), csrf = document.cookie.match(/bili_jct=([^;]+)/)?.[1];
            const url = `https://api.bilibili.com/x/relation/tags/${mode==='move'?'moveUsers':(mode==='copy'?'copyUsers':'addUsers')}`;
            for (let i = 0; i < items.length; i += 50) {
                if (this.uiRoot.style.display === 'none') break;
                const chunk = items.slice(i, i + 50); st.innerHTML = `处理 <span class="bm-status-num">${Math.min(i+50,items.length)}/${items.length}</span>`;
                let d = `fids=${chunk.map(u=>u.mid).join(',')}&csrf=${csrf}`;
                if (mode === 'move') d += `&beforeTagids=${sGid}&afterTagids=${tGid}`; else d += `&tagids=${tGid}`;
                try {
                    await this.req(url, 'POST', d); const g = parseInt(tGid);
                    chunk.forEach(u => { if(!u.tag)u.tag=[]; if(mode==='move')u.tag=u.tag.filter(t=>t!=sGid); if(!u.tag.includes(g))u.tag.push(g); });
                } catch(e) {} await new Promise(r => setTimeout(r, 300));
            }
            st.textContent = `完成`; this.render();
        }
    }
    new App();
})();