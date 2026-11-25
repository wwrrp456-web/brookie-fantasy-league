# جرد إيموجي الواجهة وخريطة الاستبدال بأيقونات الهوية (001-T011a / S56)

> مولَّد من فحص آلي لنصوص `index.html` و`report.html` و`js/**` (عدا `js/generated/` و`js/voice/`) و`css/**`، بعد حذف التعليقات، بنفس قاعدة `tools/lint.js`. الأصل: 475 موضعًا لإيموجي (114 إيموجي مميَّز). المرجع: مكتبة الهوية **56 أيقونة** في `assets/icons/` و`ICONS`.

## 1. الخلاصة
| | المواضع |
|---|---|
| إجمالي ما وُجد | 475 |
| **مستثنى (محتوى/مشاركة)** | 15 (محتوى يكتبه الأعضاء: 9، ونص مشاركة الواتساب: 6) |
| **داخل نطاق الاستبدال** | **460** |
| ↳ **لها أيقونة موجودة** | **379** (82%) |
| ↳ **ناقصة (تحتاج أيقونة من Codex)** | **75** (40 أيقونة مميَّزة) |
| ↳ **تُحذف** (وجه تعبيري بنص مزاح) | 6 |

الميداليات 🥇🥈🥉 **غير موجودة** أصلًا بالواجهة (صارت صورًا ثابتة، R-23)، فلا مستثنيات منها هنا.

## 2. ما استثنيته (لا يُستبدل)
- **محتوى يكتبه الأعضاء:** لوحة تفاعلات الاسم وجدار الجولة (`NAME_REACTIONS` و`WALL_REACTIONS`: 🔥 😂 💀 👑، وإيموجي بديل التفاعل): هذي قيم يختارها الأعضاء ويُخزَّنها Firebase، وتبقى إيموجي (الدستور 10).
- **نص مشاركة الواتساب:** `buildMyRankShareText` بـ`my-dashboard.js` (🏆 💪 🔼 🔽): نص يُنسخ/يُرسل ولا يحمل صورًا (R-24). *(ملاحظة للمراجع: R-24 يقرر أن نص الواتساب يخلو من إيموجي عدا الميداليات؛ هذه الدالة ما زالت فيها 6 مواضع، فتحتاج مهمة لغة منفصلة لو تبيها تنظيفًا.)*
- ملفات `js/voice/` و`js/generated/`، والتعليقات.

