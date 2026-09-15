---
id: rb-waveform-crop
feature: 3-waveform-crop
branch: feat/3-waveform-crop
status: draft
created: 2026-09-10
depends_on: [2-audio-input]
---

# PRD — Waveform and crop

## Goal

Show the loaded clip as a waveform and let the user choose the section that
goes into the analysis. Every clip, short or long, passes through this step.

## Why

Recordings contain revs, silence, wind, a thumb on the mic. The analysis is
only as good as the section it gets, and the user can see the clean part
better than any heuristic can. Long uploads are handled here too: the app
never rejects a long file, it asks for a window. The 10 s cap keeps the
analysis bounded and the UI simple (decided in
[`discussions/2026-09-10-audio-input-scope.md`](../../discussions/2026-09-10-audio-input-scope.md)).

## User stories

1. As a user, after loading a clip I see its waveform and a highlighted window
   already placed on it, so one tap on Calculate would work without any
   cropping.
2. As a user, I drag the window's edges or the window itself to the cleanest
   part, and the app never lets the window grow past 10 s.
3. As a user with a 2-minute upload, I see the whole file at a glance and can
   still place a 10 s window precisely.
4. As a user, I press Play and hear only the window, so I can confirm my choice
   by ear.

## Scope

### In
- **Waveform** of the full clip, drawn on a canvas from the 16 kHz mono
  samples (min/max per pixel column). Redrawn on resize.
- **Crop window**, always visible:
  - Default: from 0 s, length `min(10 s, clip duration)`.
  - Max length **10 s**, min length **1 s**.
  - Draggable by the left edge, the right edge, and the body (moves without
    resizing). Clamped to the clip.
  - Start and end shown as `m:ss.s`, length shown as `x.x s`.
- **Long clips** (longer than ~30 s): an overview strip of the whole clip with
  the window marked, plus a detail waveform of the region around the window,
  so the handles stay usable. Below that threshold one waveform is enough.
- **Playback** from phase 2 now plays the window only, and the position
  indicator is drawn on the waveform.
- **Minimum clip length:** clips shorter than **1 s** are rejected at load,
  both uploads and recordings, with the message "That clip is too short.
  Record or pick at least 1 second." This lands in the phase-2 input module
  (`loadFile`, `record`) as a new `InputError` code, so the crop step always
  has a valid window to offer.
- **Output:** the selection `{ startS, endS }` and a derived `AudioClip` of the
  window (via `trimClip`-style slicing), exposed from the state hook for
  `4-analysis`. Selection resets to the default when a new clip is loaded.
- **Touch-first:** handles have a 48 px hit area even when the drawn handle is
  thinner; body drag works with a single finger; no gesture conflicts with
  page scroll (the canvas area does not scroll the page while dragging).
- **Performance:** dragging is smooth on a mid-range Android phone; waveform
  peaks are precomputed once per clip, not per frame.

### Out
- Analysis, combustion markers, the result view (4, 5).
- Zoom, pinch, scroll-wheel navigation. The overview+detail pair covers long
  clips; free zoom is a backlog item.
- Trimming the stored clip; the clip stays whole, only the selection changes.
- Persisting the selection.
- Desktop mouse polish beyond "works".

## Acceptance criteria

1. Each of the seven fixtures shows a waveform whose length matches its
   duration; the default window is 0-6.4 s for `after cold` and 0-10 s for
   `before cold clutch` (15.9 s).
2. Dragging the right edge past 10 s from the left edge is refused (window
   stays 10 s); dragging edges together below 1 s is refused.
3. Dragging the body keeps the length exact (to the sample) and clamps at both
   ends of the clip.
4. A synthetic 120 s clip (a fixture looped in a test helper, or a 2-minute
   upload) shows the overview strip and the detail view, and the window can be
   placed at 100-110 s.
5. Play plays only the window, the indicator moves inside it, playback stops at
   the window end.
6. Loading a new clip resets the window to the default.
6b. A 0.5 s upload and a recording stopped at 0.5 s are both refused with the
    too-short message; a 1.0 s clip is accepted.
7. Unit tests: peak computation (`n` samples → `w` columns of min/max), the
   selection clamping logic (max 10 s, min 1 s, clip bounds, body move), and
   the window-to-clip slicing, all as pure functions.
8. `npm test`, `npm run lint`, `npm run build` pass.

## Non-goals and constraints

- No chart or gesture library. Canvas 2D and pointer events only.
- The waveform and selection logic live outside React (`src/waveform/`),
  pure and Node-testable; React only wires pointer events and draws.
- No change to the `AudioClip` contract from phase 2.

## Open questions

- Exact long-clip threshold for showing the overview strip (30 s is a guess;
  decide in design from the fixture widths at 360 px).
- Whether the min window of 1 s is enough for the autocorrelation in phase 4;
  phase 4 may raise it.
