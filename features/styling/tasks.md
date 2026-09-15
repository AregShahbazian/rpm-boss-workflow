---
id: rb-styling
feature: styling
branch: feat/styling
status: draft
created: 2026-09-13
---

# Tasks — Styling the app by hand

Follows `design.md`. Commit subjects carry `[rb-styling]`.

**Every task ends with the app building, installable and unchanged on screen.**
A half-converted app is a legitimate intermediate state here — a fully working
one is not optional. So each task ends green on `npm run build`, `npm test` and
`npm run lint`, and the visual check below.

**The visual check**, referred to as *the diff* from here on: `npm run dev`, and
compare against `~/git/rpm-boss/store/screenshot1..7.png` at 360×640, 390×844
and 844×390, in both themes. Any difference is a defect, not an improvement.

---

## Toolchain

- **T1** `package.json`: add `tailwindcss`, `@tailwindcss/vite`,
  `@emotion/react`, `clsx`. No Babel packages — the design says why.
  *Verify:* `npm ls` resolves clean, no peer warnings about `@babel/core`.

- **T2** `vite.config.ts`: add the `tailwind()` plugin, and
  `react({ jsxImportSource: '@emotion/react' })`. Leave the `samples` plugin,
  `base`, `define` and the `test` block alone.
  `tsconfig.app.json`: `"jsxImportSource": "@emotion/react"`.
  *Verify:* `npm run build` and `npm test` both pass with no source change yet.
  The tests are node-environment DSP tests and must be untouched by this.

- **T3** `src/palette.css`, new: the `@theme` block with `--color-fg`,
  `--color-bg`, `--color-muted`, `--color-accent`, `--color-error`,
  `--color-btn`; then `--dim`, `--gap`, `--col` as plain properties; then the
  two light-theme blocks. Move the existing comments with the values they
  explain — the dark-first note, why `--error` and `--dim` are not inversions,
  why `--col` is clamped the way it is.
  *Verify:* nothing yet imports it; `npm run build` still passes.

- **T4** `src/index.css`: import the three Tailwind layers (no preflight — see
  the design), import `./palette.css`, add `@custom-variant split`. Delete the
  `:root` token block that moved to the palette; keep `:root`'s `color-scheme`
  and `font-family`, and `body`. Every component rule stays for now.
  *Verify:* the diff. This is the task most likely to shift something, because
  the layers change cascade order. Nothing should move.

- **T5** `src/ui/palette.ts`: read `--color-muted`, `--color-bg`,
  `--color-accent`; `--dim` keeps its name. Fallbacks unchanged.
  *Verify:* load a clip, check the waveform still draws in both themes and
  after a theme switch with no reload. This is requirement 7 and nothing else
  catches it.

---

## The kit

- **T6** `src/ui/kit.tsx`, new: `Button` and `LinkButton`.
  `Button` owns `.btn` and takes `icon` (2 callers: `SampleButton`,
  `Settings`) and `tone` (1 caller: `RecordButton`). No `className`
  passthrough — the design forbids it, and a caller that wants one is asking
  for a prop instead.
  Keep the comment explaining the 48 px hit target.
  *Verify:* not wired up yet; `npm run build`.

- **T7** Convert the six `.btn` callers to `<Button>`: `UploadButton`,
  `RecordButton` (`tone="record"`), `SampleButton` (`icon`, plus the list
  buttons), `Settings` (`icon`), `Player`, `InputScreen`'s Calculate.
  Delete `.btn`, `.btn-rec`, `.btn-icon` from `index.css`.
  *Verify:* the diff, with attention to the source row at 360 px — the button
  row wraps on a narrow device (seen on the AGM G3) and must wrap the same way.

- **T8** Convert the three `.link` callers to `<LinkButton>`: `ExportButton`,
  `MicCheck`, `StatusLine`. Delete `.link`.
  *Verify:* the diff.

---

## Leaf components

One commit each. Each deletes its rules from `index.css` as it goes, so the
stylesheet shrinks visibly and nothing is left orphaned at the end.

