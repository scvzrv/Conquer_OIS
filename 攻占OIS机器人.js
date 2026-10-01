// ==UserScript==
// @name         攻占OIS机器人
// @namespace    scvzrv/Conquer_OIS
// @version      2.3
// @description  点击Upload按钮，0.2 秒后打开一个铺满屏幕的独立窗口 → 旧窗口关闭后，新窗口自动刷新一次
// @updateURL    https://raw.githubusercontent.com/scvzrv/Conquer_OIS/refs/heads/main/OIS_%E7%82%B9Upload%E8%87%AA%E5%8A%A8%E5%BC%80%E6%96%B0%E7%AA%97%E5%8F%A3.js
// @downloadURL  https://raw.githubusercontent.com/scvzrv/Conquer_OIS/refs/heads/main/OIS_%E7%82%B9Upload%E8%87%AA%E5%8A%A8%E5%BC%80%E6%96%B0%E7%AA%97%E5%8F%A3.js
// @match        http://ois.aplushk.com/file/job/stamper/*
// @match        https://ois.aplushk.com/file/job/stamper/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /* ==========================================================================
     *  ★ 常改的就 3 处，全部在下面的 CONFIG 里，改完按 Ctrl+S 保存即可：
     *
     *   ① 触发哪个按钮            → CONFIG.selector        （现在是 '.JS_cancel'）
     *                              （文字兜底在 CONFIG.text，现在是 'Upload'）
     *   ② 点击后等多久开新窗口     → CONFIG.delay           （现在是 200 毫秒 = 0.2 秒）
     *   ③ 多久检查一次旧窗口关没关  → CONFIG.watchInterval   （现在是 200 毫秒）
     *
     *  另外 CONFIG.cooldown（防连点间隔）也常有人调，现在是 800 毫秒。
     *  下面每一项都有【】标注，按需改，别的不动就行。
     * ========================================================================== */
    const CONFIG = {
        /* ---------------- ① 触发按钮：要换按钮就改这一段 ---------------- */

        // 【按选择器匹配】站点给这些功能按钮挂了 JS_ 开头的专属钩子 class，比按文字找稳得多：
        //   Upload 按钮 = '.JS_upload_btn'（实测：<input type="button" class="btn btn-primary JS_upload_btn" value="Upload">）
        //   Cancel 按钮 = '.JS_cancel'
        //   Edit   按钮 = '.JS_assign_edit'
        // 换按钮只改下面这一行。
        selector: '.JS_cancel', //JS_upload_btn

        // 【按文字匹配】上面的 selector 没匹配到时才会用这个兜底。
        // 注意：<input type="button"> 的文字在 value 属性里，脚本会自动从 value 取。
        text: 'Upload',

        // 文字匹配方式：
        //   'exact'    = 整词匹配（推荐，避免误伤 "Upload History" 这类）
        //   'contains' = 只要包含这几个字就算
        textMode: 'exact',

        // 文字比较是否忽略大小写（'upload' 也能匹配到 'Upload'）
        ignoreCase: true,

        /* ---------------- ② 时间相关：要调节奏就改这一段 ---------------- */

        // 【时间·1】点击按钮后，等多少毫秒再弹出新窗口。200 = 0.2 秒
        // 想 1 秒后再弹 → 改成 1000；想立刻弹 → 改成 0
        delay: 200,

        // 【时间·2】新窗口每隔多少毫秒检查一次"旧窗口关闭了吗"。200 = 0.2 秒
        // 调小 = 旧窗口一关新窗口马上刷新（更快）；调大 = 更省资源但稍迟钝
        watchInterval: 200,

        // 【时间·3】防手抖连点：两次点击至少间隔多少毫秒才允许再次触发。800 = 0.8 秒
        // 调小 = 允许快速连点、连开多个窗口；调大 = 更防误触
        cooldown: 800,

        /* ---------------- ③ 新窗口长什么样 ---------------- */

        // 新窗口打开的地址：'current' = 点击那一刻的当前页地址；也可以写死一个 URL
        url: 'current',

        // 'window' = 独立窗口；'tab' = 新标签页
        openAs: 'window',

        // 新窗口是否铺满屏幕（默认开）。开了之后，下面的 width/height/offsetX/offsetY 全部忽略。
        // 想回到"和当前窗口一样大、右下错开"的效果 → 改成 false
        maximize: true,

        // 不铺满时的尺寸：'same' = 和当前窗口一样大；也可以直接写数字，如 1600
        width: 'same',
        height: 'same',

        // 不铺满时新窗口的位置：相对当前窗口向右下错开多少像素，避免完全盖住原窗口
        offsetX: 40,
        offsetY: 40,

        /* ---------------- ④ 自动刷新逻辑 ---------------- */

        // 新窗口是否在"旧窗口关闭后"自动刷新自己一次。
        // 旧窗口怎么关掉都行：网站自己关（Upload 后 2~4 秒）、或你手动关，都能检测到。
        // 不想要这个自动刷新 → 改成 false
        refreshOnOpenerClose: true,

        /* ---------------- ⑤ 其他（一般不用改） ---------------- */

        // 如果 Edge 把新窗口当广告拦截了，改成 true：
        // 点击瞬间先开一个空白窗口（不会被拦），等 delay 毫秒后再加载目标页
        strictPopup: false,

        // 只对指定 job id 生效。留空数组 [] = 当前所有 stamper 页面都生效。
        // 例：[732165, 732322]
        onlyIds: [],

        // 控制台日志（按 F12 能看运行过程）。要排查问题时把它改回 true
        debug: false, //true
    };
    /* ================ 配置区结束 ================ */

    // ---- 只在指定 id 的页面上生效（配置了 onlyIds 时）----
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
        if (t.length > 30) return false; // 太长一定不是按钮本身，防止误伤大容器

        const a = CONFIG.ignoreCase ? t.toLowerCase() : t;
        const b = CONFIG.ignoreCase ? CONFIG.text.toLowerCase() : CONFIG.text;

        if (CONFIG.textMode === 'exact') {
            // 去掉图标/箭头/标点后整词比对，'✏ Edit' 也能命中
            const strip = (s) => s.replace(/[^\p{L}\p{N}]+/gu, '');
            return a === b || (strip(a) !== '' && strip(a) === strip(b));
        }
        return a.includes(b);
    }

    // 判断这次点击是否命中 Upload 按钮
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
            // 优先看最近的按钮类元素（兼容按钮里套了 <span>/<i> 图标）
            const box = target.closest(CLICKABLE);
            if (box && textHit(textOf(box))) {
                log('命中元素：', box);
                return true;
            }
            // 兜底：不是标准按钮，但是个短文本的叶子节点
            if (!target.children.length && textHit(textOf(target))) {
                log('命中元素：', target);
                return true;
            }
        }

        return false;
    }

    // 组装新窗口参数：只要带了 features，浏览器就会开成独立窗口而不是标签页
    function buildFeatures() {
        if (CONFIG.openAs !== 'window') return '';

        const scr = window.screen || {};

        if (CONFIG.maximize) {
            // 网页没有权限调用系统的"最大化"。这里用"铺满屏幕可用区域"实现，
            // 效果上就是最大化（可用区域 = 屏幕减去任务栏）。
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

    // 双保险：万一 Edge 没按 left/top 摆放新窗口，再强制挪一次
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

    /* ============================================================
     *  新窗口侧：盯着"旧窗口"（父窗口），旧窗口一关闭就刷新自己一次
     * ============================================================ */

    // 刷新标记。用 window.name 存：它跟着窗口走、刷新后仍在，
    // 而且不会被子窗口继承（sessionStorage 会被子窗口复制，所以不能用它）。
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
            // 极端情况下访问受限：当作还活着，下次再判断
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

        // 不是被别的窗口打开的（例如你手动开的），不处理
        if (!hasOpener) {
            log('本窗口没有父窗口（不是被其它窗口打开的），不做"旧窗口关闭后刷新"的监听');
            return;
        }

        if (!openerIsClosed()) {
            // 情况一：加载时旧窗口还活着 → 轮询等它关闭
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

        // 情况二：本窗口加载时旧窗口就已经关了（上传后旧窗口关得快）→ 补刷一次
        if (alreadyRefreshed()) {
            log('旧窗口已关闭，且本窗口已刷新过，跳过');
            return;
        }
        log('旧窗口在本窗口加载前已关闭 → 补刷新一次');
        markRefreshed();
        location.reload();
    }

    /* ==========================================================================
     *  完整运行流程（正式使用 Upload 时）
     *   1. 你在原窗口点 Upload → 原来的上传逻辑照常跑（脚本只旁听，绝不拦截）
     *   2. 过 delay 毫秒（现在 500ms）→ 弹出一个铺满屏幕的独立窗口，打开同一个页面
     *   3. 原窗口上传完成 → 网站自己把它关掉（约 2~4 秒，不关我们的事）
     *   4. 新窗口发现旧窗口没了 → 自动刷新一次，看到上传后的最新数据
     * ========================================================================== */

    // 捕获阶段监听：先于页面自身逻辑执行；
    // 绝不调用 preventDefault / stopPropagation，按钮原功能完整保留。
    document.addEventListener(
        'click',
        function (e) {
            if (!isTarget(e.target)) return;

            const now = Date.now();
            if (now - lastFire < CONFIG.cooldown) return;
            lastFire = now;

            // 关键：在点击那一刻就把地址存下来。
            // 否则按钮若跳转了当前页，延迟 0.5 秒后读到的就是新地址了。
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

    // 如果本窗口是被别的窗口打开的（即"新窗口"），启动对旧窗口的监听
    watchOpenerAndRefresh();

    log('脚本已就绪，触发按钮：' + (CONFIG.selector || CONFIG.text));
})();
