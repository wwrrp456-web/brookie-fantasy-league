# 000: الخطة التقنية

## 1. البنية المضافة

```
package.json                    ← 🆕 devDependencies فقط (playwright، pngjs، pixelmatch). الموقع نفسه بدون أي اعتمادية
tests/
  fixtures/season.json          ← 🆕 بيانات حقيقية معقّمة (من النسخة الاحتياطية)
  run.js                        ← يُضاف له اختبار تخطيط الستوري
tools/
  make-fixture.js               ← 🆕 نسخة احتياطية خام → season.json معقّمة
  fake-firebase.js              ← 🆕 Firebase وهمي في الذاكرة، يُحقن في الصفحة أثناء اللقطات فقط
  snap.js                       ← 🆕 اللقطات
  snap-diff.js                  ← 🆕 مقارنة لقطتين ← صور فرق + تقرير
  lint.js                       ← 🆕 المقاييس
  lint-baseline.json            ← 🆕 خط الأساس
.github/workflows/verify.yml    ← 🆕 الفحص التلقائي
assets/fonts/tajawal-*.woff2    ← 🆕 خط Tajawal محلي (رخصة OFL)
css/fonts.css                   ← 🆕 @font-face محلي بدل Google Fonts
js/ui/card-layout.js            ← 🆕 دوال تخطيط الكروت الصافية (بدون DOM) لتُختبر في Node
league.html                     ← تُستبدل بصفحة تحويل
```

## 2. القرارات

| # | القرار | السبب |
|---|---|---|
| D1 | **Firebase وهمي يُحقن بـ`addInitScript`**، مع حجب سكربتات `gstatic.com`، بدل تعديل `storage.js` | صفر تغيير على كود الموقع المنشور. الكود يستدعي 9 دوال فقط (`initializeApp`، `apps`، `database`، `ref().get/set/on/off/push/update/remove/transaction`)، فالمحاكاة صغيرة (~120 سطر) |
| D2 | البيانات من **النسخة الاحتياطية** (`version:2`: `data` و`predictions` و`extra`) + ملف `overrides` يدوي صغير للمسارات الخارجة عنها (`currentChampionId`، `seasonChampionsArchive`، `championHonorFeatures`) | المنظّم يقدر يحدّثها بنفسه كل فترة بضغطة زر |
| D3 | **التعقيم:** كل حقل نصي حر كتبه عضو (رسائل الجدار، والتعليقات) يُستبدل بنص تجريبي بنفس الطول التقريبي، وتبقى البنية والأعداد والتفاعلات | الريبو عام، ورسائل الأعضاء ما تنشر فيه |
| D4 | **خط محلي** بدل Google Fonts، للموقع نفسه مو بس للقطات | ثبات اللقطات + الكانفس يضمن الخط + سرعة + لا اعتماد خارجي (يخدم ميزة 004 أيضًا). المصدر: حزمة `@fontsource/tajawal` من npm |
| D5 | **وقت مجمّد** بـ`page.clock.setFixedTime` (Playwright 1.63)، والقيمة الافتراضية `--now` = تاريخ تصدير النسخة الاحتياطية | العد التنازلي و"قبل ساعة" يصيرون ثابتين |
| D6 | **الدمج التلقائي** بميزة GitHub الأصلية (Auto-merge + حماية `main` بفحص `verify` إلزامي)، ويتفعّل على الـPR **بعد مراجعة Opus** | الفحص الآلي يمسك الأعطال، والمراجعة تمسك الذوق واللغة، وكلاهما مجاني |
| D7 | دالة تخطيط الستوري تُفصل لملف صافٍ `card-layout.js` | تُختبر في Node بدون متصفح، ويعاد استخدامها في محرك الكروت (001) |

## 3. تفاصيل المكونات

### `tools/fake-firebase.js`
```js
// يُحقن قبل أي سكربت. يقرأ window.__FIXTURE__ (يحقنه snap.js من season.json)
// ويبني شجرة في الذاكرة مطابقة لمسارات Firebase:
//   brookie/brookie-fantasy-s2-data        ← fixture.data
//   brookie/brookie-fantasy-s2-predictions ← fixture.predictions
//   brookie/wall | name-reactions | season-duels ← fixture.extra.*
//   brookie/currentChampionId …            ← fixture.overrides.*
window.firebase = { apps: [], initializeApp(cfg){ this.apps.push({cfg}); }, database(){ return DB; } };
// DB.ref(path) → { get() → Promise<{exists(), val(), key}>, set, update, push, remove,
//                  on('value', cb) → يستدعي cb فورًا ومع كل كتابة لاحقة، off, transaction(fn) }
// أي دالة غير مدعومة ترمي خطأ واضح يظهر في تقرير snap.js، فلا يمر بصمت
```

### `tools/snap.js`
```
node tools/snap.js [--label head] [--root .] [--fixture tests/fixtures/season.json]
                   [--now 2026-10-29T18:00:00+03:00] [--only tabs|cards] [--out snapshots]
```
- يشغّل خادمًا ثابتًا (نفس منطق `.claude/static-server.js`) على منفذ عشوائي.
- يحجب كل طلب خارج نفس المنشأ.
- يحقن: الوقت المجمّد، و`__FIXTURE__`، و`fake-firebase.js`، و`brookie-onboarded=1`، ووضع الثيم.
- **التبويبات:** 7 × عرضين × ثيمين = 28 لقطة كاملة الطول.
- **الكروت:** يستدعي دوال البناء مباشرة (`buildChampionCard` وأخواتها) في 3 حالات:
  - `full`
  - `incomplete`: `CHAMPION_ID=null`، ومشارك بلا نقاط
  - `long`: أطول اسم "أبو تغريد (زيد) الثاني"
