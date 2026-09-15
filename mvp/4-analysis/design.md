---
id: rb-analysis
feature: 4-analysis
branch: feat/4-analysis
status: draft
created: 2026-09-10
---

# Design — Analysis

How the scipy reference in [`mvp.md`](../../mvp.md) becomes TypeScript, and what was measured
before deciding anything.

## 0. Measurements taken first

The reference method was re-implemented in Python against the seven fixtures
before any TypeScript was written, to have a trusted baseline to port from and
to answer the PRD's open questions with numbers instead of opinion. It
reproduces `audio/combustion-counts.md` to the digit shown there, so the
parameters below are the reference's parameters, not a guess at them.

### 0.1 Minimum window: 1 s → 2 s

The PRD asked for the shortest window that still passes. Every fixture was
truncated to each length below, at every start offset in 0.5 s steps, and the
worst error over all positions recorded.

| window | worst error | fixtures outside tolerance |
|---|---|---|
| 1.0 s | 81 rpm | 1 of 7 |
| 1.5 s | 81 rpm | 1 of 7 |
| 2.0 s | 56 rpm | 0 of 7 |
| 3.0 s | 39 rpm | 0 of 7 |
| 5.0 s | 39 rpm | 0 of 7 |

`standard-recording-2.wav` is the one that fails, at 81 rpm against a 73 rpm
tolerance. 1.0 and 1.5 s score identically because the analysis window is 1 s
and both admit exactly one of them.

**Decision: `MIN_CLIP_S` rises from 1 to 2.** Accuracy is flat from 3 s
upward, so nothing is gained by demanding more. Per the PRD this constant stays
coupled to the load gate, so clips between 1 s and 2 s now fail at load rather
than at Calculate.

Consequences, all carried into `tasks.md`:
- The too-short message hardcodes "at least 1 second" and must be derived from
  the constant instead.
- Phase 3 tested the minimum crop window at 1.0 s (**B3** in its review).
  That review is closed; the change is recorded in this phase's review instead.

### 0.2 A confidence threshold is worth having

The PRD asked whether "no peak in the lag range" suffices. It does not: the
autocorrelation always has a maximum somewhere. What separates an engine from
noise is how sharply that maximum stands out. Two candidate measures were run
over the fixtures and over synthetic non-engine audio.

| input | peak height | peak minus preceding trough |
|---|---|---|
| seven fixtures, worst window | 0.51 | 0.55 |
| seven fixtures, median window | 0.70-0.86 | 0.92-1.31 |
| white noise | 0.13 | 0.15 |
| near-silence | 0.11 | 0.28 |
| tone plus noise | - | 0.27 |
| amplitude-modulated tone | - | 0.00 |

**Decision: confidence is the median over windows of peak minus preceding
trough, and the threshold is 0.45.** It sits between the worst fixture window
at 0.55 and the loudest false positive at 0.32, with room on both sides. The
peak-height measure was rejected: it separates less cleanly and it scores a
flat envelope as perfectly periodic.

Known limitation: a pure synthetic tone scores 1.99 and would be reported as an
engine. Every realistic non-engine input tested scores below 0.33. Noted, not
guarded against.

### 0.3 The bandpass can be a cascade

`butter(2, [60, 2000], 'band')` is a 4th-order bandpass needing two biquads
with coefficients from a bandpass transform. Cascading a 2nd-order Butterworth
highpass at 60 Hz with a 2nd-order lowpass at 2000 Hz gives the same answer to
**0.06 rpm** across all seven fixtures, because the band spans a factor of 33 in frequency and
the two skirts never interact.

**Decision: three identical-shaped 2nd-order sections** — highpass 60 Hz,
lowpass 2000 Hz, lowpass 150 Hz — each from the standard bilinear-transform
formulas at Q = 1/√2. One small function instead of a pole-mapping routine, and
each section is checkable against a hand-computed response.

## 1. Module layout

```
src/dsp/
  wav.ts        exists, unchanged
  biquad.ts     2nd-order section design + zero-phase apply
  envelope.ts   bandpass, rectify, smooth
  autocorr.ts   per-window rate and confidence
  pulses.ts     peak positions, the cross-check
  analyse.ts    orchestration, rpm, octave resolution
  types.ts      AnalysisResult, AnalysisError
src/analysis/
  worker.ts     wraps analyse()
  client.ts     posts a clip, resolves a result
src/state/useAnalysis.ts
src/ui/RangeFields.tsx, CalculateButton.tsx, ResultLine.tsx
```

`src/dsp/` imports nothing outside itself. `src/waveform/peaks.ts` is the
drawing helper from phase 3 and is unrelated to `src/dsp/pulses.ts`; the names
are close enough to warrant a comment in both.

## 2. Signal chain

All stages run at 16 kHz on `Float32Array`, in `Float64Array` internally where
the filters need the headroom.

