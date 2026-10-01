// ==UserScript==
// @name         攻占OIS机器人
// @namespace    scvzrv/Conquer_OIS
// @version      2.3
// @description  攻占OIS机器人：作业页点按钮自动开新窗口 + 工作列表自动刷新提醒（点面板「使用说明」看详情）
// @updateURL    https://raw.githubusercontent.com/scvzrv/Conquer_OIS/refs/heads/main/OIS_%E7%82%B9Upload%E8%87%AA%E5%8A%A8%E5%BC%80%E6%96%B0%E7%AA%97%E5%8F%A3.js
// @downloadURL  https://raw.githubusercontent.com/scvzrv/Conquer_OIS/refs/heads/main/OIS_%E7%82%B9Upload%E8%87%AA%E5%8A%A8%E5%BC%80%E6%96%B0%E7%AA%97%E5%8F%A3.js
// @match        http://ois.aplushk.com/file/job/stamper/*
// @match        https://ois.aplushk.com/file/job/stamper/*
// @run-at       document-start
// @grant        none
// ==/UserScript==


(function () {
    'use strict';

    const CONFIG = {

        selector: '.JS_upload_btn',

        text: 'Upload',

        textMode: 'exact',

        ignoreCase: true,

        delay: 200,

        watchInterval: 200,

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