- **المخرجات:** `snapshots/<label>/*.png` + `report.json` (أخطاء الكونسول، والطلبات المحجوبة، والدوال الوهمية الناقصة).
- **يفشل** (exit 1) لو فيه خطأ JS غير متوقع.

### `tools/snap-diff.js`
- يقارن `snapshots/base` و`snapshots/head` بـpixelmatch.
- يكتب `diff/*.png` (قبل | بعد | فرق جنب بعض) و`diff/summary.md` (الصور المتغيرة ونسبة التغير).
- **لا يفشل** على أي فرق، لأن الفرق المقصود هو هدف أغلب الـPRs. الحكم على الفرق للمراجعة.

### `tools/lint.js`
| المقياس | النطاق | النمط |
|---|---|---|
| `hexColors` | `css/**` (عدا `tokens.css`)، و`js/features|ui|core/**` | `#[0-9a-fA-F]{3,8}\b` |
| `emoji` | `index.html`، و`js/**` (عدا `generated/`) | نطاقات Unicode للإيموجي |
| `inlineStyles` | `index.html` | `style="` |
| `numberNoun` | `js/**` | `\$\{…\}\s*(نقطة|مراكز|…)` (قائمة المعجم) |
| `rawDates` | `js/**` عدا ملف `formatDate` | `toLocale(Date)?String\(` |
| `forbiddenTerms` | النصوص داخل `js/**` و`index.html` | الممنوعات في `glossary.md` (المتسابق، اللاعب…) |
| `importants` | `css/**` | `!important` |

- خط الأساس في `lint-baseline.json`. **أي زيادة = فشل**.
- `--update-baseline` يسمح **بالتخفيض فقط**، فيتسجّل التحسن ويُمنع التراجع.

### `.github/workflows/verify.yml`
```yaml
on: [pull_request]
jobs:
  verify:                      # ← اسم الفحص الإلزامي في حماية main
    steps:
      - checkout (fetch-depth: 0)
      - setup-node 20 + npm ci + npx playwright install --with-deps chromium
      - node tests/run.js
      - node tools/lint.js
      - node tools/snap.js --label head
      - git worktree add ../base origin/${{ github.base_ref }}
      - node tools/snap.js --root ../base --label base   # أدوات الـPR على كود الأساس
      - node tools/snap-diff.js snapshots/base snapshots/head
      - upload-artifact: snapshots + diff
      - cat diff/summary.md >> $GITHUB_STEP_SUMMARY
```

### إصلاح الستوري (F-04)
```js
// js/ui/card-layout.js
function computeStoryLayout({n, H=1920, contentTop, footerTop=H-170, topN=6, bottomN=3,
                             maxRowH=150, minRowH=96, gapBlocks}){ … }
// → {rowH, topN, bottomN, skipped, rows:[{rank, y}], bottomTitleY}
// rowH = min(maxRowH, (footerTop - contentTop - gapBlocks) / (topN + bottomN))
// وإذا نزل rowH تحت minRowH: نقلل topN إلى 5 ثم 4 (لا نصغّر الخط أكثر من اللازم)
```
`buildStandingsStoryCanvas` تستخدمها، وتصغّر أحجام الخطوط بنسبة `rowH/150`.

### إصلاح الشهادة (F-05)
- `validateCertificateData()` ترجع قائمة نواقص: بطل غير محدد، أو اسم فارغ، أو بطل غير موجود في المشاركين.
- `showChampionCertificate()`: لو فيه نواقص تعرض رسالة للمنظّم وما ترسم كانفس.
- التاريخ: `toLocaleDateString('ar', {day:'numeric', month:'long', year:'numeric', numberingSystem:'latn'})`. حل مؤقت، ويُستبدل بـ`formatDate` من 002.

### `league.html` (F-06)
```html
<!doctype html><meta charset="utf-8"><title>دوري بروكي الفانتازي</title>
<link rel="canonical" href="./index.html">
<meta http-equiv="refresh" content="0; url=./index.html">
<script>location.replace('./index.html' + location.search + location.hash);</script>
<a href="./index.html">انتقل إلى دوري بروكي الفانتازي</a>
```

## 4. المخاطر
| الخطر | التخفيف |
|---|---|
| المحاكاة الوهمية تفوّت سلوك حقيقي لـFirebase | تقرير snap يسجّل كل دالة غير مدعومة، والمحاكاة تكبر حسب الحاجة. وبيانات الموقع الحي ما تتأثر أصلًا |
| النسخة الاحتياطية تقدم مع الوقت | `make-fixture.js` يحدّثها بأمر واحد، والمنظّم يصدّر نسخة كل فترة |
| ملفات اللقطات كبيرة | `snapshots/` في `.gitignore`، وتعيش كـartifacts في CI فقط |
| الخط المحلي يغيّر شكل الموقع قليلًا | نفس الخط ونفس الأوزان، لكن الفرق يظهر في أول diff ويُعتمد مرة وحدة |
