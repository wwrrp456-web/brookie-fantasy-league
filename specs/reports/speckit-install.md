# تقرير تركيب Spec Kit (S5 / R-12)
**المنفّذ:** Sonnet · **الفرع:** `feat/speckit-install` · **PR:** #16 · **الحالة:** منجز (بانتظار حكم Opus)

## وش سويت
ركّبت `specify-cli` **v1.4.0** من المصدر الرسمي `github/spec-kit` (الوسم `v1.4.0`)، جرّبت `specify init` في نسخ مؤقتة خارج الريبو، ثم طبّقته على الريبو بتكامل **Claude Code** فقط. أُضيف **29 ملفًا جديدًا** (`.specify/` و`.claude/skills/`)، **ولم يتغيّر أي ملف موجود**: `specs/` و`AGENTS.md` والكود كلها كما هي (`git diff` فاضي، وما انُشئ `CLAUDE.md`).

## الأدلة

### الإصدار والأوامر حرفيًا
```
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.4.0
specify version                       # CLI Version 1.4.0
specify init --help
# تجربة 1 (مجلد مؤقت خارج الريبو، git init):
specify init --here --force --non-interactive --ignore-agent-tools --integration claude
# تجربة 2 (مجلد مؤقت آخر):
specify init --here --force --non-interactive --ignore-agent-tools --integration codex --integration-options="--skills"
# تجربة 3 (نسخة clone من الريبو، للتأكد إنه ما يعدّل شي موجود): نفس أمر Claude
# التطبيق الفعلي على الريبو (فرع feat/speckit-install):
specify init --here --force --non-interactive --ignore-agent-tools --integration claude
specify check
node tests/run.js
```
- ما شغّلت أي `/speckit-*`، التركيب فقط.
- `--non-interactive` لأن الجلسة بدون TTY، و`--ignore-agent-tools` لأن أداة Claude CLI غير مركّبة هنا (الفحص `specify check` يقول Claude Code available).
- الأداة تعمل بدون شبكة وقت `init` (القوالب مضمّنة في الحزمة).

### قائمة أوامر Spec Kit المتاحة فعليًا (9، كلها Skills في `.claude/skills/`)
`/speckit-constitution` · `/speckit-specify` · `/speckit-plan` · `/speckit-tasks` · `/speckit-implement` · `/speckit-converge` (جديد: يقيّم الكود ويضيف مهام متبقية) · `/speckit-clarify` · `/speckit-analyze` · `/speckit-checklist`

### شجرة الملفات المضافة (29)
```
.claude/skills/speckit-{analyze,checklist,clarify,constitution,converge,implement,plan,specify,tasks}/SKILL.md   (9)
.specify/.gitignore
.specify/init-options.json            (speckit_version 1.4.0، integration claude، script sh)
.specify/integration.json
.specify/integrations/claude.manifest.json
.specify/integrations/speckit.manifest.json
.specify/memory/.constitution-template.json
.specify/memory/constitution.md       (قالب Spec Kit الافتراضي، لم يُنقل دستورنا)
.specify/scripts/bash/{check-prerequisites,common,create-new-feature,resolve-template,setup-plan,setup-tasks}.sh   (6)
.specify/templates/{checklist,constitution,plan,spec,tasks}-template.md   (5)
.specify/workflows/speckit/workflow.yml
.specify/workflows/workflow-registry.json
```
الحجم: `.specify/` 184KB و`.claude/skills/` ≈ 196KB (مع الملفين الموجودين أصلًا `launch.json` و`static-server.js`).
نفس الأمر على مجلد Codex المؤقت يعطي 29 ملفًا أيضًا، لكن الـskills في `.agents/skills/` بدل `.claude/skills/`.

### `node tests/run.js`
**24 ✅ / 0 ❌**.

## أجوبة الأسئلة الخمسة (القسم 5)، من الكود والتوثيق الفعلي لـv1.4.0

