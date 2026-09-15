---
id: rb-waveform-crop
feature: 3-waveform-crop
branch: feat/3-waveform-crop
stage: merged
status: closed 2026-09-10 — B1-B19 confirmed by the maintainer; merged as 84c2ed6, deployed
created: 2026-09-10
commits: df3784c..3f8e65e (14 on the branch, pushed) + doc commits in ~
---

# Review — Waveform and crop

Review only: findings and a checklist, no fixes. Approved fixes land on the
branch as `fix(...): ... [rb-waveform-crop]`.

## A. Automated

| Check | Result |
|---|---|
| `npm test` | 45 passed, 8 files (fixtures 7, resample 7, decode 8, selection 6, peaks 4, slice 6, range 4, format 3) |
| `npm run lint` | clean |
| `tsc -b` + `npm run build` | clean, 234 kB JS / 74 kB gzipped |

## B. Manual checklist

B1-B13 were driven by Claude in laptop Chrome through synthetic pointer events
(mouse and uploads only), and what it observed is noted on each item. The
maintainer confirmed B1-B18 on 2026-09-10, phone included, and B19 on the
deployed site after the merge. Every box is ticked; the phase is closed.

- [X] **B1** (agent-verified) Seven fixtures load and draw a waveform of the right length; `after cold.aac` defaults to 0:00.0-0:06.4, `before cold clutch.aac` to 0:00.0-0:10.0 (AC 1).
- [X] **B2** (agent-verified) Dragging the right edge past 10 s from the left holds the window at 10.0 s (AC 2).
- [X] **B3** (agent-verified) Dragging edges together holds at 1.0 s (AC 2).
- [X] **B4** (agent-verified) Body drag preserves the length exactly and clamps at both ends of the clip (AC 3).
- [X] **B5** (agent-verified) An edge lands where the pointer is, to 0.000 s, and two consecutive drags stay aligned — the view does not re-centre (finding 1).
- [X] **B6** (agent-verified) A 2 s window (~23 px at the 30 s detail span) drags by its body 8.00 s with the length kept (finding 3).
- [X] **B7** (agent-verified) A 127 s file shows the overview strip plus the detail view; tapping the overview centres the window there (AC 4).
- [X] **B8** (agent-verified) Pushing the window past the edge of the detail view scrolls it by the smallest amount that brings the window back, and the window stays visible.
- [X] **B9** (agent-verified) Windows spanning a minute read `0:58.6 - 1:00.6` and `1:58.6 - 2:00.6`; no `0:60.0` anywhere (finding 4).
- [X] **B10** (agent-verified) Play plays only the window: a 2.0-5.0 s crop counts `0:01 / 0:03` and returns to `0:00 / 0:03` at the end, button back to Play (AC 5).
- [X] **B11** (agent-verified) Loading a new clip resets the window to the default (AC 6).
- [X] **B12** (agent-verified) A 0.5 s upload is refused with "That clip is too short…" and the previous clip stays loaded (AC 6b, upload half).
- [X] **B13** (agent-verified) Clips at or under 30 s show a single canvas, no overview strip.
- [X] **B14** Phone: each edge of a *narrow* window can be grabbed with a finger, and the body dragged, without missing (PRD 48 px hit areas).
- [X] **B15** Phone: dragging on the canvas never scrolls the page (`touch-action: none`).
- [X] **B16** Phone: dragging stays smooth, including on the 127 s file with the overview strip.
- [X] **B17** Phone: windowed playback and the position line, on a cropped window.
- [X] **B18** Phone: a recording stopped at ~0.5 s is refused with the too-short message (AC 6b, recording half).
- [X] **B19** Phone: after the merge, the same passes on the deployed site (no USB, so this is also the mic-over-https check).

## C. Code-review findings, disposition

The round the maintainer triggered produced ten findings. All are addressed on the
branch, in three commits.

