#!/usr/bin/env node
/* جرد إيموجي الواجهة وتوليد specs/001-ui-visual-overhaul/icon-map.md (001-T011a / S56).
 *   node tools/icon-audit.js            يفحص ويكتب icon-map.md
 *   node tools/icon-audit.js --json out  يكتب المواضع الخام JSON أيضًا
 * يفحص index.html وreport.html وjs/** (عدا generated وvoice) وcss/** بعد حذف التعليقات. جدول المقابل (إيموجي ← أيقونة) داخل الملف. */
const fs=require('fs'),path=require('path');const R=path.join(__dirname,'..');
const EMO=/\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*/gu;
const walk=(d,ex,o=[])=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(!ex(p))walk(p,ex,o)}else o.push(p)}return o};
const rel=p=>path.relative(R,p).split(path.sep).join('/');
const files=[R+'/index.html',R+'/report.html'].concat(walk(R+'/js',p=>/js\/(generated|voice)$/.test(rel(p))).filter(f=>f.endsWith('.js')),walk(R+'/css',()=>false).filter(f=>f.endsWith('.css')));
const stripJs=s=>s.replace(/("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,(m,str)=>str||m.replace(/[^\n]/g,''));
const stripCss=s=>s.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,''));
const stripHtml=s=>s.replace(/<!--[\s\S]*?-->/g,m=>m.replace(/[^\n]/g,''));
const CONTENT_FILES=new Set(['js/features/name-reactions.js','js/features/round-wall.js']);
const SHARE_FILES=new Set(['js/core/whatsapp-text.js']);
const all=[];
for(const f of files){const r=rel(f);let t=fs.readFileSync(f,'utf8');t=f.endsWith('.js')?stripJs(t):f.endsWith('.css')?stripCss(t):stripHtml(t);
 const lines=t.split('\n');let fn='';
 lines.forEach((l,i)=>{const m=l.match(/^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)/)||l.match(/^\s*(?:const|let)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/);if(m)fn=m[1];
  const ms=l.match(EMO);if(!ms)return;ms.forEach(e=>all.push({file:r,line:i+1,e:e.replace(/️/g,''),fn,text:l.trim().slice(0,110)}))});}

