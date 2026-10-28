// ==UserScript==
// @name         攻占OIS机器人
// @namespace    scvzrv/Conquer_OIS
// @version      4.0
// @description  攻占OIS机器人：作业页(stamper)点按钮自动开新窗口 + 工作列表(teamdtpList)后台自动刷新提醒
// ↓↓↓ 自动更新说明：篡改猴会定期访问 @updateURL 检查版本号，发现比本地 @version 大就自动下载安装（@downloadURL 是下载地址），同事无需任何操作。
// @updateURL    https://raw.githubusercontent.com/scvzrv/Conquer_OIS/refs/heads/main/%E6%94%BB%E5%8D%A0OIS%E6%9C%BA%E5%99%A8%E4%BA%BA.js
// @downloadURL  https://raw.githubusercontent.com/scvzrv/Conquer_OIS/refs/heads/main/%E6%94%BB%E5%8D%A0OIS%E6%9C%BA%E5%99%A8%E4%BA%BA.js
//
// ↓↓↓ 网址：三个功能模块各管一段，@match 是它们的**并集**（少写一个，那个页面就完全不跑脚本）
// @match        http://ois.aplushk.com/file/job/stamper/*
// @match        https://ois.aplushk.com/file/job/stamper/*
// @match        http://ois.aplushk.com/Portal/task/teamdtpList*
// @match        https://ois.aplushk.com/Portal/task/teamdtpList*
// @match        http://ois.aplushk.com/Portal/config/dtpStatus*
// @match        https://ois.aplushk.com/Portal/config/dtpStatus*
//
// ↓↓↓ @run-at：★ 不能改成 document-start —— 助手模块启动时要往 document.body 挂小窗，
//      那个时点 body 还不存在会直接报错、两个模块一起挂。document-end = 网页结构一就绪就跑（不等图片）。
// @run-at       document-end
//
// ↓↓↓ @noframes：不在网页里嵌套的小页面（iframe）里运行。实测 OIS 这两个页面都不涉及，
//      留着它可以彻底杜绝「iframe 里再冒出一个重复小窗」。
// @noframes
// @grant        none
// ==/UserScript==

(function () { 
    'use strict';

    if (location.pathname.indexOf('/file/job/stamper') !== 0) return;

    const CONFIG = {
        

        
        
        
        
        
        selector: '.JS_upload_btn', 

        
        
        text: 'Upload',

        
        
        
        textMode: 'exact',

        
        ignoreCase: true,

        

        
        
        delay: 0,

        
        
        watchInterval: 300,

        
        
        cooldown: 800,

        

        
        url: 'current',

        
        openAs: 'window',

        
        
        maximize: true,

        
        width: 'same',
        height: 'same',

        
        offsetX: 40,
        offsetY: 40,

        

        
        
        
        refreshOnOpenerClose: true,

        

        
        
        strictPopup: false,

        
        
        onlyIds: [],

        
        debug: false, 
    };
    

    
    if (CONFIG.onlyIds.length) {
        const m = location.pathname.match(/\/(\d+)\/?$/);
        const id = m ? Number(m[1]) : NaN;
        if (!CONFIG.onlyIds.includes(id)) return;
    }

    const CLICKABLE =
        'button, a, [role="button"], input[type="submit"], input[type="button"], input[type="reset"]';

    let lastFire = 0;

    function log() {
        if (CONFIG.debug) console.log('[BtnClone]', ...arguments);
    }

    function normalize(s) {
        return (s || '').replace(/\s+/g, ' ').trim();
    }

    function textOf(el) {
        if (!el) return '';
        return normalize(
            el.innerText ||
            el.textContent ||
            el.value ||
            el.getAttribute('aria-label') ||
            el.getAttribute('title') ||
            ''
        );
    }

    function textHit(raw) {
        const t = normalize(raw);
        if (!t) return false;
        if (t.length > 30) return false; 

        const a = CONFIG.ignoreCase ? t.toLowerCase() : t;
        const b = CONFIG.ignoreCase ? CONFIG.text.toLowerCase() : CONFIG.text;

        if (CONFIG.textMode === 'exact') {
            
            const strip = (s) => s.replace(/[^\p{L}\p{N}]+/gu, '');
            return a === b || (strip(a) !== '' && strip(a) === strip(b));
        }
        return a.includes(b);
    }

    
    function isTarget(target) {
        if (!(target instanceof Element)) return false;

        if (CONFIG.selector) {
            try {
                const hit = target.closest(CONFIG.selector);
                if (hit) {
                    log('命中元素（选择器）：', hit);
                    return true;
                }
            } catch (err) {
                log('选择器写法有误：', err.message);
            }
        }

        if (CONFIG.text) {
            
            const box = target.closest(CLICKABLE);
            if (box && textHit(textOf(box))) {
                log('命中元素：', box);
                return true;
            }
            
            if (!target.children.length && textHit(textOf(target))) {
                log('命中元素：', target);
                return true;
            }
        }

        return false;
    }

    
    function buildFeatures() {
        if (CONFIG.openAs !== 'window') return '';

        const scr = window.screen || {};

        if (CONFIG.maximize) {
            
            
            const sw = scr.availWidth || 1280;
            const sh = scr.availHeight || 800;
            const sl = typeof scr.availLeft === 'number' ? scr.availLeft : 0;
            const st = typeof scr.availTop === 'number' ? scr.availTop : 0;
            return (
                'popup=yes,resizable=yes,scrollbars=yes' +
                ',width=' + sw + ',height=' + sh + ',left=' + sl + ',top=' + st
            );
        }

        const cur = window;
        const w = CONFIG.width === 'same' ? (cur.outerWidth || 1200) : Number(CONFIG.width);
        const h = CONFIG.height === 'same' ? (cur.outerHeight || 900) : Number(CONFIG.height);
        const baseX = typeof cur.screenX === 'number' ? cur.screenX : 0;
        const baseY = typeof cur.screenY === 'number' ? cur.screenY : 0;
        const left = Math.max(0, baseX + Number(CONFIG.offsetX || 0));
        const top = Math.max(0, baseY + Number(CONFIG.offsetY || 0));

        return (
            'popup=yes,resizable=yes,scrollbars=yes' +
            ',width=' + w + ',height=' + h + ',left=' + left + ',top=' + top
        );
    }

    
    function applyMaximize(win) {
        if (!win || !CONFIG.maximize) return;
        try {
            const scr = window.screen || {};
            win.moveTo(scr.availLeft || 0, scr.availTop || 0);
            win.resizeTo(scr.availWidth || 1280, scr.availHeight || 800);
        } catch (err) {
            log('窗口位置微调跳过：', err.message);
        }
    }

    function openNewPage(dest) {
        const feat = buildFeatures();
        const win = feat ? window.open(dest, '_blank', feat) : window.open(dest, '_blank');

        applyMaximize(win);

        log('已打开新页面：', dest, feat ? '(独立窗口' + (CONFIG.maximize ? '·铺满屏幕' : '') + ')' : '(标签页)');
        return win;
    }

    

    
    
    const REFRESH_FLAG = '__wbRefreshed__';

    function alreadyRefreshed() {
        return (window.name || '').indexOf(REFRESH_FLAG) >= 0;
    }

    function markRefreshed() {
        if (!alreadyRefreshed()) {
            window.name = (window.name ? window.name + ' ' : '') + REFRESH_FLAG;
        }
    }

    function openerIsClosed() {
        try {
            return !window.opener || window.opener.closed === true;
        } catch (err) {
            
            return false;
        }
    }

    function watchOpenerAndRefresh() {
        if (!CONFIG.refreshOnOpenerClose) return;

        let hasOpener = false;
        try {
            hasOpener = !!window.opener;
        } catch (err) {
            hasOpener = false;
        }

        
        if (!hasOpener) {
            log('本窗口没有父窗口（不是被其它窗口打开的），不做"旧窗口关闭后刷新"的监听');
            return;
        }

        if (!openerIsClosed()) {
            
            log('已开始监听旧窗口，它关闭后本窗口会自动刷新一次');
            const timer = setInterval(function () {
                if (!openerIsClosed()) return;
                clearInterval(timer);
                log('旧窗口已关闭 → 刷新本窗口');
                markRefreshed();
                location.reload();
            }, Number(CONFIG.watchInterval) || 400);
            return;
        }

        
        if (alreadyRefreshed()) {
            log('旧窗口已关闭，且本窗口已刷新过，跳过');
            return;
        }
        log('旧窗口在本窗口加载前已关闭 → 补刷新一次');
        markRefreshed();
        location.reload();
    }

    

    
    
    document.addEventListener(
        'click',
        function (e) {
            if (!isTarget(e.target)) return;

            const now = Date.now();
            if (now - lastFire < CONFIG.cooldown) return;
            lastFire = now;

            
            
            const dest = CONFIG.url === 'current' ? location.href : CONFIG.url;

            log('命中按钮，' + CONFIG.delay + 'ms 后打开新窗口');

            if (CONFIG.strictPopup) {
                const feat = buildFeatures();
                const win = feat
                    ? window.open('about:blank', '_blank', feat)
                    : window.open('about:blank', '_blank');
                if (!win) {
                    log('新窗口被拦截，请在地址栏右侧允许本站弹出窗口');
                    return;
                }
                applyMaximize(win);
                setTimeout(function () {
                    try {
                        win.location.href = dest;
                    } catch (err) {
                        log('写入地址失败：', err.message);
                    }
                }, CONFIG.delay);
            } else {
                setTimeout(function () {
                    openNewPage(dest);
                }, CONFIG.delay);
            }
        },
        true
    );

    
    watchOpenerAndRefresh();

    log('脚本已就绪，触发按钮：' + (CONFIG.selector || CONFIG.text));
})();

