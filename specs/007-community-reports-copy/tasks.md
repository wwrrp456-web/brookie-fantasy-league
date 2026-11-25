# المهام: 007 نسخ تقارير الأعضاء إلى نموذج تجهيز الجولة

**الصيغة (Spec Kit):** `- [ ] T### [P?] [المنفّذ] الوصف + الملفات` · `[x]` منجزة ومندمجة
**المرجع:** `spec.md` في نفس المجلد، وقرار **R-29**. الأوامر في `specs/agents/SONNET.md` (S62 وS63).

- [x] T001 [Sonnet] **المحلل (دالة نقية):** 🆕 `js/core/community-reports-analyze.js` (أو داخل `results-import.js` لو الأنسب): `analyzeCommunityReports(reports, {clubs})` ← مجموعات مصنّفة (تكرار متفق، مرآة، مشكوك، تعارض، مفرد) بأسباب عربية، و`buildPasteText(groups, decisions)` ← نص سطر لكل مباراة. + 🆕 اختبارات في `tests/run.js` (≥ 12 حالة، ورحلة ذهاب وعودة مع `parseResults` SC-01)
- [x] T002 [Sonnet] **الواجهة:** في `js/features/admin-community-reports.js` و`index.html` و`css/`: زر «نسخ كل نتائج الأعضاء»، ولوحة القرار (لكل مجموعة: التقارير وسبب التصنيف وخيارا «مكررة/ليست مكررة»، واختيار النتيجة عند التعارض)، وزر النسخ، وزر «الصقه في نموذج التجهيز» (يضع النص في `#pasteImportInput` ويشغّل التحليل)، وتذكّر القرارات محليًا. + 🆕 e2e `tests/e2e/community-copy.e2e.js` على `fake-firebase` (SC-03 إلى SC-05)
