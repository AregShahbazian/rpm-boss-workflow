---
id: rb-waveform-crop
feature: 3-waveform-crop
branch: feat/3-waveform-crop
stage: design
status: implemented; updated after code review (findings 1-10)
created: 2026-09-10
---

# Design — Waveform and crop

Implements `prd.md`. Pure logic in `src/waveform/`, Node-testable; React only
wires pointer events and draws.

## 1. Data

```ts
// src/waveform/selection.ts
export interface Selection { startS: number; endS: number }   // seconds, absolute in the clip
export const MIN_WINDOW_S = 1
export const MAX_WINDOW_S = 10
export const MIN_CLIP_S = 1        // phase-2 load gate, same number as MIN_WINDOW_S
```

The clip is never modified. The selection is state next to the clip; the
analysis input is derived: `sliceClip(clip, selection): AudioClip`.

## 2. Pure modules

### 2.1 `selection.ts`
- `defaultSelection(durationS)` → `{ 0, min(MAX_WINDOW_S, durationS) }`.
- `setStart(sel, startS, durationS)`: clamp so `MIN ≤ end - start ≤ MAX` and
  `0 ≤ start`. If the new start would make the window longer than MAX, the
  start stops at `end - MAX`; shorter than MIN, stops at `end - MIN`.
- `setEnd(sel, endS, durationS)`: mirror of `setStart`.
- `moveBy(sel, deltaS, durationS)`: shifts both ends by the same amount,
  clamped to `[0, durationS]`; length is preserved exactly (computed once as
  `len = end - start`, then `start' = clamp(start + delta, 0, durationS - len)`,
  `end' = start' + len`).
- All return a new object; all values are plain seconds (floats). Sample
  alignment happens in `sliceClip` only.

### 2.2 `peaks.ts`
```ts
export interface Peaks { min: Float32Array; max: Float32Array }   // one entry per column
export function computePeaks(samples: Float32Array, fromSample: number, toSample: number, columns: number): Peaks
```
For each column `c`, the sample span is `[from + c*span/columns, from + (c+1)*span/columns)`;
min and max over it. Empty spans (more columns than samples) repeat the single
sample. `O(n)` in the span length. No caching here; the component caches.

### 2.3 Slicing (in the audio layer)
`sliceClip(clip, startS, endS)` lives in `src/audio/decode.ts`, beside
`trimClip`, which delegates to it. One rounding rule for every cut: the start
sample is `round(startS * rate)` and the **count** is `round((endS - startS) *
rate)`, so a window of a given length always yields the same number of samples
wherever it sits. (Rounding both ends independently made the count jitter by
one as the window moved — code review finding 2.)

`assertMinLength(clip)` sits there too and throws `InputError('too-short')`
when `durationS < MIN_CLIP_S`. Keeping both in `audio/` means the audio layer
never imports from `waveform/`; `MIN_CLIP_S` is defined in `audio/types.ts`.

### 2.4 Phase-2 touch points
- `types.ts`: new code `'too-short'`, message "That clip is too short. Record
  or pick at least 1 second."
- `load.ts` `decodeBuffer`: call `assertMinLength` after `decodeToClip`. Both
  uploads and recordings go through it. `record.ts` needs no change: its
  `onstop` handler already passes an `InputError` through unless the code is
  `undecodable`, which stays mapped to `record-failed` so a bad microphone blob
  never reports itself as an unsupported file.
- `player.ts`: `play(startS = 0, endS = durationS)` → `node.start(0, startS, endS - startS)`;
  `position()` returns `startS + (ctx.currentTime - startedAt)`, clamped to `endS`.

## 3. Components

```
src/ui/
  WaveformCanvas.tsx   one canvas, draws a time range, optional handles, pointer events
  WaveformBlock.tsx    composes overview + detail for long clips, single canvas otherwise, plus the readout
```

### 3.1 `WaveformCanvas`
Props: `clip`, `range: { fromS, toS }` (visible time range), `selection`,
`onChange(sel)`, `positionS?`, `handles: boolean`, `height`.

Drawing, two layers:
- **Waveform layer**: peaks for `(range, width)` in one memo, rasterised into
  an offscreen `<canvas>` in a second memo keyed on `(peaks, size, palette)`.
  Min/max bars per column, 1 px wide, vertically centred, colour `--muted`.
- **Overlay**, redrawn on every selection/position change: one `drawImage` of
  the raster, then dim outside the selection, a 2 px accent border, handles as
  4 px bars with a rounded grip when `handles`, and a 1 px position line when
  `positionS` is set. `requestAnimationFrame` batched.