- **T9** `StatusLine.tsx` — `.status`, `.muted`, `.error`. Utilities.
- **T10** `ResultView.tsx` — `.result`, `.result:empty`, `.rpm`, `.rpm-value`,
  `.rpm-unit`, `.readout`. The `:empty` rule is a `css`-prop case. Keep the
  comment on the `clamp()` that sizes the number.
- **T11** `RangeFields.tsx` — `.range` and its four descendant rules
  (`summary`, `[open] summary`, `label`, `input`). The `<details>` selectors are
  a `css`-prop case.
- **T12** `MicCheck.tsx` — `.miccheck pre`, `.mono`.
- **T13** `Player.tsx` — `.player`, `.player .btn`, `.player .mono`. The two
  descendant rules disappear: the children are `<Button>` and a `<span>`
  styled where they are written.
- **T14** `SampleButton.tsx` and `Settings.tsx` — `.sheet`, `.sheet::backdrop`,
  `.sheet h2`, `.sheet-body`, `.themes`, `.themes legend`, `.themes label`,
  `.samples`, `.samples .btn`. `::backdrop` has no utility and stays CSS.
  `LanguagePicker.tsx` — `.field`, `.field select`.
- **T15** `WaveformBlock.tsx` and `WaveformCanvas.tsx` — `.wave`,
  `.wave canvas`, `.wave-block`, `.wave-overview`, `.wave-detail` and the two
  size media queries. The descendant `canvas` rule becomes a nested selector in
  the wrapper's `css` block. Keep the comments explaining why the canvas is out
  of flow and why the detail view is inset.
  *Verify each of T9–T15:* the diff, plus the interaction the component owns —
  crop drag and playback for T15, the dialog opening and closing for T14.

---

## Layout, last

- **T16** `InputScreen.tsx` — `.screen`, `.screen-empty`, the seven `.area-*`
  rules, `.row`, and the two layout media queries, into the `css` prop on
  `<main>`. Named grid areas and a two-condition media query are what the `css`
  prop is for; do not try to express them as utilities.
  Keep the comment explaining why the split needs width *and* landscape — it
  records a bug that a portrait tablet found.
  *Verify:* the diff at all three sizes plus 820×1180 portrait, which is the
  case that comment is about. Both themes.

- **T17** `src/index.css` reduced to: the Tailwind layers, the palette import,
  `@custom-variant split`, `:root`'s `color-scheme` and `font-family`, `body`.
  Nothing else. Delete `.screen-empty` and anything else left over.
  *Verify:* `grep -c '{' src/index.css` is in single figures. No component
  references a class defined anywhere but its own file.

---

## Closing

- **T18** Requirement 8, right-to-left: build Urdu and check the three sizes.
  Every `inline-size` / `block-size` that became `w-*` / `h-*` is a suspect;
  `px-*` and `mx-*` are safe because Tailwind emits the logical properties.
  Fix by dropping to `[inline-size:…]` or the `css` prop.

- **T19** Requirement 11, no statement written twice: read the final diff for
  repeated multi-declaration utility runs. A single shared utility at several
  sites is fine; a repeated *group* means a missing component.

- **T20** Requirement 9: `npm run build` and compare the gzipped bundle against
  85.05 kB. The spike measured +7.1 kB; anything much past that wants
  explaining before it is accepted.

- **T21** `./scripts/apk.sh` and install on both phones — the Zenfone and the
  AGM G3. The AGM is the narrow one where the button row wraps. Confirms the
  browser floor the design discusses is actually met by the WebViews in play.

- **T22** Playwright pass in laptop Chrome: upload, crop drag, play, Calculate,
  the settings dialog, the sample list, both themes, Urdu, at 360×640, 390×844,
  844×390 and 820×1180.

- **T23** `README.md` where it describes the stack or the stylesheet. There is
  no `CLAUDE.md` in this repo. `store/README.md` stays valid, because nothing
  changed on screen.