1. **مجلد الميزات:** `specs/<NNN-اسم>/` في جذر الريبو (`SPECS_DIR="$REPO_ROOT/specs"` في `create-new-feature.sh`، وSKILL الخاص بـspecify يقول "Specs live under the default `specs/`"). **نبقي `specs/` كما هو، بدون أي نقل.** وتقدر تغيّره لأي مسار بـ`SPECIFY_FEATURE_DIRECTORY`. الترقيم التسلسلي يمسح `specs/` ويأخذ أعلى رقم + 1، فأول ميزة جديدة تطلع `004-…` (عندنا 000–003).
2. **الربط باسم الفرع:** **لا.** في v1.4.0 الميزة تتحدد بـ`SPECIFY_FEATURE_DIRECTORY` (متغير بيئة) أو بملف `.specify/feature.json` (`feature_directory`، وهو مُدرج في `.specify/.gitignore` أي حالة محلية). `SPECIFY_FEATURE` يحدد "اسم الفرع" فقط، و`create-new-feature.sh` **ما يسوي `git checkout` ولا ينشئ فرعًا**. فيمكن تمامًا نستعمل فروع المهام (`feat/000-T01-…`) وفرع التكامل، ونحدد الميزة يدويًا بـ`SPECIFY_FEATURE_DIRECTORY=specs/000-foundation`. تنبيه: الأسماء الموجودة (`000-foundation`) تتبع نمط `NNN-اسم` فتنقرأ سليمة.
3. **Codex:** **نعم مدعوم.** `--integration codex --integration-options="--skills"` يركّب الـskills في `.agents/skills/` وتُستدعى بـ`$speckit-*` (مو `/speckit-*`). لكن الملفات المشتركة في `.specify/` (سكربتات `common.sh` و`check-prerequisites.sh` و`setup-tasks.sh` وقوالب `plan` و`tasks` و`checklist`) **تختلف بين التكاملين** (نص تلميح الاستدعاء)، وتركيب الاثنين معًا يعتمد على `specify integration install` (يدعم `installed_integrations` متعددة). **ما ركّبت Codex على الريبو**: دور Codex رسومات فقط وأوامره في `codex-briefs.md`، وهو ما يشغّل أوامر Spec Kit. قرار إضافته للمنظّم/Opus.
4. **`AGENTS.md` و`CLAUDE.md`:** `specify init` **ما يعدّل `AGENTS.md` ولا ينشئ `CLAUDE.md`** (تأكدت في ثلاث تجارب، منها نسخة من الريبو بـ`AGENTS.md` موجود: `git diff` فاضي). فما احتجنا أي دمج أو فاصل.
5. **الإصدار:** **`1.4.0`** (وسم `v1.4.0`، الـcommit `0019fa14d12f45edabc2cc3176c9168a68bd0f97`). مسجّل في `.specify/init-options.json` و`integration.json`. نثبّته عليه، وأي ترقية لاحقة بـ`specify integration upgrade`.

## قرارات اتخذتها خارج الأمر وليش
- **Claude فقط على الريبو** (مو Codex) لسبب السؤال 3: ما أبي أخلط ملفات `.specify/` المشتركة قبل قرار.
- `--force` لأن الريبو فيه ملفات (الأداة تسأل تأكيد). تحققت قبلها على نسخة clone إنه ما يغيّر أي ملف موجود.
- `constitution.md` الافتراضي (قالب بـ`[PROJECT_NAME]`) في `.specify/memory/`، ودستورنا في `specs/constitution.md` ما انمسّ (النقل لـOpus O1).
- التثبيت العام `uv tool install` (خارج الريبو، في بيئة الجلسة) وما أضفت أي ملف تبعيات للريبو.

## أسئلة للمنظّم أو Opus
- هل نضيف تكامل Codex (`.agents/skills/`) أم يكفي Claude؟
- `.claude/skills/speckit-*` (196KB) تُرفع للريبو العام. هل نبقيها مرفوعة (تفيد أي جلسة Claude Code) أم نضيفها لـ`.gitignore`؟ الأداة تنبّه إن مجلد الوكيل قد يحوي بيانات حساسة (`.claude/` عندنا فيه فقط `launch.json` و`static-server.js` الموجودين أصلًا).

---
## حكم Opus
