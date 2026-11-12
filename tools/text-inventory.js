#!/usr/bin/env node
/* جرد كل نص عربي في js/** وindex.html وreport.html (002-T005، plan.md §1).
 *
 *   node tools/text-inventory.js [--root .] [--out specs/002-language-voice/inventory.md]
 *   node tools/text-inventory.js --check-coverage [--sample 10] [--seed 1]   فحص تغطية مستقل (عيّنة عشوائية)
 *
 * ما يُجرد: نصوص داخل علامات الاقتباس ('…' و"…") والقوالب النصية (`…` وكل نص داخل ${…} يُجرد بسطر مستقل)،
 * ومحتوى HTML (النصوص بين الوسوم، وقيم الخاصيات اللي فيها عربي، ونصوص <script> المضمّنة). **بدون التعليقات**
 * (تعليقات السطر والكتل في JS، وتعليقات HTML) وبدون محتوى <style>. أي نص فيه حرف عربي واحد على الأقل يُجرد.
 * المخرج: جدول لكل ملف: السطر · النص · النوع (نص ثابت / قالب فيه ${} / HTML) · عمود فاضي للتصنيف (يعبّيه Opus لاحقًا).
 * حتمي: مرتب بالملف ثم السطر ثم الموضع، بلا تواريخ. */
const fs = require('fs');
const path = require('path');

const ROOT_DEFAULT = path.join(__dirname, '..');
const AR = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const K_STATIC = 'نص ثابت', K_TEMPLATE = 'قالب فيه ${}', K_HTML = 'HTML';

// ───────────── ماسح JS (نصوص وقوالب، يتجاوز التعليقات والـregex) ─────────────
function decodeEscapes(s) {
  return s.replace(/\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|([\s\S]))/g, (m, _a, cp, u4, x2, ch) => {
    if (cp) return String.fromCodePoint(parseInt(cp, 16));
    if (u4) return String.fromCharCode(parseInt(u4, 16));
    if (x2) return String.fromCharCode(parseInt(x2, 16));
    return ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' })[ch] !== undefined ? ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0' })[ch] : (ch === '\n' ? '' : ch);
  });
}

const REGEX_PREV = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', '']);
const REGEX_KW = /(?:^|[^\w$.])(?:return|typeof|case|do|else|in|of|instanceof|new|delete|void|throw|yield|await)$/;

function scanJs(src) {
  const items = [];
  let i = 0;
  const n = src.length;
  // يرجع الموضع بعد الإغلاق لو endOnBrace، وإلا نهاية النص
  function scan(endOnBrace) {
    let depth = 0, prev = '', recent = '';
    while (i < n) {
      const c = src[i], d = src[i + 1];
      if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
      if (c === '"' || c === "'") {
        const start = i; i++;
        let raw = '';
        while (i < n && src[i] !== c) { if (src[i] === '\\') { raw += src[i] + (src[i + 1] || ''); i += 2; } else if (src[i] === '\n') break; else { raw += src[i]; i++; } }
        i++; // الإغلاق
        const text = decodeEscapes(raw);
        if (AR.test(text)) items.push({ index: start, text, kind: /<\/?[a-zA-Z][^>]*>/.test(text) ? K_HTML : K_STATIC });
        prev = c; recent += c; continue;
      }
      if (c === '`') {
        const start = i; i++;
        let text = '', hasExpr = false;
        while (i < n && src[i] !== '`') {
          if (src[i] === '\\') { text += decodeEscapes(src[i] + (src[i + 1] || '')); i += 2; continue; }
          if (src[i] === '$' && src[i + 1] === '{') {
            hasExpr = true;
            const exprStart = i + 2; i += 2;
            scan(true);   // يعالج التعبير (ونصوصه الداخلية تُسجَّل مستقلة) ويتوقف بعد }
            text += '${' + src.slice(exprStart, i - 1).replace(/\s+/g, ' ').trim() + '}';
            continue;
          }
          text += src[i]; i++;
        }
        i++;
        // النص العربي للقالب يُحسب من أجزائه الثابتة فقط (التعبيرات الداخلية سُجّلت بسطر مستقل)
        const staticPart = text.replace(/\$\{[^}]*\}/g, '');
        if (AR.test(staticPart)) items.push({ index: start, text, kind: hasExpr ? K_TEMPLATE : (/<\/?[a-zA-Z][^>]*>/.test(text) ? K_HTML : K_STATIC) });
        prev = '`'; recent += '`'; continue;
      }
      if (c === '/') {
        const kw = REGEX_KW.test(recent.slice(-12));
        if (REGEX_PREV.has(prev) || kw) {   // regex literal: نتجاوزه (ما يُجرد)
          i++;
          let inClass = false;
          while (i < n && src[i] !== '\n') {
            if (src[i] === '\\') { i += 2; continue; }
            if (src[i] === '[') inClass = true; else if (src[i] === ']') inClass = false;
            else if (src[i] === '/' && !inClass) { i++; break; }
            i++;
          }
          while (i < n && /[a-z]/.test(src[i])) i++;
          prev = 'x'; recent += 'x'; continue;
        }
      }
      if (c === '{') depth++;
      else if (c === '}') { if (endOnBrace && depth === 0) { i++; return; } depth--; }
      if (!/\s/.test(c)) { prev = c; recent = (recent + c).slice(-24); } else if (/\w/.test(recent.slice(-1))) recent += ' ';
      i++;
    }
  }
  scan(false);
  return items;
}

