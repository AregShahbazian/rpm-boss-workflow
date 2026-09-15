---
id: rb-demo-mock
feature: demo-mock
branch: feat/demo-mock
stage: review
created: 2026-09-15
---

# Review — A demo build with a simulated engine

Three commits: `14af927` the feature, `7e80b2b` the scripts, `9f6c41c` the code
review's four fixes. The maintainer tested the demo locally before this doc was
written and reported it good, so B is what is left rather than the whole surface.

## A. Automated

- **A1** `npm test` — 413 pass, 28 files. One file fewer than main: `test/mock.test.ts` tested `chunksOwed` and `readLooped`, which no longer exist.
- **A2** `npm run lint` — clean, no warnings. `npx tsc -b` — clean.
- **A3** Release build carries no simulated engine: no `engine-worklet` asset, no `mock-engine` chunk, no `openMockEngine`/`mockRpmBounds`/`clampMockRpm` symbol, button and slider eliminated. Checked as files *and* as base64 — Vite inlines any worklet under 4 KB, so `dist/assets/` alone proves nothing.
- **A4** Demo build (`VITE_SAMPLES=1 VITE_MOCK=1`) emits `engine-worklet-*.js` and `mock-engine-*.js`, and `dist/samples/`.
- **A5** Size: 378,697 bytes against main's 376,416. The +2,281 is the three strings in seventeen languages; `index.js` itself is smaller than main's.
- **A6** `src/live/engine-worklet.js` is byte-identical to revbench's below the added header.
- **A7** The sweep: 600–12,000 rpm, both strokes, inside 1.1%, search range scaled to the engine rendered. `evidence/sweep-2026-09-15.txt`.

## B. Manual checklist

The maintainer's to tick. Everything here needs a device or an eye. **All eight
confirmed passing by the maintainer, 2026-09-15.**

- [x] **B1** `./scripts/install.sh --demo` on the AGM G3: the button is there, the engine is audible through the phone's speaker, the dial settles at 1500.
- [x] **B2** The slider, on the phone: dragged to each end and back, the sound follows and the reading agrees once settled (~1.5 s, being a 2 s window and a median of five).
- [x] **B3** Landscape on the phone. The slider adds a row to a stage 360 px tall; if it crowds the scope, the fix is to float it over the scope, not to shrink the dial. See D1.
- [x] **B4** Urdu: the badge and the slider label inside the RTL layout, figure still left-to-right.
- [x] **B5** `./scripts/dev.sh` with no flag gives the app as it ships — no Mock button, no samples sheet. Same for `./scripts/apk.sh` and the APK it installs.
- [x] **B6** `./scripts/dev.sh --demo --build` serves on 4173 and behaves as the dev server did, since that is what the website will run.
- [x] **B7** Both themes, on the phone: the slider's track and thumb follow the palette. They are drawn by hand because a platform range input does not.
- [x] **B8** The two stop races the review found (`9f6c41c`): press Stop while Chrome's permission prompt is up, then grant — the recording indicator must go out. On the phone, press Stop the instant Start is pressed, twice over, and confirm live mode is genuinely off rather than a dial that needs stopping again.

## C. Findings

All four from the code review are fixed in `9f6c41c`; listed because the last two were older than this branch.

- **C1** `captureFrom` did not re-check after `context.resume()`, so a stop inside the resume window left a zombie run — stop button and scope on screen, everything behind them gone. *(fixed)*
- **C2** The `if (stopped) { stop(); return }` guards after `getUserMedia` and `RawAudio.start` were no-ops: `stop()` returned early on a flag the earlier stop had already set, so the device that had since opened was never released. Browser indicator stays lit; on Android the native recorder held the microphone for the full 600 s cap. Pre-existing on both mic paths. *(fixed — release split from stop)*
- **C3** `clampMockRpm` was written for the start speed and never called. Safe only because the dial cannot be set below 9,000, which is a fact about another file. *(fixed — clamped where the bounds are known, passed into `start`)*
- **C4** `aab.sh` ignored any argument that was not `--samples`, so `aab.sh --demo` built a plain release in silence, and it inherited `VITE_MOCK` from the shell. *(fixed — refuses `--demo` by name, unsets the flag)*
- **C5** *Not* fixed, deliberately: shrinking the dial's max below the slider's value **while the mock runs** pins the needle at the stop with the sound unchanged. That is `dial.ts`'s documented behaviour for any reading past the face, and what a real tachometer does. Raised so the decision is on the record.
- **C6** The three strings cost every build 2 KB, demo or not. `en.ts` is one object and every bundle is typed against it, so a key that exists for the demo exists everywhere. No flag can remove it and none should try.

## D. Open questions

- ~~**D1** Landscape (B3).~~ Judged on the phone and passing, so the slider stays where it is: a row of its own, not floated over the scope.
- **D2** The dev server no longer carries the samples either — the defaults were inverted for both flags together, on the grounds that one rule beats two. It is a change to behaviour that predates this feature, so it is worth confirming rather than assuming.
- **D3** Task 14, the Playwright pass, was never run. What happened instead is the thing that gate exists to approximate — the maintainer driving the app on a real phone — so the question is whether the branch merges on that, or whether the written gate is owed a headless pass as well. The maintainer's call.