- **C1** ✅ fixed in 155c786 — the detail view re-centred on the selection midpoint on every change, so an edge drag moved at twice pointer speed and a body drag slid the waveform under a pinned window, recomputing peaks each move. `nextDetailRange` now keeps the previous range while the window is visible and scrolls minimally otherwise; unit-tested for object identity.
- **C2** ✅ fixed in 155c786 — `sliceClip` rounded start and end independently, so a moved window's sample count jittered by one. The count now comes from the length. The regression test fails against the old formula (two distinct counts) and passes now.
- **C3** ✅ fixed in 155c786 — inside the window only the outer 8 px resize, so windows under 48 px keep a draggable body.
- **C4** ✅ fixed in 155c786 — one `formatTime` shared with the player rounds before splitting minutes; 59.97 s reads `1:00.0`.
- **C5** ✅ fixed in ff2e2ac — `windowClip` was a memo copying up to 640 kB per pointer move for a value nothing reads until Calculate; it is `getWindowClip()` now.
- **C6** ✅ fixed in e817385 — the design claimed `record.ts` passes any `InputError` through; it keeps `undecodable` mapped to `record-failed`, and the design now says so.
- **C7** ✅ fixed in e817385 — design §3.1/§3.2/§4 rewritten to match the shipped code (raster + overlay, nearer-edge hit test, `waveform/range.ts`, eight test files), status updated, and tasks.md now says to scope from `git log main..feat/3-waveform-crop` rather than its own list.
- **C8** ✅ fixed in e817385 — T8 split into a desktop smoke (agent-verified, done) and an open T9 phone pass, carried into section B above.
- **C9** ✅ fixed in ff2e2ac — the waveform is rasterised once per peaks/size/theme and composited with one `drawImage`; the four CSS variables are read once per colour-scheme change instead of four `getComputedStyle` calls per frame; playback position updates are quantised to ~20 Hz.
- **C10** ✅ fixed in 155c786 — one slicing primitive in `audio/decode.ts` with `trimClip` delegating to it, and the load gate moved there too, so `audio/` no longer imports from `waveform/`.
- **C11** ⬜ not fixed — docs commit `3ea7ecc` in `~` lacks the `Co-Authored-By` trailer the repo workflow requires. It is unpushed, so an interactive rebase could add it; history rewriting needs the maintainer's go-ahead, so it is left as is.

## D. New findings from this round

- **D1** Scrolling mid-drag is now possible: push an edge past the border of the detail view and the view scrolls, so the time under the pointer shifts within the same gesture. This is standard edge-scroll behaviour and the edge keeps following the pointer, but it is the one interaction where the waveform moves while a finger is down. B16 should say whether it feels right on a phone.
- **D2** The position line advances in 0.05 s steps (C9). On a narrow window on a wide screen that is ~4 px per step, which may read as slightly steppy. Lower the step or drive the line from a canvas-local `requestAnimationFrame` if it looks wrong in B17.
- **D3** The overview strip has no affordance saying it can be tapped to move the window. Cosmetic, and cheap to fix with a caption once the analysis UI lands.
- **D4** `getWindowClip` is not consumed yet — `InputScreen` does not destructure it. Phase 4 wires it to Calculate; nothing to do here beyond not forgetting it.
- **D5** The long-clip threshold `LONG_CLIP_S = 30` is a constant derived from 360 px phone width (~12 px/s), so it triggers too late on a narrower screen and too early on desktop. The fix is to derive it from the measured canvas width, which means lifting the width measurement out of `WaveformCanvas` into `WaveformBlock`. Deferred to phase `8-ui-fixes` on 2026-09-10; not a phase 3 blocker.

## E. Open questions carried from the PRD

- The 30 s long-clip threshold is settled in the design (11.7 px/s at phone width, verified in B6: a 2 s window is ~23 px and still draggable by the body after C3), but only for that width; making it width-derived is D5, deferred to phase `8-ui-fixes`.
- Whether the 1 s minimum window is enough for the autocorrelation is still open and belongs to `4-analysis`, which may raise both `MIN_WINDOW_S` and `MIN_CLIP_S` (they are one number in `audio/types.ts` now).

## F. Environment

Laptop Chrome through Playwright, uploads only, per the phase-2 decision to
keep the dev loop on the laptop. The phone needs USB for the microphone
(localhost via `adb reverse`), so B14-B18 want a cable, and B19 covers the
deployed https page after the merge.