(function () { 
    'use strict';

    

    if (location.pathname.indexOf('/Portal/task/teamdtpList') !== 0) return;

    

    const CONFIG = {
        

        
        
        
        
        refreshIntervalSec: 45,

        alert: {
        
        
        
        
        loopIntervalMs: 8000,
        },

        
        
        
        
        fetchTimeoutMs: 20000,

        

        sound: {
            
            
            
            
            
            preset: 'siren',

            
            volume: 0.5,

            
            
            
            
            
            
            
            
            
            
            times: 2,

            
            intervalMs: 320,

            
            wave: 'sine',       
            baseFreq: 1000       
        },

        

        
        
        
        
        
        
        

        
        
        
        
        
        
        
        
        
        
        
        listTableClass: 'fancyTable',

        
        
        
        
        excludeSelectors: [
            'nav', 'header', 'footer',
            '.navbar', '.nav', '.sidebar', '.menu', '.breadcrumb',
            '#nav', '#header', '#sidebar', '#menu',
        ],

        
        forceStrategy: 'auto',

        

        statusWords: ['01 Preparing', '02 Pending at DTP', '03 Assigned', '04 Processing'],

        
        debug: false,
    };

    

    const SOUND_PRESETS = [
        { value: 'siren', label: '扫频警笛', times: 2 },
        { value: 'chime', label: '清脆和弦', times: 4 },
        { value: 'beep', label: '短促嘀声', times: 8 },
        { value: 'ding', label: '叮一声', times: 3 }
    ];

    

    const KEY = 'oisw_';   

    
    
    const SCRIPT_VERSION = '4.0';

    
    
    
    
    
    
    
    
    const BASELINE_FMT = 1;
    
    
    function save(k, v) {
        try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (err) {  }
    }
    
    function load(k, def) {
        try {
            const v = localStorage.getItem(KEY + k);
            return v === null ? def : JSON.parse(v);
        } catch (err) { return def; }
    }
    
    
    
    
    
    
    
    
    function diffItems(baseline, current) {
        const empty = { changed: false, reason: '', foundSt: null };
        
        
        
        
        if (!baseline || !baseline.items) return empty;
        const map = Object.create(null);
        for (const it of baseline.items) map[it.head] = it.st;

        for (const cur of current.items) {
            const old = map[cur.head];
            if (old === undefined) {
                return { changed: true, reason: '出现了记录里没有的新工作', foundSt: cur.st };
            }
            if (cur.st !== null && old !== null && cur.st < old) {
                return {
                    changed: true,
                    reason: '已有工作的状态从 ' + fmtSt(old) + '退回 ' + fmtSt(cur.st),
                    foundSt: cur.st
                };
            }
        }
        return empty;
    }

    
    
    function fmtSt(n) {
        const w = CONFIG.statusWords[n != null ? n - 1 : -1];
        return w || String(n);
    }

    

const MIN_INTERVAL_SEC = 15;   
const MAX_INTERVAL_SEC = 59;   

function getIntervalSec() {
    const def = CONFIG.refreshIntervalSec;
    const raw = load('intervalSec', def);
    const v = Number(raw);
    if (!isFinite(v) || v === null || v === '') return def;
    const iv = Math.round(v);
    return (iv >= MIN_INTERVAL_SEC && iv <= MAX_INTERVAL_SEC) ? iv : def;
}

    
    
    
    function hasUsableBaseline(b) {
        return !!b && b.fmt === BASELINE_FMT;
    }
    
    function log() { if (CONFIG.debug) console.log('[看工作]', ...arguments); }
    
    function nowStr() {
        const d = new Date();
        const p = (n) => (n < 10 ? '0' : '') + n;
        return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }

    

    
    const ROW_SELECTORS = ['tr', '.x-grid-row', '.x-grid-item', '[role="row"]', '.list-row', '.row'];

    
    
    function pickRowSelector(node) {
        for (let i = 0; i < ROW_SELECTORS.length; i++) {
            if (node.querySelectorAll(ROW_SELECTORS[i]).length > 0) return ROW_SELECTORS[i];
        }
        return null;
    }

    
    function isPageShell(n) {
        if (!n || n.nodeType !== 1) return true;
        const t = (n.tagName || '').toLowerCase();
        return t === 'html' || t === 'body' || t === 'head';
    }

    
    function hasClass(el, cls) {
        if (!el || typeof el.className !== 'string' || !cls) return false;
        return (' ' + el.className + ' ').indexOf(' ' + cls + ' ') >= 0;
    }

    
    function inExcludedArea(el) {
        for (let i = 0; i < CONFIG.excludeSelectors.length; i++) {
            try {
                if (el.closest(CONFIG.excludeSelectors[i])) return true;
            } catch (err) {  }
        }
        return false;
    }

    
    
    
    
    
    
    
    
    function isEmptyNoticeRow(r) {
        const txt = (r.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (!txt) return true;
        return txt === 'no data available in table'
            || txt === 'no data available'
            || txt === 'no records found'
            || txt === 'no data';
    }

    function isHeaderRow(r) {
        if (r.querySelector('th')) return true;
        const p = r.parentElement;
        if (p && (p.tagName || '').toLowerCase() === 'thead') return true;
        if (hasClass(r, 'fht-thead') || hasClass(r, 'fht-fixed-header')) return true;
        if (/head|title|caption/i.test(typeof r.className === 'string' ? r.className : '')) return true;
        
        if (isEmptyNoticeRow(r)) return true;
        return false;
    }

    
    
    
    
    function findListRoot(root) {
        if (!root || !root.querySelectorAll) return null;
        const forced = CONFIG.forceStrategy;
        if (forced === 'off') return null;

        
        
        function byTableClass() {
            const key = CONFIG.listTableClass;
            if (!key) return null;
            const all = root.querySelectorAll('table');
            let best = null, bestRows = -1;
            for (let i = 0; i < all.length; i++) {
                const t = all[i];
                if (!hasClass(t, key)) continue;
                if (inExcludedArea(t)) continue;
                const rows = t.querySelectorAll('tr').length;
                if (rows > bestRows) { bestRows = rows; best = t; }
            }
            return best;
        }

        
        function byMostRows() {
            const all = root.querySelectorAll('table');
            let best = null, bestRows = 1;
            for (let i = 0; i < all.length; i++) {
                const t = all[i];
                if (inExcludedArea(t)) continue;
                if (hasClass(t, 'fht-thead')) continue; 
                const rows = t.querySelectorAll('tr').length;
                if (rows > bestRows) { bestRows = rows; best = t; }
            }
            return best;
        }

        const order = (!forced || forced === 'auto') ? ['table', 'rows'] : [forced];
        for (const how of order) {
            let node = null;
            if (how === 'table') node = byTableClass();
            else if (how === 'rows') node = byMostRows();
            if (node && !isPageShell(node)) return { node: node, how: how };
        }
        return null;
    }

    
    
    function pickRows(list) {
        const node = list.node;
        const rowSel = pickRowSelector(node) || 'tr';
        let rows = Array.prototype.slice.call(node.querySelectorAll(rowSel));

        
        const tbodies = node.querySelectorAll('tbody');
        if (tbodies.length === 1) {
            const inBody = Array.prototype.slice.call(tbodies[0].querySelectorAll(rowSel));
            if (inBody.length) rows = inBody;
        }

        return rows.filter(function (r) {
            return !isHeaderRow(r) && !inExcludedArea(r);
        });
    }

    
    
    
    
    
    
    
    function splitRow(row) {
        
        const cells = Array.prototype.slice.call(row.cells || [])
            .map(function (c) { return (c.innerText || c.textContent || '').replace(/\s+/g, ' ').trim(); });
        let text = cells.length ? cells.join(' | ') : (row.textContent || '').replace(/\s+/g, ' ').trim();

        let st = null, cutAt = -1;
        for (const w of CONFIG.statusWords) {
            const i = text.indexOf(w);
            if (i >= 0 && (cutAt < 0 || i < cutAt)) {
                cutAt = i;
                st = parseInt(String(w).trim(), 10);   
            }
        }
        
        const head = (cutAt < 0 ? text : text.slice(0, cutAt)).replace(/[\s|]+$/, '').trim();
        return { head: head, st: st };
    }

    
    function computeState(root) {
        const list = findListRoot(root);
        if (!list) return { total: 0, items: [], ok: false, how: null };
        const rows = pickRows(list);
        const items = [];
        for (let i = 0; i < rows.length; i++) items.push(splitRow(rows[i]));
        return { total: rows.length, items: items, ok: true, how: list.how };
    }

    

    

    
    function presetTimes(v) {
        for (const sp of SOUND_PRESETS) if (sp.value === v) return sp.times;
        return CONFIG.sound.times;
    }
    
    
    
    function validPreset(v) {
        for (const sp of SOUND_PRESETS) if (sp.value === v) return true;
        return false;
    }
    
    
    
    
    
    function applyPreset(v, remember) {
        const ok = validPreset(v) ? v : CONFIG.sound.preset;
        CONFIG.sound.preset = ok;
        CONFIG.sound.times = presetTimes(ok);
        if (remember && validPreset(v)) save('preset', ok);
        return ok;
    }
    
    function getPreset() {
        const v = load('preset', CONFIG.sound.preset);
        return validPreset(v) ? v : CONFIG.sound.preset;
    }

    let audioCtx = null;
    function ensureAudio() {
        try {
            if (!audioCtx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return null;
                audioCtx = new AC();
            }
            if (audioCtx.state === 'suspended') audioCtx.resume();
            return audioCtx;
        } catch (err) { return null; }
    }
    
    document.addEventListener('pointerdown', ensureAudio, { capture: true, passive: true });

    
    function noteSeq() {
        const p = CONFIG.sound;
        const seq = [];
        const t = Math.max(1, p.times);
        if (p.preset === 'beep') {
            for (let i = 0; i < t; i++) seq.push({ r: 1, d: 0.12 });
        } else if (p.preset === 'ding') {
            for (let i = 0; i < Math.min(t, 3); i++) seq.push({ r: 1.78, d: 0.55 });
        } else if (p.preset === 'siren') {
            const up = [0.65, 0.8, 1.0, 1.25, 1.5];
            for (let i = 0; i < t; i++) {
                for (const r of up) seq.push({ r: r, d: 0.09 });
                for (let j = up.length - 1; j >= 0; j--) seq.push({ r: up[j], d: 0.09 });
            }
        } else { 
            for (let i = 0; i < t; i++) {
                seq.push({ r: 1, d: 0.11 });
                seq.push({ r: 1.26, d: 0.11 });
                seq.push({ r: 1.5, d: 0.17 });
            }
        }
        return seq;
    }

    function playSound() {
        const ctx = ensureAudio();
        if (!ctx || ctx.state !== 'running') return false;
        const p = CONFIG.sound;
        const vol = Math.min(1, Math.max(0.01, Number(p.volume)));
        let t = ctx.currentTime + 0.05;
        for (const note of noteSeq()) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = p.wave || 'sine';
            osc.frequency.setValueAtTime(Math.round(p.baseFreq * note.r), t);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + note.d);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + note.d + 0.02);
            t += Math.max(note.d + 0.05, p.intervalMs / 1000);
        }
        return true;
    }

    
    
    
    
    
    
    
    
    
    
    

    

    function el(tag, style, text) {
        const e = document.createElement(tag);
        if (style) Object.assign(e.style, style);
        if (text != null) e.textContent = text;
        return e;
    }

    const panel = el('div', {
        position: 'fixed', left: '50%', top:'auto', bottom: '16px', transform: 'translateX(-50%)',
        zIndex: '2147483000', width: '236px', background: '#ededed', color: '#000000',
        border: '1px solid #c9d1d9', borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0,0,0,.2)',
        font: '13px/1.7 "Microsoft YaHei", sans-serif', userSelect: 'none'
    });

    const head = el('div', {
        background: '#1a73e8', color: '#fff', padding: '4px 10px',
        cursor: 'move', fontWeight: 'bold'
    });
    head.appendChild(document.createTextNode('OIS看工作助手'));
    head.appendChild(el('span', {
        marginLeft: '6px', fontWeight: 'normal', opacity: '0.75'
    }, 'v' + SCRIPT_VERSION));
    panel.appendChild(head);

    const body = el('div', { padding: '8px 10px' });
    panel.appendChild(body);