1. **Highpass 60 Hz, lowpass 2000 Hz**, each a 2nd-order Butterworth section.
2. **Full-wave rectify**, `Math.abs`.
3. **Lowpass 150 Hz**, one more section. This is the envelope.

Each section is applied **zero-phase**: forward, then reversed, then reversed
back. Without that the envelope shifts in time and the pulse positions that
phase 5 draws would sit off the combustions. Edges are handled by odd extension
over `3 * (2 * sections + 1)` samples, matching what scipy's `sosfiltfilt`
does, so the first and last few milliseconds are not artefacts.

## 3. Rate estimate

Per non-overlapping 1 s window:

- Subtract the window mean, autocorrelate, normalise by the zero-lag value.
- Search lags from `sr / 100` to `sr / 8`, which is 8 to 100 pulses per second,
  160 to 2000 samples.
- Refine the winning lag by parabolic interpolation over its two neighbours.
  Without this the estimate quantises to whole samples, which at the fast end
  of the range is a 6 % step.
- Confidence for the window is that peak minus the lowest value between lag 1
  and the peak.

The clip's rate is the **median** of the window rates, its confidence the
median of the window confidences. Median rather than mean because a single
window containing a door slam should not move the answer.

A tail shorter than 1 s is dropped. At the 2 s minimum that leaves two windows;
at the 10 s cap, ten.

## 4. Pulse positions

Peak picking over the envelope with the reference's parameters: minimum spacing
`0.6 * sr / rate` samples, minimum prominence `0.5 * stddev(envelope)`. The
count over the clip duration is the second estimate, method A in
`combustion-counts.md`, and the positions are what phase 5 draws.

Prominence is implemented as scipy defines it: from each peak, walk out both
ways until the signal rises above the peak again, take the highest minimum on
either side, and subtract. The two estimates agreeing within 3 % is an
acceptance criterion, so this is not decoration.

## 5. RPM and the expected range

`rpm = pulsesPerSecond * 60 * REVS_PER_PULSE`, with `REVS_PER_PULSE = 2` for
the 4-stroke single. Named constant, not a literal, so the deferred preset can
set it later without touching the DSP.

When both range fields are filled, the candidates `rpm / 2`, `rpm` and
`rpm * 2` are tested against the range. If exactly one falls inside it wins; if
several do, the one nearest the range midpoint wins; if none do, the unmodified
estimate is returned and the range is ignored. The range never widens or
narrows the answer, it only chooses among octaves, which is the only error mode
the method actually has.

## 6. Failure

`analyse()` returns a discriminated union rather than throwing, since the
worker boundary flattens exceptions. Codes: `too-short` (below the window
minimum, should be unreachable behind the load gate), `no-signal` (confidence
under 0.45). Messages live beside the input messages in the same style, so
phase 7 extracts them in one sweep.

## 7. Worker and state

`client.ts` creates the worker with `new Worker(new URL('./worker.ts',
import.meta.url), { type: 'module' })`, which Vite bundles without extra
config. The samples transfer rather than copy: at most 10 s at 16 kHz is
640 kB, and the clip is sliced fresh from `getWindowClip()` each time, so
handing away the buffer costs nothing.

`useAnalysis()` is a hook of its own rather than more surface on
`useAudioInput`. It holds `idle | running | done | failed`, cancels an
in-flight run when a new one starts, and resets to idle whenever the selection
or the clip changes, so a stale number never sits under a window it does not
belong to.

## 8. UI

Below the player: two number inputs for the range, a Calculate button, and one
line of result text. Deliberately unstyled beyond the existing classes. The
button is disabled while a run is in flight and while no clip is loaded. The
range inputs accept empty, and reject a min above a max by simply not applying
the range.

## 9. Tests

- `biquad.test.ts` — section coefficients against values computed by scipy, and
  magnitude response at DC, the corner, and the stopband.
- `envelope.test.ts` — a synthetic pulse train in, pulses at the right places
  out; zero-phase verified by checking a symmetric input stays symmetric.
- `autocorr.test.ts` — synthetic periodic signals at known rates, including one
  between two sample lags to exercise the interpolation; confidence high on
  those, low on noise.
- `pulses.test.ts` — prominence and spacing against hand-built inputs.
- `analyse.test.ts` — octave resolution table, failure codes.
- `analysis.fixtures.test.ts` — all seven fixtures inside `toleranceRpm`, the
  two estimators within 3 %, plus each fixture's rate against
  `test/fixtures/reference.json`, the per-fixture rates exported from the
  Python baseline, at 1 % tolerance. That file is what catches a port that is
  subtly wrong yet still plausible.

## 10. Out

No caching of results, no re-analysis on drag, no confidence shown to the user,
no second opinion when the two estimators disagree. All noted for phase 5 or
the backlog.
