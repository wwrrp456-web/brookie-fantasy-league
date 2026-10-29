# 003: الخطة التقنية

## 1. نموذج الهوية

| من | كيف يدخل | ماذا يملك |
|---|---|---|
| **زائر** | **دخول مجهول تلقائي** (Anonymous Auth، مجاني، صامت بدون أي واجهة) | قراءة فقط |
| **مشارك** | زائر مجهول + **"إثبات" برمزه** يُكتب مرة وحدة في `claims/{uid}` | الكتابة في مساراته |
| **المنظّم** | بريد وكلمة مرور (Email Auth) | كل شي |

### آلية إثبات المشارك (بدون كشف الرمز وبدون خادم)
```
1. المشارك يختار اسمه ويكتب رمزه (نفس الواجهة الحالية "مين أنت؟")
2. المتصفح يكتب:  claims/{auth.uid} = { pid: 7, code: "482913" }
3. القاعدة تتحقق:  newData.child('code').val() === root.child('secrets/codes/' + pid).val()
   ← لو صح: تُقبل الكتابة = الهوية ثابتة لهذا المتصفح
   ← لو غلط: PERMISSION_DENIED = "الرمز غير صحيح"
4. أي كتابة لاحقة باسم المشارك تتحقق:  root.child('claims/' + auth.uid + '/pid').val() === $pid
```
- **`secrets/` لا يقرأه أحد إلا المنظّم**، و**`claims/{uid}` لا يقرأه إلا صاحبه**، فالرمز ما ينكشف أبدًا.
- **تحديد المحاولات:** `claims/{uid}/lastTry` يقبل كتابة جديدة فقط بعد 3 ثوانٍ من آخر محاولة.

## 2. شجرة البيانات بعد الانتقال

```
brookie/
  brookie-fantasy-s2-data        R: الكل   W: المنظّم
  currentChampionId, seasonChampionsArchive, championHonorFeatures, seasonsArchive
                                 R: الكل   W: المنظّم
  predictions/{round}/{pid}      R: الكل   W: المشارك نفسه، والجولة غير مقفلة   ← 🆕 بدل الكتلة
  wall/{round}/{key}             R: الكل   W: إنشاء = مشارك مُثبَت (author = pid)، حذف = الكاتب أو المنظّم
  wall/{round}/{key}/reactions/{emoji}/{pid}   W: المشارك نفسه
  name-reactions/{round}/{pid}   R: الكل   W: المشارك نفسه
  season-duels/{key}             R: الكل   W: إنشاء = مشارك طرف في المواجهة، والتعديل للطرفين أو المنظّم
  community-reports/…/{pid}      R: الكل   W: المشارك نفسه
  visitors/{total,unique}        R: الكل   W: newData = data + 1 فقط
secrets/codes/{pid}              R/W: المنظّم فقط                               ← 🆕
claims/{uid}                     R: صاحبه   W: صاحبه، والقاعدة تتحقق من الرمز   ← 🆕
config/organizerUid              R: الكل   W: لا أحد (يُضبط من اللوحة يدويًا)
```
> `organizer_pin` و`SUPER_ADMIN_CODE` **يُلغيان**. قفل الموسم وتغيير الإعدادات صارت محمية بحساب المنظّم نفسه.

## 3. القواعد (مقتطف من `firebase/database.rules.json`)
```json
{
  "rules": {
    "brookie": {
      ".read": true,
      "brookie-fantasy-s2-data": { ".write": "auth != null && auth.uid === root.child('config/organizerUid').val()" },
      "predictions": { "$round": { "$pid": {
        ".write": "auth != null && root.child('claims/' + auth.uid + '/pid').val() == $pid"
      }}},
      "visitors": { "$k": { ".write": "auth != null",
        ".validate": "newData.isNumber() && newData.val() === (data.exists() ? data.val() : 0) + 1" }}
    },
    "secrets": { ".read": "auth != null && auth.uid === root.child('config/organizerUid').val()",
                 ".write": "auth != null && auth.uid === root.child('config/organizerUid').val()" },
    "claims": { "$uid": {
      ".read": "auth != null && auth.uid === $uid",
      ".write": "auth != null && auth.uid === $uid",
      ".validate": "newData.child('code').val() === root.child('secrets/codes/' + newData.child('pid').val()).val()"
    }}
  }
}
```
القواعد الكاملة تُكتب في T03 مع اختباراتها.

## 4. اختبار القواعد
- **أداة رسمية مجانية:** محاكي Firebase (`firebase-tools`) + `@firebase/rules-unit-testing`، في `tests/rules/` كـdevDependencies.
- **يشتغل في `verify.yml`** (من 000) كخطوة إضافية، والمحاكي يحتاج Java وهي موجودة في GitHub runners.

## 5. تغييرات الكود
| الملف | التغيير |
|---|---|
| `js/core/config.js` | حذف `ADMIN_PIN` و`SUPER_ADMIN_CODE` |
| `js/data/season-2/participants.js`، `admin-season-lock.js` | حذف `PARTICIPANT_CODES` |
| 🆕 `js/core/auth.js` | `ensureAnonymous()` عند الإقلاع، و`claimParticipant(pid, code)`، و`organizerSignIn(email, pass)`، و`isOrganizer()` |
| `js/core/storage.js` | `savePredictions()` يكتب `predictions/{round}/{myPid}` فقط، و`loadPredictions()` يقرأ الشجرة ويبني `PRED_DATA` بنفس الشكل الحالي (فباقي الكود ما يتغير) |
| `admin-auth-settings.js` | شاشة دخول بالبريد بدل الرمز، وقسم "رموز المشاركين" يقرأ ويكتب `secrets/codes` (يولّد رموز 6 أرقام) |
| `my-dashboard.js`، `theme-and-onboarding.js`، `report-main.js` | التحقق من الرمز عبر `claimParticipant` بدل المقارنة المحلية |
| 🆕 `js/core/dom-utils.js` → `escapeHtml` | دالة واحدة، ويُعاد استخدامها في الجدار والتقارير والمواجهات وكل محتوى زائر |

## 6. خطة الانتقال (بدون توقف)
```
المرحلة أ  نشر الكود الجديد مع بقاء القاعدة مفتوحة:
           الكود يدعم Auth والمسارات الجديدة، ويقرأ التوقعات القديمة والجديدة معًا
المرحلة ب  المنظّم: نسخة احتياطية ← إنشاء حسابه ← تفعيل Anonymous وEmail في لوحة Firebase
           ← تشغيل "ترحيل" من لوحة المنظّم (ينسخ التوقعات للشجرة الجديدة،
              ويولّد رموز 6 أرقام في secrets، ويضبط config/organizerUid)
المرحلة ج  لصق القواعد في لوحة Firebase ← نشر
المرحلة د  التحقق (SC-01…05) ← توزيع الرموز الجديدة على الأعضاء
الرجوع     لو صار خلل: لصق القاعدة القديمة المفتوحة (محفوظة في الريبو) يرجّع كل شي فورًا
```