## 3. الجدول الكامل (لكل إيموجي مميَّز، داخل النطاق)
| الإيموجي | المواضع | الملفات (الأكثر) | الأيقونة المقابلة | الحالة | الأولوية |
|---|---|---|---|---|---|
| ✅ | 50 | admin-auth-settings.js×21، admin-round-form.js×4، index.html×3، admin-community-reports.js×3، report.html×2، admin-season-lock.js×2، round-poll.js×2، rounds-tab.js×2، season-duel.js×2، standings-table.js×2، report/report-main.js×2، core/dom-utils.js×1، participants-tab.js×1، stats-tab.js×1، sub-groups.js×1، whats-new-card.js×1 | `check` | ✅ موجودة | عالية |
| ⚔ | 17 | admin-community-reports.js×3، season-duel.js×3، stats-tab.js×3، index.html×2، admin-auth-settings.js×2، rounds-tab.js×1، rules-and-about.js×1، standings-widgets.js×1، report/report-main.js×1 | `swords` | ✅ موجودة | عالية |
| 🏆 | 17 | index.html×4، my-dashboard.js×2، rules-and-about.js×2، report.html×1، admin-auth-settings.js×1، admin-season-lock.js×1، champion-honor.js×1، participants-tab.js×1، personal-status-bar.js×1، rounds-tab.js×1، season-duel.js×1، ui/export-tools.js×1 | `trophy` | ✅ موجودة | عالية |
| 📋 | 15 | index.html×6، admin-auth-settings.js×3، admin-community-reports.js×2، report.html×1، participant-profile.js×1، participants-tab.js×1، rules-and-about.js×1 | `clipboard` | ✅ موجودة | عالية |
| 🔥 | 15 | index.html×3، admin-auth-settings.js×2، participants-tab.js×2، rounds-tab.js×2، standings-widgets.js×2، core/insights-engine.js×1، champion-honor.js×1، hot-cold-streaks.js×1، my-dashboard.js×1 | `flame` | ✅ موجودة | عالية |
| ⬇ | 14 | index.html×10، admin-round-form.js×1، participant-profile.js×1، round-story-card.js×1، stats-tab.js×1 | `download` | ✅ موجودة | عالية |
| 👑 | 14 | standings-widgets.js×4، index.html×3، champion-honor.js×1، live-focus-mode.js×1، my-dashboard.js×1، rounds-tab.js×1، rules-and-about.js×1، stats-tab.js×1، whats-new-card.js×1 | `crown` | ✅ موجودة | عالية |
| 🗳 | 12 | index.html×5، admin-auth-settings.js×4، notification-center.js×1، round-poll.js×1، rounds-tab.js×1 | `poll` | ✅ موجودة | عالية |
| ⚠ | 11 | admin-community-reports.js×3، index.html×2، core/dom-utils.js×1، core/storage.js×1، admin-round-form.js×1، champion-honor.js×1، rounds-tab.js×1، rules-and-about.js×1 | `warning` | ✅ موجودة | عالية |
| 🏅 | 11 | index.html×3، standings-widgets.js×3، admin-auth-settings.js×2، champion-honor.js×1، participant-profile.js×1، ui/export-tools.js×1 | `medal` | ✅ موجودة | عالية |
| 📊 | 10 | index.html×2، club-swap-lab.js×1، my-dashboard.js×1، rounds-tab.js×1، rules-and-about.js×1، standings-table.js×1، stats-tab.js×1، whats-new-card.js×1، ui/export-tools.js×1 | `chart-bar` | ✅ موجودة | عالية |
| 🔒 | 9 | index.html×3، admin-season-lock.js×1، round-poll.js×1، round-wall.js×1، rounds-tab.js×1، season-duel.js×1، stats-tab.js×1 | `lock` | ✅ موجودة | عالية |
| 🗑 | 9 | admin-round-form.js×3، admin-community-reports.js×2، admin-champion-admin.js×1، admin-season-lock.js×1، round-wall.js×1، sub-groups.js×1 | `trash` | ✅ موجودة | عالية |
| 🥊 | 9 | season-duel.js×3، index.html×2، admin-auth-settings.js×2، notification-center.js×1، participant-profile.js×1 | `swords` | ✅ موجودة | عالية |
| 💀 | 8 | rules-and-about.js×3، core/insights-engine.js×1، participants-tab.js×1، rounds-tab.js×1، standings-widgets.js×1، stats-tab.js×1 | `skull-zero` | ✅ موجودة | عالية |
| 🔮 | 8 | my-dashboard.js×3، index.html×2، admin-auth-settings.js×2، rules-and-about.js×1 | `crystal-ball` | ✅ موجودة | عالية |
| 🧱 | 7 | index.html×2، admin-auth-settings.js×2، core/insights-engine.js×1، round-wall.js×1، standings-table.js×1 | `wall` | ✅ موجودة | متوسطة |
| 🛡 | 7 | champion-honor.js×3، index.html×2، core/insights-engine.js×1، rules-and-about.js×1 | `shield` | ✅ موجودة | متوسطة |
| ⚽ | 6 | index.html×1، admin-auth-settings.js×1، my-dashboard.js×1، rules-and-about.js×1، stats-tab.js×1، css/rounds-tab.css×1 | `ball` | ✅ موجودة | متوسطة |
| 🎁 | 6 | index.html×2، admin-auth-settings.js×2، notification-center.js×1، whats-new-card.js×1 | `gift` | ✅ موجودة | متوسطة |
| 🎯 | 6 | standings-widgets.js×2، index.html×1، report.html×1، my-dashboard.js×1، standings-table.js×1 | `target` | ✅ موجودة | متوسطة |
| 🔄 | 6 | index.html×3، standings-table.js×2، core/storage.js×1 | `refresh` | ✅ موجودة | متوسطة |
| 🔬 | 6 | index.html×2، admin-auth-settings.js×2، club-swap-lab.js×2 | — | ⬜ ناقصة: مجهر أو دورق مختبر (مختبر تبديل الأندية) | متوسطة |
| 🔴 | 6 | index.html×4، admin-auth-settings.js×2 | `live` | ✅ موجودة | متوسطة |
| ↩ | 5 | admin-auth-settings.js×3، index.html×1، admin-round-form.js×1 | — | ⬜ ناقصة: سهم رجوع/تراجع (undo) | متوسطة |
| 🎉 | 5 | badge-toast.js×2، index.html×1، my-dashboard.js×1، standings-table.js×1 | `sparkles` | ✅ موجودة | متوسطة |
| 🎙 | 5 | index.html×2، admin-auth-settings.js×2، round-story-card.js×1 | `mic` | ✅ موجودة | متوسطة |
| 👥 | 5 | index.html×2، admin-auth-settings.js×2، sub-groups.js×1 | `users` | ✅ موجودة | متوسطة |
| 💾 | 5 | index.html×2، admin-community-reports.js×2، admin-round-form.js×1 | `save` | ✅ موجودة | متوسطة |
| 📉 | 5 | club-swap-lab.js×1، my-dashboard.js×1، standings-table.js×1، stats-tab.js×1، whats-new-card.js×1 | `trend-down` | ✅ موجودة | متوسطة |
| ⏳ | 4 | core/storage.js×1، season-duel.js×1، standings-table.js×1، whats-new-card.js×1 | `clock` | ✅ موجودة | متوسطة |
| ⚡ | 4 | core/insights-engine.js×1، participants-tab.js×1، rounds-tab.js×1، standings-widgets.js×1 | `bolt` | ✅ موجودة | متوسطة |
| ➕ | 4 | index.html×4 | `plus` | ✅ موجودة | متوسطة |
| ⬆ | 4 | index.html×2، core/insights-engine.js×1، admin-round-form.js×1 | `arrow-up` | ✅ موجودة | متوسطة |
| 🎖 | 4 | index.html×1، champion-honor.js×1، notification-center.js×1، standings-widgets.js×1 | `medal` | ✅ موجودة | متوسطة |
| 🎞 | 4 | index.html×2، admin-auth-settings.js×2 | — | ⬜ ناقصة: شريط فيلم/حركة | متوسطة |
| 👏 | 4 | index.html×2، admin-auth-settings.js×2 | — | ⬜ ناقصة: تصفيق | متوسطة |
| 💪 | 4 | core/insights-engine.js×1، my-dashboard.js×1، standings-table.js×1، standings-widgets.js×1 | — | ⬜ ناقصة: عضلة (قوة) | متوسطة |
| 📈 | 4 | core/insights-engine.js×1، club-swap-lab.js×1، standings-table.js×1، whats-new-card.js×1 | `trend-up` | ✅ موجودة | متوسطة |
| 📌 | 4 | index.html×2، admin-auth-settings.js×2 | — | ⬜ ناقصة: دبوس | متوسطة |
| 📤 | 4 | index.html×1، my-dashboard.js×1، rules-and-about.js×1، standings-table.js×1 | `share` | ✅ موجودة | متوسطة |
| 🔗 | 4 | index.html×2، admin-round-form.js×1، rules-and-about.js×1 | `link` | ✅ موجودة | متوسطة |
| ⏰ | 3 | rounds-tab.js×2، index.html×1 | `clock` | ✅ موجودة | متوسطة |
| ❌ | 3 | season-duel.js×2، stats-tab.js×1 | `close` | ✅ موجودة | متوسطة |
| 🏛 | 3 | index.html×2، champion-honor.js×1 | — | ⬜ ناقصة: مبنى عمدة/أرشيف الأبطال | متوسطة |
| 👁 | 3 | index.html×2، admin-auth-settings.js×1 | — | ⬜ ناقصة: عين (إظهار/رؤية) | متوسطة |
| 📅 | 3 | index.html×1، admin-round-form.js×1، ui/export-tools.js×1 | `calendar` | ✅ موجودة | متوسطة |
| 📖 | 3 | rules-and-about.js×2، index.html×1 | — | ⬜ ناقصة: كتاب مفتوح | متوسطة |
| 🧊 | 3 | core/insights-engine.js×1، rules-and-about.js×1، stats-tab.js×1 | `snowflake` | ✅ موجودة | متوسطة |
| 🚀 | 3 | core/insights-engine.js×1، standings-widgets.js×1، stats-tab.js×1 | `rocket` | ✅ موجودة | متوسطة |
| ⏸ | 2 | admin-round-form.js×1، rounds-tab.js×1 | — | ⬜ ناقصة: إيقاف مؤقت | منخفضة |
| ☁ | 2 | admin-round-form.js×2 | — | ⬜ ناقصة: سحابة (حفظ سحابي) | منخفضة |
| ⚙ | 2 | index.html×2 | `settings` | ✅ موجودة | منخفضة |
| ✏ | 2 | admin-community-reports.js×1، admin-round-form.js×1 | `edit` | ✅ موجودة | منخفضة |
| ❄ | 2 | index.html×1، hot-cold-streaks.js×1 | `snowflake` | ✅ موجودة | منخفضة |
| 🌍 | 2 | admin-community-reports.js×1، stats-tab.js×1 | — | ⬜ ناقصة: كرة أرضية (خصم خارجي) | منخفضة |
| 🎲 | 2 | rounds-tab.js×1، stats-tab.js×1 | — | ⬜ ناقصة: نرد (محاكاة) | منخفضة |
| 🏁 | 2 | rounds-tab.js×1، rules-and-about.js×1 | — | ⬜ ناقصة: علم سباق (خط النهاية) | منخفضة |
| 🏴 | 2 | stats-tab.js×2 | — | ⬜ ناقصة: علم (نادٍ خارجي) | منخفضة |
| 👋 | 2 | index.html×2 | — | ⬜ ناقصة: يد تلوّح (ترحيب) | منخفضة |
| 💥 | 2 | core/insights-engine.js×1، stats-tab.js×1 | `sparkles` | ✅ موجودة | منخفضة |
| 🔓 | 2 | index.html×2 | `unlock` | ✅ موجودة | منخفضة |
| 🔼 | 2 | my-dashboard.js×1، standings-table.js×1 | `arrow-up` | ✅ موجودة | منخفضة |
| 🔽 | 2 | my-dashboard.js×1، standings-table.js×1 | `arrow-down` | ✅ موجودة | منخفضة |
| 🗓 | 2 | index.html×1، rules-and-about.js×1 | `calendar` | ✅ موجودة | منخفضة |
| 🚫 | 2 | season-duel.js×2 | — | ⬜ ناقصة: ممنوع/إلغاء | منخفضة |
| ▶ | 1 | stats-tab.js×1 | — | ⬜ ناقصة: تشغيل (play) | منخفضة |
| ☠ | 1 | stats-tab.js×1 | `skull-zero` | ✅ موجودة | منخفضة |
| ✍ | 1 | report/report-main.js×1 | `edit` | ✅ موجودة | منخفضة |
| ✖ | 1 | live-focus-mode.js×1 | `close` | ✅ موجودة | منخفضة |
| ❓ | 1 | index.html×1 | `info` | ✅ موجودة | منخفضة |
| ➡ | 1 | standings-table.js×1 | — | ⬜ ناقصة: سهم أفقي (ثبات) | منخفضة |
| ⭐ | 1 | my-dashboard.js×1 | `sparkles` | ✅ موجودة | منخفضة |
| 🌊 | 1 | standings-table.js×1 | — | ⬜ ناقصة: موجة | منخفضة |
| 🌙 | 1 | rounds-tab.js×1 | `moon` | ✅ موجودة | منخفضة |
| 🌟 | 1 | rules-and-about.js×1 | `sparkles` | ✅ موجودة | منخفضة |
| 🌪 | 1 | standings-table.js×1 | — | ⬜ ناقصة: إعصار (فوضى المراكز) | منخفضة |
| 🎢 | 1 | standings-table.js×1 | — | ⬜ ناقصة: قطار الملاهي (تذبذب المراكز) | منخفضة |
| 🎪 | 1 | standings-widgets.js×1 | — | ⬜ ناقصة: خيمة السيرك (كرنفال) | منخفضة |
| 🏎 | 1 | stats-tab.js×1 | — | ⬜ ناقصة: سيارة سباق (سباق الترتيب) | منخفضة |
| 💬 | 1 | rounds-tab.js×1 | `comment` | ✅ موجودة | منخفضة |
| 📝 | 1 | report.html×1 | `edit` | ✅ موجودة | منخفضة |
| 📣 | 1 | index.html×1 | — | ⬜ ناقصة: مكبّر صوت (إعلان) | منخفضة |
| 📥 | 1 | index.html×1 | `download` | ✅ موجودة | منخفضة |
| 📱 | 1 | index.html×1 | — | ⬜ ناقصة: جوال | منخفضة |
| 📲 | 1 | ui/export-tools.js×1 | `share` | ✅ موجودة | منخفضة |
| 🔁 | 1 | standings-widgets.js×1 | `refresh` | ✅ موجودة | منخفضة |
| 🔍 | 1 | index.html×1 | `search` | ✅ موجودة | منخفضة |
| 🔑 | 1 | index.html×1 | — | ⬜ ناقصة: مفتاح (رمز الدخول) | منخفضة |
| 🔕 | 1 | notification-center.js×1 | — | ⬜ ناقصة: جرس مكتوم | منخفضة |
| 🔤 | 1 | participants-tab.js×1 | — | ⬜ ناقصة: ترتيب أبجدي (أ-ي) | منخفضة |
| 🔻 | 1 | standings-widgets.js×1 | `arrow-down` | ✅ موجودة | منخفضة |
| 🕒 | 1 | admin-round-form.js×1 | `clock` | ✅ موجودة | منخفضة |
| 🕸 | 1 | stats-tab.js×1 | — | ⬜ ناقصة: رادار/شبكة عنكبوت | منخفضة |
| 🖨 | 1 | index.html×1 | — | ⬜ ناقصة: طابعة | منخفضة |
| 🗄 | 1 | champion-honor.js×1 | — | ⬜ ناقصة: خزانة ملفات/أرشيف | منخفضة |
| 🗺 | 1 | stats-tab.js×1 | — | ⬜ ناقصة: خريطة (خريطة الأندية) | منخفضة |
| 🤝 | 1 | season-duel.js×1 | — | ⬜ ناقصة: مصافحة (مواجهة ودية) | منخفضة |
| 🥅 | 1 | core/insights-engine.js×1 | — | ⬜ ناقصة: مرمى | منخفضة |
| 🧠 | 1 | standings-table.js×1 | — | ⬜ ناقصة: دماغ (التحليل الذكي) | منخفضة |
| 🧮 | 1 | stats-tab.js×1 | — | ⬜ ناقصة: آلة حاسبة (ماذا لو) | منخفضة |
| 🧾 | 1 | index.html×1 | `certificate` | ✅ موجودة | منخفضة |
| 😅 | 1 | round-wall.js×1 | — | 🗑 وجه تعبيري داخل نص مزاح: يُحذف | منخفضة |
| 😎 | 1 | standings-widgets.js×1 | — | 🗑 وجه تعبيري داخل نص مزاح: يُحذف | منخفضة |
| 😓 | 1 | my-dashboard.js×1 | — | 🗑 وجه تعبيري داخل نص مزاح: يُحذف | منخفضة |
| 😤 | 1 | standings-widgets.js×1 | — | 🗑 وجه تعبيري داخل نص مزاح: يُحذف | منخفضة |
| 🙈 | 1 | admin-auth-settings.js×1 | — | 🗑 وجه تعبيري داخل نص مزاح: يُحذف | منخفضة |
| 🙏 | 1 | admin-auth-settings.js×1 | — | 🗑 وجه/يد دعاء داخل نص مزاح: يُحذف أو يُستبدل بكلمة | منخفضة |
| 🚨 | 1 | index.html×1 | `warning` | ✅ موجودة | منخفضة |
| 🛌 | 1 | standings-widgets.js×1 | — | ⬜ ناقصة: سرير (خامل) | منخفضة |
| 🟡 | 1 | index.html×1 | — | ⬜ ناقصة: نقطة حالة صفراء (تُستبدل بنقطة CSS، لا أيقونة) | منخفضة |
| 🟢 | 1 | index.html×1 | — | ⬜ ناقصة: نقطة حالة خضراء (تُستبدل بنقطة CSS، لا أيقونة) | منخفضة |
| 🆕 | 1 | index.html×1 | `sparkles` | ✅ موجودة | منخفضة |

