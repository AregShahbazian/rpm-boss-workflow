---
id: rb-i18n
feature: 7-i18n
branch: feat/7-i18n
status: draft
created: 2026-09-10
---

# Tasks — Languages

Commit subjects carry `[rb-i18n]`. Each task ends green on `npm test` and
`npm run lint`.

- **T1** Rewrite the English strings in place, per the table in `design.md` §1,
  before any layer exists. One commit, so the wording change is reviewable on
  its own rather than buried in an extraction.
- **T2** `src/i18n/en.ts` and the `Messages` type: every string as a key, with a
  note beside each saying what the user just did.
- **T3** `src/i18n/index.ts`: `t()`, the context and provider, `setLanguage`,
  `localStorage` under `rpm-boss.language`, and `{key}` interpolation.
- **T4** `src/i18n/languages.ts`: the seventeen, each with its code, its own
  name in its own script, and an `rtl` flag that only Urdu sets.
- **T5** Detection: stored choice, then `navigator.languages` exact, then base
  tag, then English, with `tl` mapped to `fil`. Tests.
- **T6** The duration through `Intl.NumberFormat` with `style: 'unit'`, and the
  too-short and too-short-window messages rebuilt around one slot. Tests at 1, 2
  and 3 seconds in English, Russian, Indonesian and Thai.
- **T7** Swap every component over to `t()`. `StatusLine`, `UploadButton`,
  `RecordButton`, `Player`, `RangeFields`, `InputScreen`, `ResultView`,
  `octave.ts`, and the two error tables.
- **T8** `strings.test.ts`: no bare user-facing literal left in `src/ui/`,
  `src/audio/` or `src/dsp/`. **The gate**: nothing below starts until it is
  green.
- **T9** The picker: a native `<select>` after the source buttons, sorted with
  `Intl.Collator` over the written names.
- **T10** Translate. Sixteen files, each with a header saying no native speaker
  has reviewed it. RPM Boss and `rpm` stay untranslated.
- **T11** `messages.test.ts`: same keys everywhere, nothing left in English by
  accident, no `{` surviving formatting.
- **T12** Playwright pass in laptop Chrome: each language renders, the picker
  changes the screen and survives a reload, the longest languages do not break
  the button rows, and Urdu reads correctly inside a left-to-right layout.
- **T13** Android pass: install, check the device language is picked up, and
  confirm the native picker appears in the phone's own language.
- **T14** `review.md` for the phase.

Scope check before calling the phase done: `git log main..feat/7-i18n`.