// المقابل: اسم أيقونة موجودة، أو {miss:'وصف'}، أو {drop:'سبب'} (نص مزاح بلا أيقونة)
const M={
'✅':'check','🏆':'trophy','⚔':'swords','🔥':'flame','👑':'crown','📋':'clipboard','⬇':'download','🗳':'poll','⚠':'warning','🏅':'medal','📊':'chart-bar','💀':'skull-zero','🥊':'swords','🔒':'lock','🗑':'trash','🔮':'crystal-ball','🧱':'wall','🛡':'shield','🔄':'refresh','🔴':'live','🎁':'gift','🎯':'target','⚽':'ball','🎙':'mic','👥':'users','💾':'save','🎉':'sparkles','📉':'trend-down','📤':'share','⬆':'arrow-up','➕':'plus','🔗':'link','🎖':'medal','⚡':'bolt','📈':'trend-up','⏳':'clock','🔼':'arrow-up','🔽':'arrow-down','⏰':'clock','📅':'calendar','🗓':'calendar','🧊':'snowflake','❄':'snowflake','🚀':'rocket','❌':'close','✖':'close','⚙':'settings','🔓':'unlock','💥':'sparkles','✏':'edit','📝':'edit','✍':'edit','🔍':'search','❓':'info','🧾':'certificate','📥':'download','🚨':'warning','🆕':'sparkles','🕒':'clock','🌙':'moon','💬':'comment','🌟':'sparkles','⭐':'sparkles','🔻':'arrow-down','🔁':'refresh','☠':'skull-zero','📲':'share',
'🔬':'flask','↩':'undo','👏':'thumbs-up','💪':'dumbbell','📌':'pin','🎞':'film','👁':'eye','🏛':'landmark','📖':'book','👋':'hand-wave','🌍':'globe','⏸':'pause','☁':'cloud','🎲':'dice','🏁':'flag-race','🚫':'ban','🏴':'flag','🖨':'printer','🔑':'key','📱':'phone','🟢':{miss:'نقطة حالة خضراء (تُستبدل بنقطة CSS، لا أيقونة)'},'🟡':{miss:'نقطة حالة صفراء (تُستبدل بنقطة CSS، لا أيقونة)'},'📣':'megaphone','🥅':'goal','🗄':'archive','🔕':'bell-off','🔤':'sort-alpha','🤝':'handshake','🧠':'brain','➡':'arrow-right','🧮':'calculator','▶':'play','🗺':'map','🕸':'radar','🏎':'race-car','🎢':'rollercoaster','🌪':'tornado','🌊':'wave','🎪':'tent','🙏':{drop:'وجه/يد دعاء داخل نص مزاح: يُحذف أو يُستبدل بكلمة'},'🙈':{drop:'وجه تعبيري داخل نص مزاح: يُحذف'},'😓':{drop:'وجه تعبيري داخل نص مزاح: يُحذف'},'😅':{drop:'وجه تعبيري داخل نص مزاح: يُحذف'},'😎':{drop:'وجه تعبيري داخل نص مزاح: يُحذف'},'😤':{drop:'وجه تعبيري داخل نص مزاح: يُحذف'},'😂':{drop:'وجه تعبيري داخل نص مزاح: يُحذف'},'🛌':'bed'
};
// المستثنى
const isContent=o=>(/^js\/features\/(name-reactions|round-wall)\.js$/.test(o.file)&&(o.line===16||o.line===18||o.line===67));
const isShare=o=>o.fn==='buildMyRankShareText';
const inScope=[],content=[],share=[];
all.forEach(o=>{ if(isContent(o)) content.push(o); else if(isShare(o)) share.push(o); else inScope.push(o); });
const by={};inScope.forEach(o=>{(by[o.e]=by[o.e]||[]).push(o)});
const region=f=>/^index\.html$/.test(f)?'index':/admin-|results-import-ui|community-copy|report\.html|report\/report-main/.test(f)?'admin':/stats-tab|rounds-tab|rules-and-about|season-duel|club-swap-lab|core\/insights-engine|sub-groups|participant-profile|round-poll|round-wall|live-focus-mode/.test(f)?'tabs2':/standings-|my-dashboard|participants-tab|notification-center|personal-status-bar|badge-toast|whats-new-card|champion-honor|hot-cold|spotlight-card|round-story-card/.test(f)?'first':'misc';
const RG={index:'index.html (يتوزّع على كل المناطق)',first:'الصفحة الأولى والتبويبات الرئيسية (الترتيب، حالتي، المشاركون، الإشعارات…)',admin:'المنظّم وصفحة الإبلاغ',tabs2:'الإحصائيات والجولات والقواعد والمواجهات',misc:'أدوات مشتركة (core وui)'};
const rows=Object.entries(by).sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]));
const fileCounts=a=>{const f={};a.forEach(x=>{const n=x.file.replace(/^js\/(features\/)?/,'');f[n]=(f[n]||0)+1});return Object.entries(f).sort((x,y)=>y[1]-x[1]).map(([k,v])=>`${k}×${v}`).join('، ')};
let covered=0,missing=0,dropped=0;const miss=[];
const tr=rows.map(([e,a])=>{const m=M[e];let status,icon;
 if(typeof m==='string'){icon='`'+m+'`';status='✅ موجودة';covered+=a.length}
 else if(m&&m.miss){icon='—';status='⬜ ناقصة: '+m.miss;missing+=a.length;miss.push({e,n:a.length,d:m.miss,files:fileCounts(a)})}
 else if(m&&m.drop){icon='—';status='🗑 '+m.drop;dropped+=a.length}
 else {icon='—';status='⚠ غير مصنَّف';missing+=a.length;miss.push({e,n:a.length,d:'?',files:fileCounts(a)})}
 const pr=a.length>=8?'عالية':a.length>=3?'متوسطة':'منخفضة';
 return `| ${e} | ${a.length} | ${fileCounts(a)} | ${icon} | ${status} | ${pr} |`}).join('\n');