## 4. قائمة الأيقونات الناقصة (لـCodex، مرتَّبة بالتكرار)
1. 🔬 **مجهر أو دورق مختبر (مختبر تبديل الأندية)** — 6 مواضع (index.html×2، admin-auth-settings.js×2، club-swap-lab.js×2)
2. ↩ **سهم رجوع/تراجع (undo)** — 5 مواضع (admin-auth-settings.js×3، index.html×1، admin-round-form.js×1)
3. 🎞 **شريط فيلم/حركة** — 4 مواضع (index.html×2، admin-auth-settings.js×2)
4. 👏 **تصفيق** — 4 مواضع (index.html×2، admin-auth-settings.js×2)
5. 💪 **عضلة (قوة)** — 4 مواضع (core/insights-engine.js×1، my-dashboard.js×1، standings-table.js×1، standings-widgets.js×1)
6. 📌 **دبوس** — 4 مواضع (index.html×2، admin-auth-settings.js×2)
7. 🏛 **مبنى عمدة/أرشيف الأبطال** — 3 مواضع (index.html×2، champion-honor.js×1)
8. 👁 **عين (إظهار/رؤية)** — 3 مواضع (index.html×2، admin-auth-settings.js×1)
9. 📖 **كتاب مفتوح** — 3 مواضع (rules-and-about.js×2، index.html×1)
10. ⏸ **إيقاف مؤقت** — موضعان (admin-round-form.js×1، rounds-tab.js×1)
11. ☁ **سحابة (حفظ سحابي)** — موضعان (admin-round-form.js×2)
12. 🌍 **كرة أرضية (خصم خارجي)** — موضعان (admin-community-reports.js×1، stats-tab.js×1)
13. 🎲 **نرد (محاكاة)** — موضعان (rounds-tab.js×1، stats-tab.js×1)
14. 🏁 **علم سباق (خط النهاية)** — موضعان (rounds-tab.js×1، rules-and-about.js×1)
15. 🏴 **علم (نادٍ خارجي)** — موضعان (stats-tab.js×2)
16. 👋 **يد تلوّح (ترحيب)** — موضعان (index.html×2)
17. 🚫 **ممنوع/إلغاء** — موضعان (season-duel.js×2)
18. ▶ **تشغيل (play)** — موضع واحد (stats-tab.js×1)
19. ➡ **سهم أفقي (ثبات)** — موضع واحد (standings-table.js×1)
20. 🌊 **موجة** — موضع واحد (standings-table.js×1)
21. 🌪 **إعصار (فوضى المراكز)** — موضع واحد (standings-table.js×1)
22. 🎢 **قطار الملاهي (تذبذب المراكز)** — موضع واحد (standings-table.js×1)
23. 🎪 **خيمة السيرك (كرنفال)** — موضع واحد (standings-widgets.js×1)
24. 🏎 **سيارة سباق (سباق الترتيب)** — موضع واحد (stats-tab.js×1)
25. 📣 **مكبّر صوت (إعلان)** — موضع واحد (index.html×1)
26. 📱 **جوال** — موضع واحد (index.html×1)
27. 🔑 **مفتاح (رمز الدخول)** — موضع واحد (index.html×1)
28. 🔕 **جرس مكتوم** — موضع واحد (notification-center.js×1)
29. 🔤 **ترتيب أبجدي (أ-ي)** — موضع واحد (participants-tab.js×1)
30. 🕸 **رادار/شبكة عنكبوت** — موضع واحد (stats-tab.js×1)
31. 🖨 **طابعة** — موضع واحد (index.html×1)
32. 🗄 **خزانة ملفات/أرشيف** — موضع واحد (champion-honor.js×1)
33. 🗺 **خريطة (خريطة الأندية)** — موضع واحد (stats-tab.js×1)
34. 🤝 **مصافحة (مواجهة ودية)** — موضع واحد (season-duel.js×1)
35. 🥅 **مرمى** — موضع واحد (core/insights-engine.js×1)
36. 🧠 **دماغ (التحليل الذكي)** — موضع واحد (standings-table.js×1)
37. 🧮 **آلة حاسبة (ماذا لو)** — موضع واحد (stats-tab.js×1)
38. 🛌 **سرير (خامل)** — موضع واحد (standings-widgets.js×1)
39. 🟡 **نقطة حالة صفراء (تُستبدل بنقطة CSS، لا أيقونة)** — موضع واحد (index.html×1)
40. 🟢 **نقطة حالة خضراء (تُستبدل بنقطة CSS، لا أيقونة)** — موضع واحد (index.html×1)

