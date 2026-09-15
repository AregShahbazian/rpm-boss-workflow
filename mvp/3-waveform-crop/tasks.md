---
id: rb-waveform-crop
feature: 3-waveform-crop
branch: feat/3-waveform-crop
stage: tasks
status: T1-T8 done; T9 (phone) open, carried into review.md section B
created: 2026-09-10
---

# Tasks — Waveform and crop

All on `feat/3-waveform-crop`. Pure code with tests first, phase-2 touch
points second, components last. Each task ends in a commit referencing
`[rb-waveform-crop]` with `npm test` and `npm run lint` green.

The branch carries more than these eight commits: two refactors landed during
implementation (peaks drawn in the effect, range helpers extracted), a hit-test
fix, a README line, and three commits from the code-review round. Scope a
review from `git log main..feat/3-waveform-crop`, not from this list.

## T1 — Selection logic
- [x] `src/waveform/selection.ts`: `Selection`, constants, `defaultSelection`,
      `setStart`, `setEnd`, `moveBy` (design §2.1).
- [x] `test/selection.test.ts` (design §4).
- [x] Commit: `feat(waveform): selection model with 1-10 s window [rb-waveform-crop]`

## T2 — Peaks
- [x] `src/waveform/peaks.ts`: `computePeaks` (design §2.2).
- [x] `test/peaks.test.ts`.
- [x] Commit: `feat(waveform): min/max peaks per column [rb-waveform-crop]`

## T3 — Slice and minimum length
- [x] `src/waveform/slice.ts`: `sliceClip`, `assertMinLength`.
- [x] `src/audio/types.ts`: `'too-short'` code and message.
- [x] `src/audio/load.ts`: `assertMinLength` after decode; `src/audio/record.ts`:
      pass any `InputError` through unchanged.
- [x] `test/slice.test.ts`.
- [x] Commit: `feat(waveform): sliceClip; reject clips under 1 s at load [rb-waveform-crop]`

## T4 — Windowed playback
- [x] `src/audio/player.ts`: `play(startS, endS)`, absolute `position()`.
- [x] Commit: `feat(audio): play a window of the clip [rb-waveform-crop]`

## T5 — State
- [x] `src/state/useAudioInput.ts`: `selection`, `setSelection`, `windowClip`,
      reset on new clip, windowed `togglePlay`, stop on selection change.
- [x] Commit: `feat(state): selection and window clip in useAudioInput [rb-waveform-crop]`

## T6 — WaveformCanvas
- [x] `src/ui/WaveformCanvas.tsx`: layers, sizing, pointer handling (design §3.1).
- [x] CSS: `.wave` wrapper, `touch-action: none`, heights.
- [x] Commit: `feat(ui): waveform canvas with draggable crop window [rb-waveform-crop]`

## T7 — WaveformBlock and screen
- [x] `src/ui/WaveformBlock.tsx`: single vs overview+detail by `LONG_CLIP_S`,
      `detailRange`, readout.
- [x] `src/ui/InputScreen.tsx`: mount the block between StatusLine and Player.
- [x] Commit: `feat(ui): waveform block with overview for long clips [rb-waveform-crop]`

## T8 — Desktop smoke (laptop Chrome, uploads, agent-verified)
Run by Claude through Playwright with synthetic pointer events. Everything
here is mouse/upload only; nothing below is evidence about touch.
- [x] Seven fixtures: waveform + default window (AC 1).
- [x] Edge and body drags, limits (AC 2, 3).
- [x] A 2-minute file: overview + detail, window at 100-110 s (AC 4). Make
      one with `ffmpeg -stream_loop 7 -i "audio/before cold clutch.aac" -c copy long.m4a`
      into the scratch dir.
- [x] Windowed playback and indicator (AC 5); reset on new clip (AC 6);
      too-short rejection with a 0.5 s file (AC 6b).
- [x] Update `README.md` status.

## T9 — Phone pass (maintainer, Android Chrome) — open
Carried into `review.md` section B; the feature is not done until these pass.
- [ ] 48 px hit areas under a real finger: grab each edge and the body of a
      narrow window without missing.
- [ ] No gesture conflict: dragging on the canvas must not scroll the page.
- [ ] Drag stays smooth on the phone, including the 2-minute file.
- [ ] AC 6b, recording half: stop a recording at ~0.5 s and see the too-short
      message.
- [ ] Windowed playback and the position line during playback.

## Handoff
Then: code review (maintainer triggers), fixes on the branch, `review.md`, merge.