// ───────────── ماسح HTML ─────────────
const blank = m => m.replace(/[^\n]/g, ' ');   // يمسح المحتوى ويبقي الأسطر (ترقيم ثابت)

function scanHtml(src) {
  const items = [];
  let s = src.replace(/<!--[\s\S]*?-->/g, blank);
  // <script>: نصوصها بالماسح JS (مع إزاحة الموضع)، ثم تُمسح من الـmarkup
  s = s.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (m, code, off) => {
    const open = m.indexOf('>') + 1;
    scanJs(code).forEach(it => items.push(Object.assign(it, { index: off + open + it.index })));
    return blank(m);
  });
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, blank);
  const lineText = t => t.replace(/\s+/g, ' ').trim();
  // الوسوم: الخاصيات اللي فيها عربي
  const tagRe = /<[a-zA-Z][^>]*>/g;
  let m;
  while ((m = tagRe.exec(s))) {
    const attrRe = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let a;
    while ((a = attrRe.exec(m[0]))) {
      const val = a[3] !== undefined ? a[3] : a[4];
      if (AR.test(val)) items.push({ index: m.index + a.index, text: `${a[1]}="${lineText(val)}"`, kind: K_HTML });
    }
  }
  // النصوص بين الوسوم
  const textRe = />([^<>]+)</g;
  while ((m = textRe.exec(s))) {
    if (AR.test(m[1])) {
      const lead = m[1].length - m[1].trimStart().length;
      items.push({ index: m.index + 1 + lead, text: lineText(m[1]), kind: K_HTML });
    }
  }
  return items;
}

const lineOf = (src, index) => { let l = 1; for (let i = 0; i < index; i++) if (src.charCodeAt(i) === 10) l++; return l; };

function listFiles(root) {
  const out = [];
  const walk = d => { fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'generated') walk(p); } else if (e.name.endsWith('.js')) out.push(p); }); };
  walk(path.join(root, 'js'));
  ['index.html', 'report.html'].forEach(f => { if (fs.existsSync(path.join(root, f))) out.push(path.join(root, f)); });
  const rel = p => path.relative(root, p).split(path.sep).join('/');
  return out.map(rel).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function inventory(root) {
  const files = [];
  for (const rel of listFiles(root)) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    const raw = rel.endsWith('.html') ? scanHtml(src) : scanJs(src);
    const rows = raw.map(r => ({ line: lineOf(src, r.index), index: r.index, text: r.text, kind: r.kind }))
      .sort((a, b) => a.index - b.index);
    if (rows.length) files.push({ file: rel, rows });
  }
  return files;
}