> المواضع المذكورة تتضمن `index.html`. الأيقونة بأسلوب مكتبة الهوية (viewBox 24، `stroke 1.75`، `currentColor`). الأولوية العليا (≥3 مواضع) أولًا.

## 5. التوزيع على مناطق الاستبدال (لأوامر S57–S60)
| المنطقة | إجمالي المواضع | بأيقونة موجودة | ناقصة | تُحذف |
|---|---|---|---|---|
| index.html (يتوزّع على كل المناطق) | 118 | 96 | 22 | 0 |
| الصفحة الأولى والتبويبات الرئيسية (الترتيب، حالتي، المشاركون، الإشعارات…) | 99 | 82 | 14 | 3 |
| المنظّم وصفحة الإبلاغ | 116 | 97 | 17 | 2 |
| الإحصائيات والجولات والقواعد والمواجهات | 117 | 94 | 22 | 1 |
| أدوات مشتركة (core وui) | 10 | 10 | 0 | 0 |

أكبر الملفات داخل كل منطقة:
- **index.html (يتوزّع على كل المناطق):** index.html×118
- **الصفحة الأولى والتبويبات الرئيسية (الترتيب، حالتي، المشاركون، الإشعارات…):** standings-widgets.js×23، standings-table.js×20، my-dashboard.js×18، champion-honor.js×11، participants-tab.js×8، whats-new-card.js×7
- **المنظّم وصفحة الإبلاغ:** admin-auth-settings.js×64، admin-round-form.js×19، admin-community-reports.js×17، report.html×6، admin-season-lock.js×5، report/report-main.js×4
- **الإحصائيات والجولات والقواعد والمواجهات:** stats-tab.js×25، rules-and-about.js×21، rounds-tab.js×20، season-duel.js×16، core/insights-engine.js×12، club-swap-lab.js×5
- **أدوات مشتركة (core وui):** ui/export-tools.js×5، core/storage.js×3، core/dom-utils.js×2

## 6. قواعد الاستبدال المقترحة
1. الأيقونة بجانب النص بـ`ICONS.<اسم>` (SVG بـ`currentColor`، 16–20px)، بلا إيموجي.
2. مواضع بحالة (🟢 🟡 ✅ ⚠ ❌): أيقونة أو نقطة CSS بلون `--c-up/--c-down/--c-gold` مع نص بديل (`aria-label`)، **لا لون وحده**.
3. نصوص المزاح بوجه تعبيري (😓 😅 😎 😤 🙈 🙏): يُحذف الوجه وتبقى الجملة.
4. الأزرار الحاملة للإيموجي بـ`textContent` تتحول لـ`innerHTML` بأيقونة ونص، ويُراعى `aria-label`.