const baseRow = el('div');
        
        
        
        const hintRow = el('div', { color: '#c62828', display: 'none' });
        const cmpRow = el('div');                 
        const infoRow = el('div', { color: '#000000' }); 
        
        const intervalRow = el('div', { color: '#000000', display: 'flex', alignItems: 'center', gap: '4px' });
        const lastRow = el('div', { color: '#000000' }); 
        const toastRow = el('div', {
            color: '#2e7d32', background: '#e8f5e9', borderRadius: '3px',
            padding: '2px 6px', marginTop: '4px', display: 'none'
        });
        const warnRow = el('div', { color: '#c62828', marginTop: '4px', display: 'none' });
        const alertRow = el('div', {              
            color: '#c62828', background: '#ffebee', borderRadius: '3px',
            padding: '2px 6px', marginTop: '4px', display: 'none', fontWeight: 'bold'
        });
        const ctrlRow = el('div', { marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' });
        
        
        const soundRow = el('div', { marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', color: '#000000' });
        body.appendChild(baseRow);
        body.appendChild(hintRow);
        body.appendChild(cmpRow);
        body.appendChild(infoRow);
        body.appendChild(intervalRow);
    body.appendChild(lastRow);
    body.appendChild(toastRow);
body.appendChild(warnRow);
        body.appendChild(alertRow);
        body.appendChild(ctrlRow);

    
    const recBtn = el('button', {
        cursor: 'pointer', border: '1px solid #c9d1d9', borderRadius: '4px',
        background: '#f6f8fa', padding: '3px 8px', font: 'inherit'
    }, '记录当前工作状态');
    ctrlRow.appendChild(recBtn);

    
    const lbl = el('label', { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' });
    const soundCb = document.createElement('input');
    soundCb.type = 'checkbox';
    lbl.appendChild(soundCb);
    lbl.appendChild(document.createTextNode('开启看工作'));
    ctrlRow.appendChild(lbl);

    

    intervalRow.appendChild(document.createTextNode('后台刷新'));
    const intervalInput = document.createElement('input');
    intervalInput.type = 'text';
    intervalInput.value = String(getIntervalSec());   
    Object.assign(intervalInput.style, {
        width: '42px', font: 'inherit', textAlign: 'center',
        border: '1px solid #c9d1d9', borderRadius: '3px', padding: '1px 3px'
    });
    intervalRow.appendChild(intervalInput);
    intervalRow.appendChild(document.createTextNode('秒'));

    
    function commitInterval() {
        const before = getIntervalSec();
        const raw = intervalInput.value;
        const v = Number(raw);
        const iv = (raw === '' || !isFinite(v)) ? NaN : Math.round(v);
        if (isFinite(iv) && iv >= MIN_INTERVAL_SEC && iv <= MAX_INTERVAL_SEC) {
            
            
            save('intervalSec', iv);
            if (iv !== before) {
                toast('✓ 已改为 ' + iv + ' 秒刷新');
                
                lastRefreshAt = Date.now();
            }
        } else {
            showWarn('刷新间隔只能填 ' + MIN_INTERVAL_SEC + '~' + MAX_INTERVAL_SEC + ' 秒，已恢复为 ' + before + ' 秒');
        }
        intervalInput.value = String(getIntervalSec());   
        updatePanel();
    }
    intervalInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); commitInterval(); }
    });
    intervalInput.addEventListener('blur', commitInterval);

    

    soundRow.appendChild(document.createTextNode('提示音'));
    const presetSel = document.createElement('select');
    for (const sp of SOUND_PRESETS) {          
        const op = document.createElement('option');
        op.value = sp.value;
        op.textContent = sp.label;
        presetSel.appendChild(op);
    }
    Object.assign(presetSel.style, {
        flex: '1', minWidth: '0',              
        font: 'inherit', color: '#333',
        border: '1px solid #c9d1d9', borderRadius: '3px', padding: '1px 2px'
    });
    soundRow.appendChild(presetSel);
    body.appendChild(soundRow);                

    
    presetSel.value = applyPreset(getPreset(), false);

    presetSel.addEventListener('change', function () {
        presetSel.value = applyPreset(presetSel.value, true);   
        ensureAudio();                                          
        if (!playSound()) showWarn('声音被浏览器拦了，再点一下「提示音」试试');
    });

    
    let drag = null;
    head.addEventListener('mousedown', function (e) {
        const rect = panel.getBoundingClientRect();
        drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
        panel.style.transform = 'none'; 
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
        e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
        if (!drag) return;
        panel.style.left = Math.max(0, e.clientX - drag.dx) + 'px';
        panel.style.top = Math.max(0, e.clientY - drag.dy) + 'px';
    });
    document.addEventListener('mouseup', function () { drag = null; });

    let warnTimer = null;
    
    function showWarn(msg) {
        warnRow.textContent = '⚠ ' + msg;
        warnRow.style.display = 'block';
        clearTimeout(warnTimer);
        warnTimer = setTimeout(function () { warnRow.style.display = 'none'; }, 12000);
    }

    

    let currentState = null;
    let countdownSec = null;
    let lastRefreshStr = '—';
    let alertLoopTimer = null; 

    
    
    function updatePanel() {
        const st = currentState || { total: 0, items: [], ok: false };
        const base = load('baseline', null);
        
        const usable = hasUsableBaseline(base);
        
        const baseTotal = usable ? base.total : null;

        if (baseTotal === null) {
            
            
            baseRow.textContent = '上次记录：未记录';
            baseRow.style.color = '#000000';
            hintRow.textContent = '请点下方「记录当前工作状态」建立基准';
            hintRow.style.display = 'block';
            cmpRow.textContent = '现在：　　' + st.total + ' 条';
            cmpRow.style.color = '#000000';
        } else {
            const diff = baseTotal !== st.total || isAlerting();
            baseRow.textContent = '上次记录：' + baseTotal + ' 条';
            baseRow.style.color = '#000000';
            hintRow.style.display = 'none';
            cmpRow.textContent = '现在：　　' + st.total + ' 条' + (diff ? '　❗有变化' : '');
            cmpRow.style.color = diff ? '#c62828' : '#007106';
        }

        
        infoRow.textContent = countdownSec === null
            ? '已暂停（页面在前台，不刷新）'
            : '下次刷新：' + countdownSec + '秒';

        
        lastRow.textContent = '上次自动刷新：' + lastRefreshStr;

        
        
        
        
        
        
        
        if (isAlerting()) {
            alertRow.style.whiteSpace = 'pre-wrap';   
            if (alertReason === NO_BASELINE) {
                alertRow.textContent =
                    '⚠ 还没有基准，无法判断有没有新工作\n请点「记录当前工作状态」建立基准';
            } else {
                alertRow.textContent = '🔔 有新工作，正在提醒…'
                    + (alertReason ? '\n（' + alertReason + '）' : '');
            }
            alertRow.style.display = 'block';
        } else if (alertRow.style.display !== 'none') {
            alertRow.style.display = 'none';
        }
    }

    
    let toastTimer = null;
    function toast(msg) {
        toastRow.textContent = msg;
        toastRow.style.display = 'block';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastRow.style.display = 'none'; }, 3000);
    }

    

    const ALERT_KEY = 'alerting';

    
    
    var NO_BASELINE = '__NO_BASELINE__';

    
    function isAlerting() { return load(ALERT_KEY, false) === true; }

    
    
    
    
    function startAlerting() {
        const already = isAlerting();
        save(ALERT_KEY, true);
        if (already && alertLoopTimer) return;    
        beepOnce();                               
        clearInterval(alertLoopTimer);
        alertLoopTimer = setInterval(beepOnce, CONFIG.alert.loopIntervalMs);
        
        
        updatePanel();
    }

    
    function stopAlerting() {
        clearInterval(alertLoopTimer);
        alertLoopTimer = null;
        if (isAlerting()) save(ALERT_KEY, false);
        updatePanel();
    }

    
    function beepOnce() {
        const ok = playSound();
        if (!ok && !alertWarned) {
            alertWarned = true;
            showWarn('声音被浏览器拦了，点一下页面任意位置即可恢复');
        }
    }
    let alertWarned = false;

    
    
    
    
    function saveBaseline(st) {
        save('baseline', { fmt: BASELINE_FMT, total: st.total, items: st.items || [], at: Date.now() });
    }

    
    
    
    
    
    
    
    
    
    
    
    function maybeAlert(st) {
        if (!st || !st.ok) return;
        const base = load('baseline', null);

        
        
        
        
        
        
        
        
        
        
        
        if (!hasUsableBaseline(base)) {
            const soundOn = load('sound', true);
            if (soundOn && st.total > 0) {
                
                alertReason = NO_BASELINE;
                save('alertReason', NO_BASELINE);
                startAlerting();
            } else {
                if (isAlerting()) stopAlerting();
            }
            updatePanel();
            return;
        }

        const d = diffItems(base, st);

        if (!d.changed) {
            
            
            
            if (isAlerting()) stopAlerting();
            saveBaseline(st);
            updatePanel();
            return;
        }

        
        if (!load('sound', true)) {       
            return;
        }
        alertReason = d.reason;
        
        save('alertReason', d.reason);
        
        
        startAlerting();
    }
    
    var alertReason = load('alertReason', '');

    

    let lastActivity = Date.now();
    let lastPointerAt = 0;      
    let blurAt = 0;             

    
    
    
    
    const BG_KEY = 'oisw_atBackground';
    
    
    function saveBackgroundFlag(v) {
        try { sessionStorage.setItem(BG_KEY, v ? '1' : '0'); } catch (err) {  }
    }
    
    function readBackgroundFlag() {
        try { return sessionStorage.getItem(BG_KEY) === '1'; } catch (err) { return false; }
    }
    
    if (readBackgroundFlag()) {
        const unfocused = document.hasFocus && !document.hasFocus();
        if (unfocused || document.hidden) {
            
            
            
            blurAt = Date.now() - 2000;
            
            
            
            
            
            setTimeout(function () {
                if (!blurAt) return;
                const back = (document.hasFocus && document.hasFocus()) && !document.hidden;
                if (back) {
                    blurAt = 0;
                    saveBackgroundFlag(false);
                }
            }, 600);
        }
    }

    
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) {
        document.addEventListener(t, function () {
            lastActivity = Date.now();
            lastPointerAt = Date.now();
        }, { passive: true, capture: true });
    });

    
    
    
    
    
    
    
    
    
    
    function pageActive() {
        const focused = document.hasFocus && document.hasFocus();
        if (focused) {
            blurAt = 0;                 
            return true;
        }
        
        
        if (!blurAt) blurAt = Date.now() - 1000;
        return Date.now() - blurAt < 1000;   
    }

    
    
    
    
    
    
    
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            blurAt = 0;
            saveBackgroundFlag(true);
            
            lastRefreshAt = Date.now();
        } else {
            
            blurAt = 0;
            saveBackgroundFlag(false);
            lastRefreshAt = Date.now();
            lastActivity = Date.now();
        }
    });

    
    
    
    
    window.addEventListener('blur', function () {
        
        
        if (blurAt && Date.now() - blurAt < 2000) return;
        blurAt = Date.now();
        saveBackgroundFlag(true);
        
        lastRefreshAt = Date.now();
    });

    
    window.addEventListener('focus', function () {
        blurAt = 0;
        saveBackgroundFlag(false);
        lastRefreshAt = Date.now();
        
        if (isAlerting()) stopAlerting();
    });

    

    
    
    let lastRefreshAt = Date.now();
    let refreshing = false;
    let refreshWatchdog = null;   

    
    
    
    
    
    (function restoreRefreshState() {
        let at = 0, str = null;
        try {
            at = Number(localStorage.getItem(KEY + 'nextRefreshAt'));
            str = localStorage.getItem(KEY + 'lastRefreshStr');
        } catch (err) {
            
            log('localStorage 不可用，倒计时不能跨重载延续：' + err.message);
        }
        if (at && at > Date.now()) {
            
            lastRefreshAt = at - getIntervalSec() * 1000;
        } else if (at) {
            
            
            lastRefreshAt = Date.now();
        }
        if (str) lastRefreshStr = str;
    })();

    
    function applyNewState(st) {
        currentState = st;
        updatePanel();
        maybeAlert(st);
    }

    
    
    
    
    
    async function doRefresh(manual, byUser) {
        if (refreshing) return;

        
        
        
        
        
        
        
        
        
        let prevReal = 0;
        try { prevReal = Number(localStorage.getItem(KEY + 'lastRealAt')) || 0; } catch (err) { prevReal = 0; }
        const elapsed = Date.now() - prevReal;
        if (!byUser && prevReal && elapsed < getIntervalSec() * 1000) {
            log('距上次刷新仅 ' + Math.round(elapsed / 1000) + ' 秒，本次跳过（防死循环保险）');
            return;
        }

        refreshing = true;

        
        
        
        
        clearTimeout(refreshWatchdog);
        refreshWatchdog = setTimeout(function () {
            if (!refreshing) return;                
            refreshing = false;
            lastRefreshStr = '失败：刷新流程卡住（已自动解锁）';
            lastRefreshAt = Date.now();
            showWarn('刷新流程异常卡住，已自动解锁，下一轮会重试');
            log('watchdog 触发：refreshing 卡住超过 2 分钟，强制解锁');
            updatePanel();
        }, 120000);

        
        try {
            
            
            
            
            
            const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
            let timedOut = false;
            let timer = null;
            if (ctrl) {
                timer = setTimeout(function () {
                    timedOut = true;
                    try { ctrl.abort(); } catch (err) {  }
                }, CONFIG.fetchTimeoutMs);
            }
            let res;
            try {
                res = await fetch(location.href, {
                    credentials: 'same-origin',
                    signal: ctrl ? ctrl.signal : undefined
                });
            } finally {
                if (timer) clearTimeout(timer);
            }
            if (timedOut) throw new Error('连接超时（' + Math.round(CONFIG.fetchTimeoutMs / 1000) + ' 秒没回应）');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
            if (!findListRoot(doc)) {
                showWarn('没取到工作列表（可能登录过期），本次不刷新');
                lastRefreshStr = '失败：取不到列表';
                lastRefreshAt = Date.now();
                refreshing = false;          
                updatePanel();
                return;
            }
        } catch (err) {
            
            showWarn('暂时连不上服务器，本次不刷新：' + err.message);
            lastRefreshStr = '失败：' + err.message;
            lastRefreshAt = Date.now();
            refreshing = false;              
            updatePanel();
            return;
        }

        
        const nextAt = Date.now() + getIntervalSec() * 1000;
        try {
            localStorage.setItem(KEY + 'nextRefreshAt', String(nextAt));
            localStorage.setItem(KEY + 'lastRefreshStr', nowStr());
            localStorage.setItem(KEY + 'lastRealAt', String(Date.now()));  
        } catch (err) {  }
        location.reload();
    }

    

    setInterval(function () {
        
        
        if (Date.now() < Number(sessionStorage.getItem('oisw_freezeUntil') || 0)) return;

        
        const active = pageActive();
        if (!refreshing) {
            const remain = Math.ceil(getIntervalSec() - (Date.now() - lastRefreshAt) / 1000);
            if (remain <= 0) {
                if (active) {
                    countdownSec = null;
                } else {
                    doRefresh(false);
                }
            } else {
                countdownSec = active ? null : remain;
            }
        }
        updatePanel();
    }, 1000);

    

    recBtn.addEventListener('click', function () {
        const st = currentState || { total: 0, items: [], ok: false };
        
        saveBaseline(st);
        alertReason = '';
        save('alertReason', '');
        
        if (isAlerting()) stopAlerting();
        if (!st.ok) {
            showWarn('当前没识别到工作列表，基准按 0 条记录');
            toast('已记录：0 条（未识别到列表）');
        } else {
            toast('✓ 已记录：' + st.total + ' 条');
        }
        updatePanel();
    });

    soundCb.checked = load('sound', true);
    soundCb.addEventListener('change', function () {
        save('sound', soundCb.checked);
        ensureAudio(); 
        if (!soundCb.checked) {
            
            if (isAlerting()) stopAlerting();
            return;
        }
        if (!playSound()) {
            showWarn('声音被浏览器拦了，再点一下复选框试试');
        } else if (currentState) {
            
            maybeAlert(currentState);
        }
    });

    

    document.body.appendChild(panel);
    applyNewState(computeState(document));

    

    window.__oisDiag = function () {
        const st = computeState(document);
        const lines = [];
        lines.push('=== 脚本识别结果 ===');
        lines.push('total=' + st.total + ' ok=' + st.ok + ' how=' + st.how);
        lines.push('forceStrategy=' + CONFIG.forceStrategy + ' listTableClass=' + CONFIG.listTableClass);
        lines.push('页面hidden=' + document.hidden);

        
        lines.push('');
        lines.push('=== 每条工作的「表头 + 状态」（判定就靠这两个） ===');
        if (!st.items.length) lines.push('  （没有工作。total=0 是正常的）');
        for (let i = 0; i < st.items.length; i++) {
            lines.push('  [' + (i + 1) + '] 状态=' +
                (st.items[i].st === null ? '未找到' : st.items[i].st + ' / ' + fmtSt(st.items[i].st)));
            lines.push('      表头=' + st.items[i].head);
        }
        const b = load('baseline', null);
        lines.push('');
        lines.push('=== 当前基准 ===');
        if (!hasUsableBaseline(b)) lines.push('  （还没有可用基准 → 请点「记录当前工作状态」建立）');
        else {
            lines.push('  total=' + b.total + '  报警中=' + isAlerting());
            for (let i = 0; i < (b.items || []).length; i++) {
                lines.push('  [' + (i + 1) + '] 状态=' +
                    (b.items[i].st === null ? '未找到' : b.items[i].st + ' / ' + fmtSt(b.items[i].st)) +
                    '　表头=' + b.items[i].head);
            }
            const dd = diffItems(b, st);
            lines.push('  → 判定：' + (dd.changed ? '有新工作（' + dd.reason + '）' : '没新工作'));
        }

        lines.push('');
        lines.push('=== 所有表格（只列出 tr 最多的 8 张） ===');
        const tables = Array.prototype.slice.call(document.querySelectorAll('table'));
        lines.push('table 数量 = ' + tables.length);
        tables.sort(function (a, b) {
            return b.querySelectorAll('tr').length - a.querySelectorAll('tr').length;
        });
        for (let i = 0; i < Math.min(8, tables.length); i++) {
            const t = tables[i];
            lines.push('  #' + i + ' tr=' + t.querySelectorAll('tr').length +
                ' class=' + (t.className || '-') +
                ' 命中列表类=' + hasClass(t, CONFIG.listTableClass) +
                ' 在导航区=' + inExcludedArea(t));
        }

        lines.push('');
        lines.push('=== 导航栏里的链接（这些不算工作） ===');
        const navLinks = document.querySelectorAll(CONFIG.excludeSelectors.join(',') + ' a[href]');
        for (let i = 0; i < Math.min(12, navLinks.length); i++) {
            lines.push('  ' + (navLinks[i].textContent || '').trim().slice(0, 24) +
                '  →  ' + (navLinks[i].getAttribute('href') || '').slice(0, 80));
        }

        lines.push('');
        lines.push('=== 可能的行写法命中数 ===');
        for (const sel of ROW_SELECTORS) {
            lines.push('  ' + sel + ' = ' + document.querySelectorAll(sel).length);
        }

        
        
        const list = findListRoot(document);
        if (list) {
            const rows = pickRows(list);
            lines.push('');
            lines.push('=== 容器与前 3 行的 HTML（容器 tag=' +
                (list.node.tagName || '?') + ' id=' + (list.node.id || '-') + '） ===');
            lines.push('--- 容器 ---');
            lines.push(list.node.outerHTML.slice(0, 3000));
            for (let i = 0; i < Math.min(3, rows.length); i++) {
                lines.push('--- 第 ' + (i + 1) + ' 行 ---');
                lines.push(rows[i].outerHTML.slice(0, 1500));
            }
        } else {
            lines.push('');
            lines.push('=== 容器 ===');
            lines.push('!! 根本没找到列表容器（forceStrategy 可手动指定 table / rows / off）');
        }
        return lines.join('\n');
    };
})();

