/* Firebase وهمي في الذاكرة للقطات والاختبارات (000-T006، plan.md §3 و D1).
 *
 * ملف واحد بوجهين:
 *  • في المتصفح (يُحقن بـaddInitScript قبل أي سكربت): يعرّف window.firebase بنفس الدوال
 *    اللي يستدعيها الموقع فقط، ويبني شجرة brookie/* من window.__FIXTURE__.
 *  • في Node: module.exports.install(page, opts) يجهّز صفحة Playwright كاملة (حقن البيانات
 *    + حجب أي طلب خارجي + جمع الأخطاء)، ويرجع كائن report.
 *
 * لا يكتب في Firebase الحي إطلاقًا: لا يوجد أي اتصال شبكة هنا، وسكربتات gstatic تُحجب.
 * أي دالة غير مدعومة ترمي خطأ واضحًا ويُسجَّل في window.__FAKE_FIREBASE__.unsupported
 * (ما تمر بصمت).
 */
(function(){
  'use strict';

  // ═════════════ وجه المتصفح ═════════════
  if(typeof window !== 'undefined'){
    const fx = window.__FIXTURE__ || {};
    const ov = window.__OVERRIDES__ || fx.overrides || {};
    const state = window.__FAKE_FIREBASE__ = { unsupported: [], writes: 0, listeners: 0 };

    const clone = v => (v === undefined || v === null) ? null : JSON.parse(JSON.stringify(v));
    const split = p => String(p || '').split('/').filter(Boolean);
    const unsupported = (what) => {
      const msg = 'fake-firebase: غير مدعوم: ' + what;
      state.unsupported.push(what);
      throw new Error(msg);
    };

    // الشجرة: brookie/<مفتاح> كما في storage.js (مطابقة لمسارات Firebase الفعلية)
    const root = { brookie: {} };
    const B = root.brookie;
    if(fx.data) B['brookie-fantasy-s2-data'] = clone(fx.data);
    if(fx.predictions) B['brookie-fantasy-s2-predictions'] = clone(fx.predictions);
    const extra = fx.extra || {};
    if(extra.wall) B['wall'] = clone(extra.wall);
    if(extra.nameReactions) B['name-reactions'] = clone(extra.nameReactions);
    if(extra.seasonDuels) B['season-duels'] = clone(extra.seasonDuels);
    Object.keys(ov).forEach(k => { B[k] = clone(ov[k]); });

    const isObj = v => v !== null && typeof v === 'object';
    function getAt(parts){
      let n = root;
      for(const k of parts){
        if(!isObj(n) || !(k in n)) return null;
        n = n[k];
      }
      return n === undefined ? null : n;
    }
    // يكتب value في المسار (null = حذف) ويشيل الأفرع الفاضية، مثل Firebase
    function setAt(parts, value){
      if(!parts.length) unsupported('الكتابة على الجذر');
      let n = root;
      for(let i = 0; i < parts.length - 1; i++){
        const k = parts[i];
        if(!isObj(n[k])){
          if(value === null) return;
          n[k] = {};
        }
        n = n[k];
      }
      const last = parts[parts.length - 1];
      if(value === null) delete n[last];
      else n[last] = clone(value);
      prune(parts);
      state.writes++;
    }
    function prune(parts){
      for(let i = parts.length - 1; i >= 1; i--){
        const parent = getAt(parts.slice(0, i));
        if(isObj(parent) && Object.keys(parent).length === 0){
          const gp = getAt(parts.slice(0, i - 1));
          if(isObj(gp)) delete gp[parts[i - 1]];
        } else break;
      }
    }

    const snapOf = (key, val) => ({
      key,
      exists: () => val !== null,
      val: () => clone(val),
      forEach(fn){
        if(!isObj(val)) return false;
        for(const k of Object.keys(val)){
          if(fn(snapOf(k, val[k] === undefined ? null : val[k])) === true) return true;
        }
        return false;
      }
    });

    const listeners = []; // {path, cb, last}
    function notify(){
      listeners.slice().forEach(l => {
        const cur = getAt(l.parts);
        const s = JSON.stringify(cur);
        if(s === l.last) return;
        l.last = s;
        Promise.resolve().then(() => { try{ l.cb(snapOf(l.parts[l.parts.length - 1] || null, clone(cur))); }catch(e){ console.error(e); } });
      });
    }

    let pushSeq = 0;
    const pushKey = () => '-Fake' + String(++pushSeq).padStart(6, '0');

    function makeRef(parts){
      const path = parts.join('/');
      const ref = {
        key: parts.length ? parts[parts.length - 1] : null,
        toString: () => 'fake://' + path,
        child: p => makeRef(parts.concat(split(p))),
        async get(){ return snapOf(ref.key, clone(getAt(parts))); },
        async once(ev){
          if(ev !== 'value') unsupported("once('" + ev + "')");
          return snapOf(ref.key, clone(getAt(parts)));
        },
        async set(v){ setAt(parts, v === undefined ? unsupported('set(undefined)') : clone(v)); notify(); },
        async remove(){ setAt(parts, null); notify(); },
        async update(obj){
          if(!isObj(obj)) unsupported('update بدون كائن');
          Object.keys(obj).forEach(k => setAt(parts.concat(split(k)), obj[k] === undefined ? null : obj[k]));
          notify();
        },
        push(v){
          const key = pushKey();
          const child = makeRef(parts.concat([key]));
          const p = (v === undefined) ? Promise.resolve() : child.set(v);
          // نفس سلوك Firebase: الـref يرجع فورًا وهو أيضًا thenable
          child.then = (res, rej) => p.then(() => res(child), rej);
          child.catch = rej => p.catch(rej);
          return child;
        },
        on(ev, cb, errCb){
          if(ev !== 'value') unsupported("on('" + ev + "')");
          const l = { parts, cb, last: JSON.stringify(getAt(parts)) };
          listeners.push(l);
          state.listeners++;
          Promise.resolve().then(() => { try{ cb(snapOf(ref.key, clone(getAt(parts)))); }catch(e){ console.error(e); } });
          return cb;
        },
        off(ev, cb){
          if(ev !== undefined && ev !== 'value') unsupported("off('" + ev + "')");
          for(let i = listeners.length - 1; i >= 0; i--){
            if(listeners[i].parts.join('/') === path && (!cb || listeners[i].cb === cb)) listeners.splice(i, 1);
          }
        },
        async transaction(fn){
          const cur = clone(getAt(parts));
          const next = fn(cur);
          if(next === undefined) return { committed: false, snapshot: snapOf(ref.key, cur) };
          setAt(parts, next);
          notify();
          return { committed: true, snapshot: snapOf(ref.key, clone(getAt(parts))) };
        }
      };
      // أي دالة أخرى على الـref (onDisconnect، orderByChild، limitToLast…) ترمي بدل ما تمر بصمت
      return new Proxy(ref, {
        get(t, prop){
          if(prop in t || typeof prop === 'symbol' || prop === 'then' || prop === 'catch') return t[prop];
          return () => unsupported('ref.' + String(prop) + '()');
        }
      });
    }

    const DB = { ref: p => makeRef(split(p)) };
    const apps = [];
    window.firebase = {
      apps,
      initializeApp(cfg){ apps.push({ options: cfg }); return apps[apps.length - 1]; },
      database(){ return DB; }
    };
    return;
  }

  // ═════════════ وجه Node ═════════════
  if(typeof module === 'undefined') return;
  const fs = require('fs');
  const path = require('path');
  const ROOT = path.join(__dirname, '..');

  /* يجهّز صفحة Playwright:
   *   await install(page, {fixture?, overrides?, allowOrigin?})
   *   ← report: {consoleErrors, pageErrors, blocked, unsupported()}
   * allowOrigin: أصل الخادم المحلي المسموح (مثل http://127.0.0.1:5173). ملفات file: مسموحة دائمًا. */
  async function install(page, opts){
    opts = opts || {};
    const fixture = opts.fixture || JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/season.json'), 'utf8'));
    const overrides = opts.overrides || JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/overrides.json'), 'utf8'));
    const report = { consoleErrors: [], pageErrors: [], blocked: [], unsupported: () => page.evaluate(() => (window.__FAKE_FIREBASE__ || {}).unsupported || []) };

    await page.route(() => true, route => {
      const url = route.request().url();
      const local = /^(file|data|blob|about):/.test(url) || (opts.allowOrigin && url.startsWith(opts.allowOrigin));
      if(local) return route.continue();
      // طلب خارجي: يُحجب (يُرد فاضيًا بدل الإحباط عشان ما يظهر خطأ شبكة وهمي في الكونسول)
      report.blocked.push(url);
      const type = route.request().resourceType();
      if(type === 'script') return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
      if(type === 'stylesheet') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
      return route.fulfill({ status: 204, body: '' });
    });
    page.on('console', m => { if(m.type() === 'error') report.consoleErrors.push(m.text()); });
    page.on('pageerror', e => report.pageErrors.push(String(e && e.message || e)));

    await page.addInitScript(({ fx, ov }) => { window.__FIXTURE__ = fx; window.__OVERRIDES__ = ov; }, { fx: fixture, ov: overrides });
    await page.addInitScript({ content: fs.readFileSync(__filename, 'utf8') });
    return report;
  }

  module.exports = { install };
})();