const regs={};inScope.forEach(o=>{const r=region(o.file);const m=M[o.e];const k=typeof m==='string'?'cov':(m&&m.drop)?'drop':'miss';(regs[r]=regs[r]||{cov:0,miss:0,drop:0,files:{}})[k]++;regs[r].files[o.file]=(regs[r].files[o.file]||0)+1});
const regTable=Object.entries(RG).map(([k,v])=>{const r=regs[k]||{cov:0,miss:0,drop:0};return `| ${v} | ${r.cov+r.miss+r.drop} | ${r.cov} | ${r.miss} | ${r.drop} |`}).join('\n');
const pl=n=>n===1?'موضع واحد':n===2?'موضعان':n<=10?n+' مواضع':n+' موضعًا';
const missList=miss.sort((a,b)=>b.n-a.n).map((x,i)=>`${i+1}. ${x.e} **${x.d}** — ${pl(x.n)} (${x.files})`).join('\n');
const md=`# جرد إيموجي الواجهة وخريطة الاستبدال بأيقونات الهوية (001-T011a / S56)

> مولَّد من فحص آلي لنصوص \`index.html\` و\`report.html\` و\`js/**\` (عدا \`js/generated/\` و\`js/voice/\`) و\`css/**\`، بعد حذف التعليقات، بنفس قاعدة \`tools/lint.js\`. الأصل: ${all.length} موضعًا لإيموجي (${new Set(all.map(o=>o.e)).size} إيموجي مميَّز). المرجع: مكتبة الهوية **56 أيقونة** في \`assets/icons/\` و\`ICONS\`.

## 1. الخلاصة
| | المواضع |
|---|---|
| إجمالي ما وُجد | ${all.length} |
| **مستثنى (محتوى/مشاركة)** | ${content.length+share.length} (محتوى يكتبه الأعضاء: ${content.length}، ونص مشاركة الواتساب: ${share.length}) |
| **داخل نطاق الاستبدال** | **${inScope.length}** |
| ↳ **لها أيقونة موجودة** | **${covered}** (${Math.round(covered/inScope.length*100)}%) |
| ↳ **ناقصة (تحتاج أيقونة من Codex)** | **${missing}** (${miss.length} أيقونة مميَّزة) |
| ↳ **تُحذف** (وجه تعبيري بنص مزاح) | ${dropped} |

الميداليات 🥇🥈🥉 **غير موجودة** أصلًا بالواجهة (صارت صورًا ثابتة، R-23)، فلا مستثنيات منها هنا.

## 2. ما استثنيته (لا يُستبدل)
- **محتوى يكتبه الأعضاء:** لوحة تفاعلات الاسم وجدار الجولة (\`NAME_REACTIONS\` و\`WALL_REACTIONS\`: 🔥 😂 💀 👑، وإيموجي بديل التفاعل): هذي قيم يختارها الأعضاء ويُخزَّنها Firebase، وتبقى إيموجي (الدستور 10).
- **نص مشاركة الواتساب:** \`buildMyRankShareText\` بـ\`my-dashboard.js\` (🏆 💪 🔼 🔽): نص يُنسخ/يُرسل ولا يحمل صورًا (R-24). *(ملاحظة للمراجع: R-24 يقرر أن نص الواتساب يخلو من إيموجي عدا الميداليات؛ هذه الدالة ما زالت فيها 6 مواضع، فتحتاج مهمة لغة منفصلة لو تبيها تنظيفًا.)*
- ملفات \`js/voice/\` و\`js/generated/\`، والتعليقات.

## 3. الجدول الكامل (لكل إيموجي مميَّز، داخل النطاق)
| الإيموجي | المواضع | الملفات (الأكثر) | الأيقونة المقابلة | الحالة | الأولوية |
|---|---|---|---|---|---|
${tr}

## 4. قائمة الأيقونات الناقصة (لـCodex، مرتَّبة بالتكرار)
${missList}

> المواضع المذكورة تتضمن \`index.html\`. الأيقونة بأسلوب مكتبة الهوية (viewBox 24، \`stroke 1.75\`، \`currentColor\`). الأولوية العليا (≥3 مواضع) أولًا.

## 5. التوزيع على مناطق الاستبدال (لأوامر S57–S60)
| المنطقة | إجمالي المواضع | بأيقونة موجودة | ناقصة | تُحذف |
|---|---|---|---|---|
${regTable}

أكبر الملفات داخل كل منطقة:
${Object.entries(RG).map(([k,v])=>`- **${v}:** ${Object.entries((regs[k]||{files:{}}).files).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([f,n])=>f.replace(/^js\/(features\/)?/,'')+'×'+n).join('، ')||'—'}`).join('\n')}

## 6. قواعد الاستبدال المقترحة
1. الأيقونة بجانب النص بـ\`ICONS.<اسم>\` (SVG بـ\`currentColor\`، 16–20px)، بلا إيموجي.
2. مواضع بحالة (🟢 🟡 ✅ ⚠ ❌): أيقونة أو نقطة CSS بلون \`--c-up/--c-down/--c-gold\` مع نص بديل (\`aria-label\`)، **لا لون وحده**.
3. نصوص المزاح بوجه تعبيري (😓 😅 😎 😤 🙈 🙏): يُحذف الوجه وتبقى الجملة.
4. الأزرار الحاملة للإيموجي بـ\`textContent\` تتحول لـ\`innerHTML\` بأيقونة ونص، ويُراعى \`aria-label\`.
`;
fs.writeFileSync(path.join(R,'specs/001-ui-visual-overhaul/icon-map.md'),md);
if(process.argv.includes('--json')) fs.writeFileSync(process.argv[process.argv.indexOf('--json')+1],JSON.stringify(all));
console.log({inScope:inScope.length,covered,missing,dropped,content:content.length,share:share.length,distinct:rows.length,missDistinct:miss.length});