const cell = t => t.replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').replace(/`/g, '\\`').trim();

function render(files) {
  const total = files.reduce((s, f) => s + f.rows.length, 0);
  const byKind = {};
  files.forEach(f => f.rows.forEach(r => { byKind[r.kind] = (byKind[r.kind] || 0) + 1; }));
  let md = `# جرد النصوص العربية (002-T005)\n\n`;
  md += `> مولَّد بـ\`node tools/text-inventory.js\` (لا تعدّله يدويًا ما عدا عمود **التصنيف**).\n`;
  md += `> **عمود التصنيف فاضي عمدًا:** Opus يصنّف كل نص: طبقة رسمية أو شعبية، وسليم أو يحتاج تعديل.\n`;
  md += `> النطاق: \`js/**\` (عدا \`generated/\`) و\`index.html\` و\`report.html\`. بدون التعليقات.\n\n`;
  md += `**الإجمالي: ${total} نصًا في ${files.length} ملفًا** · ` + Object.keys(byKind).sort().map(k => `${k}: ${byKind[k]}`).join(' · ') + `\n\n`;
  md += `## عدد النصوص لكل ملف\n\n| الملف | العدد |\n|---|---|\n` + files.map(f => `| \`${f.file}\` | ${f.rows.length} |`).join('\n') + '\n\n';
  files.forEach(f => {
    md += `## \`${f.file}\` (${f.rows.length})\n\n| السطر | النص | النوع | التصنيف |\n|---|---|---|---|\n`;
    md += f.rows.map(r => `| ${r.line} | ${cell(r.text)} | ${r.kind} |  |`).join('\n') + '\n\n';
  });
  return { md, total };
}

// ───────────── فحص التغطية المستقل ─────────────
// يختار نصوصًا عربية عشوائية بطريقة مستقلة عن الماسح (سطور فيها عربي بين علامات اقتباس أو بين وسوم)، ويتأكد أنها في الجرد
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function checkCoverage(root, files, sample, seed) {
  const norm = t => t.replace(/\s+/g, ' ');
  const byFile = Object.fromEntries(files.map(f => [f.file, f.rows.map(r => norm(r.text)).join('\u0001')]));
  const candidates = [];
  for (const rel of listFiles(root)) {
    const lines = fs.readFileSync(path.join(root, rel), 'utf8').split('\n');
    lines.forEach((ln, i) => {
      const t = ln.trim();
      if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--')) return;
      const q = ln.match(/['"`]([^'"`\n]*[\u0600-\u06FF][^'"`\n]*)['"`]/) || (rel.endsWith('.html') ? ln.match(/>([^<>]*[\u0600-\u06FF][^<>]*)</) : null);
      if (!q) return;
      // نص داخل تعليق نهاية السطر (// …) مو نصًا في الكود
      const ci = ln.search(/(^|[\s;),])\/\/\s/);
      if (ci >= 0 && q.index > ci) return;
      const run = (q[1].match(/[\u0600-\u06FF]{2,}(?:\s+[\u0600-\u06FF]{2,}){0,3}/g) || []).sort((a, b) => b.length - a.length)[0];
      if (run && run.length >= 5) candidates.push({ file: rel, line: i + 1, run });
    });
  }
  const r = rng(seed), picked = [];
  const pool = candidates.slice();
  while (picked.length < sample && pool.length) picked.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  const results = picked.map(p => ({ ...p, found: (byFile[p.file] || '').includes(norm(p.run)) }));
  return { results, candidates: candidates.length };
}

function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const root = path.resolve(arg('--root', ROOT_DEFAULT));
  const files = inventory(root);
  if (argv.includes('--check-coverage')) {
    const { results, candidates } = checkCoverage(root, files, Number(arg('--sample', '10')), Number(arg('--seed', '1')));
    console.log(`عيّنة ${results.length} من ${candidates} نصًا عربيًا مرشّحًا (مختارة بطريقة مستقلة عن الماسح):`);
    results.forEach(x => console.log(`${x.found ? '✅' : '❌'} ${x.file}:${x.line}  «${x.run}»`));
    return results.every(x => x.found) ? 0 : 1;
  }
  const { md, total } = render(files);
  const out = path.resolve(root, arg('--out', 'specs/002-language-voice/inventory.md'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, md);
  console.log(`✅ ${path.relative(root, out)} · ${total} نصًا في ${files.length} ملفًا (${(Buffer.byteLength(md) / 1024).toFixed(0)}KB)`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { scanJs, scanHtml, inventory, render, checkCoverage, main };
