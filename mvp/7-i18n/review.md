---
id: rb-i18n
feature: 7-i18n
branch: feat/7-i18n
stage: review
status: closed 2026-09-10 — B1-B17 confirmed by the maintainer
created: 2026-09-10
commits: 5dfc47c..051c7b5 (4 on the branch, unpushed)
---

# Review — Languages

Review only: findings and a checklist, no fixes. Approved fixes land on the
branch as `fix(...): ... [rb-i18n]`.

## A. Automated

| Check | Result |
|---|---|
| `npm test` | 296 passed, 19 files (this phase adds 124) |
| `npm run lint` | clean |
| `tsc -b` + `npm run build` | clean, 256 kB JS / 82 kB gzipped, plus 16 language chunks of 2-3 kB |
| `npm run android:build` | release APK, installed and exercised |

## B. Manual checklist

B1-B14 were driven by Claude in laptop Chrome and on the maintainer's phone
over adb. Claude wrote the translations, so B15 and B16 are the ones it cannot
do: no amount of testing tells you whether a sentence reads naturally to
someone who speaks the language.

- [X] **B1** (agent-verified) The picker lists all seventeen, each by its own name in its own script, sorted Latin A to Z and then one block per script: Cebuano … Tiếng Việt, Русский, Українська, Հայերեն, اردو, हिन्दी, বাংলা, ไทย.
- [X] **B2** (agent-verified) Choosing a language changes every string at once, and the choice survives a reload.
- [X] **B3** (agent-verified) A language merely detected from the device is **not** stored, so the app follows the phone until someone chooses otherwise (C1 fix).
- [X] **B4** (agent-verified) Switching three languages in quick succession lands on the last one, with `lang` and the strings agreeing (C3 fix).
- [X] **B5** (agent-verified) `document.documentElement.lang` follows the choice, so a screen reader and the browser's own line-breaking use the right language (C6 fix).
- [X] **B6** (agent-verified) The whole flow in Spanish: `Cargado: after-cold.wav · 6,4 segundos`, Calcular, **1449 rpm**, `75 combustiones marcadas`.
- [X] **B7** (agent-verified) The rpm figure has no thousands separator in any language, as decided; the duration beside it does follow the language, `6,4 segundos` against `6.4 seconds`.
- [X] **B8** (agent-verified) No layout overflow in English, Filipino, Cebuano, Kiswahili, Português or Հայերեն, the longest of the set.
- [X] **B9** (agent-verified) Every language has exactly the English key set, with the same placeholders, and none is English pasted in. Asserted for all sixteen.
- [X] **B10** (agent-verified) `Intl.NumberFormat` gives the right plural form where a language has them: Russian *секунда*, *секунды*, *секунд* at 1, 2 and 5.
- [X] **B11** (agent-verified) Android: a device set to `en-US` opens the app in English.
- [X] **B12** (agent-verified) Android: the picker opens the platform's own dialog, drawn in each language's script, and choosing Tiếng Việt translates the app.
- [X] **B13** (agent-verified) Android: the choice survives a force-stop and relaunch.
- [X] **B14** (agent-verified) Android: Urdu renders correctly line by line inside the left-to-right layout, with the text right-aligned by the browser's own bidi handling. The label sits left of the picker, which is the layout being wrong rather than the text.
- [X] **B15** ~~Someone who speaks it reads the Tagalog, Bisaya or Armenian.~~ **Deferred by the maintainer**: finding speakers of seventeen languages before the app has users is the wrong order. Real correction comes from the people who use it.
- [X] **B16** ~~The same for a script nobody here reads.~~ Deferred with B15.
- [X] **B17** Phone: after the merge, the same passes on the deployed site.

## C. Code-review findings, disposition

Run by Claude at the maintainer's standing permission, at high effort. Nine
findings, all fixed in `051c7b5`, and the four reachable from a browser
re-verified afterwards. The maintainer was away, so fixing all nine was
Claude's call; any of them can be reversed.