(function () { 
    'use strict';

    
    if (location.pathname.indexOf('/Portal/config/dtpStatus') !== 0) return;

    
    const my配置 = {
        班次1时间: '09:00',     
        班次2时间: '',          
        休息分钟: 59,           
        检查周期毫秒: 10000,     
        命中窗口毫秒: 90000,     
        等弹窗毫秒: 6000,       
        等刷新毫秒: 4000,       
    };

    const my状态名 = { 1: 'Online', 2: 'Meal break', 3: 'Offline' };

    
    const my存储键 = {
        班次1: 'dtpk_morning',
        班次2: 'dtpk_afternoon',
        休息分钟: 'dtpk_breakMin',
        已完成: 'dtpk_done'      
    };
    const my会话键 = {
        待核对: 'dtpk_pending'   
    };

    let my忙碌中 = false;        

    
    function my取元素(my选择器, my根) { return (my根 || document).querySelector(my选择器); }
    function my取元素们(my选择器, my根) { return Array.prototype.slice.call((my根 || document).querySelectorAll(my选择器)); }
    function my记日志() {
        try { console.log.apply(console, ['[自动打卡]'].concat(Array.prototype.slice.call(arguments))); } catch (my错) { }
    }
    function my补零(my数) { return (my数 < 10 ? '0' : '') + my数; }
    function my取今天(my日期) {
        my日期 = my日期 || new Date();
        return my日期.getFullYear() + '-' + my补零(my日期.getMonth() + 1) + '-' + my补零(my日期.getDate());
    }
    function my取时分(my日期) {
        my日期 = my日期 || new Date();
        return my补零(my日期.getHours()) + ':' + my补零(my日期.getMinutes());
    }
    
    function my解析时分(my文本) {
        const my匹配 = /^(\d{1,2}):(\d{2})$/.exec(String(my文本 || '').trim());
        if (!my匹配) return -1;
        const my时 = parseInt(my匹配[1], 10), my分 = parseInt(my匹配[2], 10);
        if (my时 > 23 || my分 > 59) return -1;
        return my时 * 60 + my分;
    }

    
    function my读存储(my键, my默认值) {
        try { const my值 = localStorage.getItem(my键); return my值 === null ? my默认值 : my值; } catch (my错) { return my默认值; }
    }
    function my写存储(my键, my值) {
        try { localStorage.setItem(my键, my值); } catch (my错) { my记日志('写 localStorage 失败', my键, my错); }
    }

    function my取班次1时间() { return my读存储(my存储键.班次1, my配置.班次1时间); }
    function my取班次2时间() { return my读存储(my存储键.班次2, my配置.班次2时间); }
    function my取休息分钟() {
        const my数 = parseInt(my读存储(my存储键.休息分钟, String(my配置.休息分钟)), 10);
        return (isNaN(my数) || my数 < 1 || my数 > 180) ? my配置.休息分钟 : my数;
    }

    
    function my今天打过(my哪天, my哪个点) {
        let my原文;
        try { my原文 = JSON.parse(my读存储(my存储键.已完成, '{}')); } catch (my错) { my原文 = {}; }
        return !!my原文[my哪天 + '|' + my哪个点];
    }
    function my记今天打过(my哪天, my哪个点) {
        let my原文;
        try { my原文 = JSON.parse(my读存储(my存储键.已完成, '{}')); } catch (my错) { my原文 = {}; }
        
        const my新的 = {};
        for (const my键 in my原文) { if (my键.indexOf(my哪天 + '|') === 0) my新的[my键] = my原文[my键]; }
        my新的[my哪天 + '|' + my哪个点] = Date.now();
        my写存储(my存储键.已完成, JSON.stringify(my新的));
    }

    
    function my找我的行() {
        const my链接 = my取元素('#login-user a');
        const my工号 = my链接 ? String(my链接.getAttribute('title') || '').trim() : '';
        if (!my工号) return { 可以: false, 原因: '读不到右上角的登录信息' };

        const my行 = document.querySelector('tr[attr-userid="' + my工号 + '"]');
        if (!my行) return { 可以: false, 原因: '表格里找不到 userid=' + my工号 + ' 这一行' };

        const my格们 = my行.children;
        const my姓名 = (my格们[1] && my格们[1].textContent) ? my格们[1].textContent.trim() : ('userid ' + my工号);
        const my原文 = parseInt(my行.getAttribute('attr-dtp_status'), 10);
        return { 可以: true, 工号: my工号, 行: my行, 姓名: my姓名, 状态: isNaN(my原文) ? 0 : my原文 };
    }

    
    function my当前状态码() {
        const my我 = my找我的行();
        return my我.可以 ? my我.状态 : -1;
    }

    
    function my等待(my条件, my超时, my回调) {
        const my起始时刻 = Date.now();
        (function my轮询() {
            let my可以 = false;
            try { my可以 = !!my条件(); } catch (my错) { my可以 = false; }
            if (my可以) { my回调(true); return; }
            if (Date.now() - my起始时刻 > my超时) { my回调(false); return; }
            setTimeout(my轮询, 120);
        })();
    }

    function my弹窗已开() {
        const my弹窗 = my取元素('#dtpStatusModal');
        if (!my弹窗) return false;
        if (my弹窗.classList.contains('in')) return true;
        const my显示 = my弹窗.style.display;
        return !!my显示 && my显示 !== 'none';
    }

    
    let my面板 = null;

    function my造元素(my标签, my样式, my文字) {
        const my节点 = document.createElement(my标签);
        if (my样式) { for (const my样式名 in my样式) my节点.style[my样式名] = my样式[my样式名]; }
        if (my文字 != null) my节点.textContent = my文字;
        return my节点;
    }

    function my造按钮(my按钮字, my底色, my点击时) {
        const my按钮 = my造元素('button', {
            padding: '6px 15px', marginRight: '9px', cursor: 'pointer',
            border: '1px solid ' + my底色, borderRadius: '6px',
            background: my底色, color: '#fff', font: '18px/1 "Microsoft YaHei", sans-serif'
        }, my按钮字);
        my按钮.type = 'button';
        my按钮.addEventListener('click', my点击时);
        return my按钮;
    }

    function my造时间框(my初值, my保存时) {
        const my输入框 = my造元素('input', {
            width: '110px', marginRight: '9px', padding: '2px 5px',
            border: '1px solid #c9d1d9', borderRadius: '5px',
            font: '18px/1.4 "Microsoft YaHei", sans-serif', color: '#000'
        });
        my输入框.type = 'time';
        my输入框.value = my初值 || '';
        my输入框.addEventListener('change', function () { my保存时(my输入框.value); });
        return my输入框;
    }

    function my建面板() {
        const my面板盒 = my造元素('div', {
            position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            zIndex: '2147483000', width: '495px', background: '#ededed', color: '#000000',
            border: '1px solid #c9d1d9', borderRadius: '12px',
            boxShadow: '0 6px 24px rgba(0,0,0,.2)',
            font: '18px/1.7 "Microsoft YaHei", sans-serif', userSelect: 'none',
            padding: '12px 15px', transition: 'opacity .15s'
        });

        const my标题行 = my造元素('div', { fontWeight: 'bold', marginBottom: '6px' }, '打卡助手');
        my面板盒.appendChild(my标题行);

        const my身份行 = my造元素('div', { marginBottom: '6px' }, '当前：读取中…');
        my面板盒.appendChild(my身份行);

        
        const my第一行 = my造元素('div', { display: 'flex', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' });
        my第一行.appendChild(my造按钮('上班', '#1a73e8', function () { my执行打卡(1, '上班'); }));
        my第一行.appendChild(my造元素('span', { marginRight: '3px' }, '班次1'));
        const my班次1框 = my造时间框(my取班次1时间(), function (my值) { my写存储(my存储键.班次1, my值); my记日志('班次1 时间改为', my值); });
        my第一行.appendChild(my班次1框);
        my第一行.appendChild(my造元素('span', { marginRight: '3px' }, '班次2'));
        const my班次2框 = my造时间框(my取班次2时间(), function (my值) { my写存储(my存储键.班次2, my值); my记日志('班次2 时间改为', my值); });
        my第一行.appendChild(my班次2框);
        my面板盒.appendChild(my第一行);

        
        const my第二行 = my造元素('div', { display: 'flex', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' });
        my第二行.appendChild(my造按钮('休息', '#f29900', function () { my执行休息(); }));
        const my分钟框 = my造元素('input', {
            width: '69px', marginRight: '6px', padding: '2px 5px',
            border: '1px solid #c9d1d9', borderRadius: '5px',
            font: '18px "Microsoft YaHei", sans-serif', color: '#000'
        });
        my分钟框.type = 'number'; my分钟框.min = '1'; my分钟框.max = '180';
        my分钟框.value = String(my取休息分钟());
        my分钟框.addEventListener('change', function () {
            const my数 = parseInt(my分钟框.value, 10);
            if (!isNaN(my数) && my数 >= 1 && my数 <= 180) { my写存储(my存储键.休息分钟, String(my数)); my记日志('休息分钟数改为', my数); }
            else { my分钟框.value = String(my取休息分钟()); }
        });
        my第二行.appendChild(my分钟框);
        my第二行.appendChild(my造元素('span', {}, '分钟后自动上班'));
        my面板盒.appendChild(my第二行);

        
        const my第三行 = my造元素('div', { marginBottom: '6px' });
        my第三行.appendChild(my造按钮('下班', '#c62828', function () { my执行打卡(3, '下班'); }));
        my面板盒.appendChild(my第三行);

        const my状态行 = my造元素('div', { color: '#000', borderTop: '1px solid #d8d8d8', paddingTop: '6px' }, '');
        my面板盒.appendChild(my状态行);

        return {
            面板盒: my面板盒, 标题行: my标题行, 身份行: my身份行,
            班次1框: my班次1框, 班次2框: my班次2框, 分钟框: my分钟框, 状态行: my状态行
        };
    }

    function my写状态(my文字, my是错) {
        if (!my面板) return;
        my面板.状态行.textContent = my文字;
        my面板.状态行.style.color = my是错 ? '#c62828' : '#000000';
    }

    function my刷新身份行() {
        if (!my面板) return;
        const my我 = my找我的行();
        if (my我.可以) {
            my面板.身份行.textContent = '当前：' + my我.姓名 + '　状态：' + (my状态名[my我.状态] || ('未知(' + my我.状态 + ')'));
            my面板.身份行.style.color = '#000000';
        } else {
            my面板.身份行.textContent = '当前：' + my我.原因;
            my面板.身份行.style.color = '#c62828';
        }
    }

    
    function my让开面板(my让开) {
        if (!my面板) return;
        my面板.面板盒.style.opacity = my让开 ? '0.25' : '1';
        my面板.面板盒.style.pointerEvents = my让开 ? 'none' : 'auto';
    }

    
    function my执行打卡(my目标, my动作) {
        if (my忙碌中) { my写状态('正在打卡，等一下…', false); return; }
        const my我 = my找我的行();
        if (!my我.可以) { my写状态('打卡失败：' + my我.原因, true); return; }

        if (my我.状态 === my目标) {
            my写状态('已经是 ' + my状态名[my目标] + '，跳过，没有提交。', false);
            return;
        }

        const my编辑钮 = my我.行.querySelector('a.edit_btn');
        if (!my编辑钮) { my写状态('打卡失败：这一行找不到 Edit 按钮', true); return; }

        my忙碌中 = true;
        my写状态(my动作 + '：正在提交…', false);

        
        try {
            sessionStorage.setItem(my会话键.待核对, JSON.stringify({ 目标: my目标, 动作: my动作, 时刻: Date.now() }));
        } catch (my错) { }

        my让开面板(true);
        my编辑钮.click();   

        my等待(my弹窗已开, my配置.等弹窗毫秒, function (my已打开) {
            if (!my已打开) {
                my让开面板(false); my忙碌中 = false;
                my清凭证();
                my写状态('打卡失败：等了 ' + Math.round(my配置.等弹窗毫秒 / 1000) + ' 秒，编辑框没弹出来', true);
                return;
            }

            const my下拉 = my取元素('#dtpStatusModal select[name=dtp_status]');
            if (!my下拉) { my让开面板(false); my忙碌中 = false; my清凭证(); my写状态('打卡失败：编辑框里找不到状态下拉', true); return; }

            const my选项 = my下拉.querySelector('option[value="' + my目标 + '"]');
            if (!my选项) { my让开面板(false); my忙碌中 = false; my清凭证(); my写状态('打卡失败：下拉里没有值 ' + my目标, true); return; }

            my下拉.value = String(my目标);
            try { my下拉.dispatchEvent(new Event('change', { bubbles: true })); } catch (my错) { }

            
            const my成员框 = my取元素('#member_role');
            if (my成员框 && !my成员框.checked) my成员框.click();

            const my角色已勾 = my取元素们('#dtpStatusModal .role_checkbox').some(function (my框) { return my框.checked; });
            if (!my角色已勾) { my让开面板(false); my忙碌中 = false; my清凭证(); my写状态('打卡失败：Member 没勾上', true); return; }

            const my保存钮 = my取元素('#dtpStatusModal .JS_dtp_status_save');
            if (!my保存钮) { my让开面板(false); my忙碌中 = false; my清凭证(); my写状态('打卡失败：找不到 Save 按钮', true); return; }

            my保存钮.click();

            
            
            setTimeout(function () {
                my让开面板(false); my忙碌中 = false;
                my清凭证();
                my写状态('点了保存，但页面没有刷新 —— 大概率没成功，看页面弹的提示', true);
                my刷新身份行();
            }, my配置.等刷新毫秒);
        });
    }

    
    function my执行休息() {
        const my分钟数 = my取休息分钟();
        const my回岗时刻 = new Date(Date.now() + my分钟数 * 60000);
        const my回岗时分 = my取时分(my回岗时刻);

        
        my写存储(my存储键.班次2, my回岗时分);
        if (my面板 && my面板.班次2框) my面板.班次2框.value = my回岗时分;
        my记日志('按了休息：班次2 时间改成', my回岗时分, '(' + my分钟数 + ' 分钟后)');

        my执行打卡(2, '休息');
    }

    function my清凭证() {
        try { sessionStorage.removeItem(my会话键.待核对); } catch (my错) { }
    }

    
    function my刷新后核对() {
        let my原文 = null;
        try { my原文 = sessionStorage.getItem(my会话键.待核对); } catch (my错) { return; }
        if (!my原文) return;
        my清凭证();

        let my凭证 = null;
        try { my凭证 = JSON.parse(my原文); } catch (my错) { return; }
        if (!my凭证 || !my凭证.目标) return;
        if (Date.now() - (my凭证.时刻 || 0) > 60000) return;   

        
        my等待(function () { return my找我的行().可以; }, 5000, function () {
            const my我 = my找我的行();
            if (!my我.可以) { my写状态('刷回来了，但确认不了结果：' + my我.原因, true); return; }
            if (my我.状态 === my凭证.目标) {
                my写状态('✓ ' + (my凭证.动作 || '') + ' ' + my状态名[my凭证.目标] + ' 成功（' + my取时分() + '）', false);
            } else {
                my写状态('✗ ' + (my凭证.动作 || '') + ' 没成功，现在还是 ' + (my状态名[my我.状态] || my我.状态), true);
            }
            my刷新身份行();
        });
    }

    
    function my检查时间() {
        if (my忙碌中) return;
        const my现在 = new Date();
        const my今天 = my取今天(my现在);
        const my此刻 = my现在.getTime();

        const my时段们 = [
            { 哪个点: 'am', 时间: my取班次1时间(), 动作: '班次1上班' },
            { 哪个点: 'pm', 时间: my取班次2时间(), 动作: '班次2上班' }
        ];

        for (let my序号 = 0; my序号 < my时段们.length; my序号++) {
            const my时段 = my时段们[my序号];
            const my分钟数 = my解析时分(my时段.时间);
            if (my分钟数 < 0) continue;                 

            const my目标时刻 = new Date(my现在.getFullYear(), my现在.getMonth(), my现在.getDate(),
                Math.floor(my分钟数 / 60), my分钟数 % 60, 0, 0).getTime();
            const my差值 = my此刻 - my目标时刻;
            if (my差值 < 0 || my差值 > my配置.命中窗口毫秒) continue;   
            if (my今天打过(my今天, my时段.哪个点)) continue;            

            my记今天打过(my今天, my时段.哪个点);
            my记日志(my时段.动作 + ' 到点了，开始打卡', my时段.时间);
            my执行打卡(1, my时段.动作);
            return;
        }
    }

    
    const my快捷键表 = {
        Digit1: function () { my执行打卡(1, '上班'); },
        Numpad1: function () { my执行打卡(1, '上班'); },
        Digit2: function () { my执行休息(); },
        Numpad2: function () { my执行休息(); },
        Digit3: function () { my执行打卡(3, '下班'); },
        Numpad3: function () { my执行打卡(3, '下班'); }
    };

    function my挂快捷键() {
        
        document.addEventListener('keydown', function (my按键事件) {
            if (!my按键事件.ctrlKey || !my按键事件.altKey) return;      
            const my动作 = my快捷键表[my按键事件.code];                  
            if (!my动作) return;                                        
            if (my忙碌中) return;                                       
            const my焦点元素 = my按键事件.target;
            const my标签名 = my焦点元素 ? my焦点元素.tagName : '';
            if (my标签名 === 'INPUT' || my标签名 === 'SELECT' || my标签名 === 'TEXTAREA') return;  
            my按键事件.preventDefault();
            my动作();
        }, true);
    }

    
    function my启动() {
        my面板 = my建面板();
        document.body.appendChild(my面板.面板盒);

        my刷新身份行();
        my刷新后核对();

        
        my面板.班次1框.value = my取班次1时间();
        my面板.班次2框.value = my取班次2时间();
        my面板.分钟框.value = String(my取休息分钟());

        setInterval(function () {
            my检查时间();
            my刷新身份行();
        }, my配置.检查周期毫秒);

        
        window.addEventListener('focus', function () { my检查时间(); my刷新身份行(); });

        my挂快捷键();

        my记日志('已启动', { 班次1: my取班次1时间(), 班次2: my取班次2时间() || '(空)', 休息分钟: my取休息分钟() });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', my启动);
    } else {
        my启动();
    }
})();