- **Palette**: the four CSS variables are read from `document.documentElement`
  once per colour-scheme change (a `prefers-color-scheme` listener), never per
  frame — `getComputedStyle` forces a style recalculation.

Sizing: CSS width 100 %, `ResizeObserver` on the wrapper, backing store at
`devicePixelRatio`. `touch-action: none` on the canvas.

Pointer mapping: `xToS(x) = fromS + (x / width) * (toS - fromS)`; inverse for
drawing.

Pointer handling (`onPointerDown` + `setPointerCapture`, `onPointerMove`,
`onPointerUp/Cancel`):
- Hit test at down, in px: the **nearer** edge wins within its slack, which is
  24 px for a press outside the window but only 8 px for a press inside it, so
  a window narrower than 48 px still has a draggable body (finding 3). Then
  `sx < x < ex` → drag body; else, when `handles` is false (overview), centre
  the window on `x` via `moveBy`, then drag body. Edges are only tested when
  `handles` is true, so the overview strip never resizes.
- Move: edge → `setStart`/`setEnd` with `xToS(x)`; body → `moveBy(xToS(x) - xToS(x0))`
  relative to the selection at pointer-down (no accumulated drift).
- Only the primary pointer; a second pointer is ignored.

### 3.2 `WaveformBlock`
- `LONG_CLIP_S = 30`. Reasoning: at 360 px, 30 s is 12 px per second, so the
  1 s minimum window is still 12 px wide with 48 px hit areas around its
  handles; beyond that, edges get hard to place.
- `durationS ≤ 30`: one `WaveformCanvas`, `range = [0, durationS]`,
  `handles = true`, height 140.
- `durationS > 30`: an overview `WaveformCanvas` (`range` = whole clip,
  `handles = false`, height 48) above a detail `WaveformCanvas` with
  `handles = true`, height 140, showing a 30 s span.
- The detail span is **remembered, not recomputed**: `nextDetailRange(prev,
  sel, durationS)` in `src/waveform/range.ts` returns `prev` unchanged while
  the window is still inside it, and otherwise scrolls by the smallest amount
  that brings the window back into view. It only centres on the first open.
  Re-centring on the selection midpoint every time (the first draft of this
  design) made the view chase the finger: the waveform slid under a pinned
  window during a body drag, and an edge moved at twice pointer speed
  (finding 1). `WaveformBlock` holds the range in state and adjusts it during
  render; since an unchanged range is the same object, React bails out.
- Readout under the canvases: `0:02.5 – 0:12.5 · 10.0 s`.

### 3.3 State (`useAudioInput`)
Adds `selection` and `setSelection`; `setClip` resets it to
`defaultSelection`. Exposes `windowClip = useMemo(() => sliceClip(clip, selection))`.
`togglePlay` calls `player.play(selection.startS, selection.endS)`; the rAF
tick reads `position()` which is now absolute, so the indicator lands inside
the window. Changing the selection while playing stops playback.

### 3.4 Layout (`InputScreen`)
Upload / Record row → StatusLine → `WaveformBlock` (when a clip is loaded and
not recording) → Player. Nothing else moves.

## 4. Tests (`test/`)
- `selection.test.ts`: default for 6.4 s and 15.9 s; `setEnd` past MAX holds
  at 10 s; `setStart` making it shorter than MIN holds at 1 s; `moveBy`
  preserves length to 1e-9 and clamps at both ends; values never leave
  `[0, durationS]`.
- `peaks.test.ts`: a 1 kHz tone at 16 kHz → 100 columns over 1 s: every
  column's max ≈ 1 and min ≈ -1; a silent span gives zeros; more columns than
  samples repeats samples; a ramp gives monotonic maxima.
- `slice.test.ts`: slicing `before-cold-clutch` at 2.0-12.0 s gives 160000
  samples equal to the source subarray; a window of one length keeps one sample
  count wherever it is moved (the finding-2 regression); `trimClip` is a slice
  from the start and returns short clips untouched; `assertMinLength` throws
  for 0.5 s and passes for 1.0 s.
- `range.test.ts`: `nextDetailRange` centres on first open, returns the *same
  object* while the window stays visible, and scrolls minimally otherwise.
- `format.test.ts`: `formatTime` carries into minutes when rounding does
  (59.97 s → "1:00.0", never "0:60.0"), pads, and clamps negatives.
- Existing fixture/decode tests unchanged.
- Component behaviour (drag, overview, playback window) is manual, section B
  of the review.

## 5. Out of scope reminders
No zoom or pinch, no markers, no persistence, no analysis. `AudioClip` contract
unchanged.