- **C1** ✅ fixed — a language **detected** from the device was stored as if it had been **chosen**. A phone opened once in Spain stayed Spanish after the phone was switched to Portuguese, with no way back to following the device. Only the picker writes now. Verified in B3.
- **C2** ✅ fixed — anything that was not an `InputError` reported "Recording failed. Try again." to a user who had just tried to open a file. A neutral `errorUnknown` covers it, in all seventeen languages.
- **C3** ✅ fixed — two switches on a slow connection resolved in whichever order the chunks arrived, so the app could show Russian under a `lang` of Thai. A request token drops stale resolutions. Verified in B4.
- **C4** ✅ fixed — a chunk that failed to load fell back to English but left the picker showing the failed language, so selecting it again fired no change event and there was no way to retry. The language falls back with the messages.
- **C5** ✅ fixed — the "carries the code, not a sentence" test asserted inside a bare `catch`, so a version that stopped throwing would have passed with no assertions run.
- **C6** ✅ fixed — `document.documentElement.lang` was never set. Verified in B5.
- **C7** ✅ fixed — the bare-string test looked only for full sentences in three top-level directories, which is not where a hurried `'Calculate'` would go. It walks six trees and catches a lone capitalised label. It also strips comments first, since comments discuss the strings without being them.
- **C8** ✅ fixed — counts inside sentences stayed ASCII while durations were localised, so a Bengali screen mixed Bengali and Latin digits. Counts follow the reader now. The rpm figure deliberately does not, being a gauge reading.
- **C9** ✅ fixed — the whole stop label had been wrapped in the monospaced class, which for Thai, Bengali, Armenian and Urdu means whatever fallback the WebView picks. Only the counter is monospaced.

## D. What changed outside this phase

- **D1** The English was rewritten before anything was translated, in its own commit. Thirteen strings are shorter or plainer, and two words went for being jargon: "clip", an editing word where a rider says recording, and "upload", which implies sending something somewhere this app never sends it.
- **D2** Errors travel as codes now. `INPUT_ERROR_MESSAGES` and `ANALYSIS_ERROR_MESSAGES` are gone, and `InputError`'s message is its code, which is what a developer wants in a stack trace anyway.
- **D3** `AudioInputState.error` and `AnalysisState.error` hold codes rather than sentences, and a development-only `errorDetail` carries the cause chain that used to be appended to the message.
- **D4** The language preference joins the expected-range panel in `localStorage`, under `rpm-boss.language`.

## E. New findings from this round

- **E1** ~~The app showed Portuguese on a phone set to `en-US`.~~ Not a finding: the maintainer had chosen Portuguese in an earlier install. The stored preference was doing exactly its job.
- **E2** Urdu ships with a left-to-right layout, by decision. The text reads correctly because the browser applies bidi per line, but the picker's label sits to the left of it and the crop handles will be the wrong way round. Phase 8.
- **E3** The translations are Claude's and no native speaker has seen them. Every file says so in its header. The maintainer deferred verification to after launch, on the grounds that hunting down seventeen speakers before the app has users is the wrong order; corrections will come from the people who use it. That makes a way to report a bad string a post-MVP concern worth remembering.
- **E4** `duration()` formats through `Intl` for any tag, but Cebuano and Filipino fall back to English formatting in most engines, so a Cebuano reader sees "2 seconds" inside an otherwise Cebuano sentence. Correct, since there is no Cebuano unit data to use, but worth knowing.
- **E5** Sixteen language chunks are 2-3 kB each and load on demand. A user on a slow connection sees English for a moment before their language arrives. Acceptable, and the alternative costs every user fifteen languages they cannot read.

## F. Open questions carried from the PRD

- All four were settled before the design and are recorded in the PRD: separate Indonesian and Malay files, English fallback per key, Google's language labels, and sorting by the written name.

## G. Environment

Laptop Chrome through Playwright, and the maintainer's phone over adb for
B11-B14. The translations themselves are unverified by anyone who speaks the
languages.
