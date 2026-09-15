---
id: rb-live-tacho
feature: realtime-tacho
branch: feat/realtime-tacho
stage: design
created: 2026-09-14
prd: prd.md
---

# Design — Realtime tachometer

## 1. Shape of the change

Four things have to exist that do not: a microphone that streams instead of
recording, a loop that turns the stream into a number, a dial that draws the
number, and two preferences that say how the dial behaves when the number goes
away. Three of the four exist on `poc/live-rpm` and are ported rather than
invented; the dial is new.

```
src/
  live/
    ring.ts          NEW   ported verbatim from the PoC
    stream.ts        NEW   ported, minus the PoC's instrumentation hooks
    mock.ts          NEW   sample 6 on a timer, wearing the same interface
  audio/
    native.ts        EDIT  `stream` option, `frames` event, FramesEvent type
  state/
    useLive.ts       NEW   ported, rewritten: no LiveStats, adds visibility stop
    useAudioInput.ts EDIT  expose `fail(code)` so live errors reach the one error line
  dsp/
    types.ts         EDIT  + MAX_RPM, REDLINE_RPM
    autocorr.ts      EDIT  MIN_RATE 8 -> 5; MAX_RATE derived from MAX_RPM
  ui/
    LiveStage.tsx    EDIT  placeholders out, the three real parts in
    Tacho.tsx        NEW   canvas dial
    LiveScope.tsx    NEW   canvas scope, drawn like the recorded waveform
    liveSettings.ts  NEW   two persisted preferences, modelled on theme.ts
    kit.tsx          EDIT  Sheet border, Button shape 'stop', Picker extracted
    palette.ts       EDIT  + fg
    LanguagePicker.tsx EDIT  uses the extracted Picker
    SettingsButton.tsx EDIT  divider + collapsible tachometer section
    InputScreen.tsx  EDIT  stop button, disabled source row, live wiring
  features.ts        EDIT  + mockLive
  i18n/
    en.ts + 16 locales EDIT  ten new keys
android/.../RawAudioPlugin.java  EDIT  stream mode (ported from the PoC)
```

## 2. Data flow

```
AudioRecord / AudioWorklet            sample 6, 3.0-13.0 s, looped
        |                                     |
        |  2048-frame slices, 16 kHz mono Float32
        v                                     v
   startLiveCapture (live/stream.ts)   startMockCapture (live/mock.ts)
        \___________________  ______________/
                            \/
                          onChunk
        v
      Ring  (2 s, fixed, overwritten oldest-first)
        |                               \
        | snapshot() every 200 ms         \ latest(tail) every animation frame
        v                                  v
  AnalysisClient.run(clip)            LiveScope canvas
  (the same worker Calculate uses)
        |  Analysis
        v
     useLive: median of the last 5, `quiet` when a window yields nothing
        |
        v
   displayRpm(reading, quiet, fallback)  -- pure, testable
        |
        +--> Tacho canvas   (needle, smooth or step)
        +--> the reading line ("1 480 rpm" or "---")
```

Nothing is ever stored: the ring is the only copy of the audio and it is
constant-size, so a session that runs for an hour costs what one that runs for
two seconds costs.

## 3. Capture

`live/stream.ts` and `live/ring.ts` come across from the PoC unchanged in
substance. What the port has to carry with it:

- `RawAudio.start({maxS, stream: true})` and a `frames` listener, which means
  `RawAudioPlugin.java` gains its streaming branch: slices of 2048 frames
  emitted as events, nothing accumulated, the same `maxS` cap applied to bytes
  emitted rather than bytes held.
- `LIVE_MAX_S = 600` stays. It is not a session cap in the product sense — PRD
  requirement 11 says live mode runs until stopped — it is the native side
  refusing to hold the microphone forever if the web side dies without calling
  `stop`. Reaching it stops the capture and the screen returns to rest.
- The browser path (`AudioWorklet`) is the development loop and is ported with
  it; `MIC_CONSTRAINTS` keeps echo cancellation, noise suppression and AGC off,
  for the same reason recording does.

## 3b. The mock source

The whole point is that it is not special. `startLiveCapture` and
`startMockCapture` have the same signature and return the same `LiveCapture`,
so the choice is made once, at the top, and nothing below the boundary is told
which it got:

```ts
// live/mock.ts
export const MOCK_SAMPLE = 6
export const MOCK_FROM_S = 3
export const MOCK_TO_S = 13

export function startMockCapture(options: LiveOptions): LiveCapture
```

```ts
// useLive
export type LiveSource = 'mic' | 'mock'
start(source: LiveSource)   // picks the function, and that is the entire difference
```

How it works: `fetch(sampleUrl(6))` once, `decodeToClip` (the same decode the
Sample button uses, so the clip arrives at 16 kHz mono), slice 3.0–13.0 s, then
emit 2048-frame chunks on a timer, wrapping to the start of the slice when it
runs out. The cursor is kept modulo the slice length, so the loop is continuous
rather than restarting a buffer.

The timer paces itself against the wall clock rather than trusting its own
interval: each tick emits as many whole chunks as `(now - startedAt)` says are
owed, so a throttled background tab or a slow frame does not drift the
"real-time" claim. 2048 frames is 128 ms at 16 kHz, matching what the native
side delivers.

Nothing is connected to an `AudioContext` destination, which is the whole of
requirement 29: the samples exist as numbers and the only thing that consumes
them is the ring.

Failures — the fetch, the decode — go to the same `onError` as a refused
microphone, mapped to `listen-failed`. A broken mock should look like a broken
microphone, not like a crash.

**Gating.** `FEATURES.mockLive && SAMPLES_ENABLED`. The flag is edited in
source and defaults to `false`; the samples constant is decided by the build.
Both must hold for the button to render, so a release build without samples
cannot show a button that would 404 (requirement 30).

## 4. The loop

`useLive` keeps the PoC's structure and loses its instrumentation. `LiveStats`
was the PoC's whole point and is not shipped; what survives is the guard it
proved necessary — a tick that fires while the previous analysis is still
running is dropped, not queued.

```ts
export type LiveStatus = 'off' | 'starting' | 'listening'

export interface LiveState {
  status: LiveStatus
  /** The last reading that succeeded, median of the last LIVE_SMOOTH_N. */
  reading?: number
  /** True when the most recent window produced nothing. */
  quiet: boolean
}

export function useLive(onError: (code: InputErrorCode) => void): {
  live: LiveState
  ring: React.RefObject<Ring | undefined>
  start: () => void
  stop: () => void
}
```

Constants, from the PoC and unchanged: `LIVE_WINDOW_S = 2` (the `MIN_ANALYSIS_S`
floor, so the reading is as quick as the DSP allows), `LIVE_INTERVAL_MS = 200`
(90 % overlap between consecutive windows), `LIVE_SMOOTH_N = 5`,
`LIVE_SCOPE_S = 0.25`.

The median is not a nicety: when the estimator is wrong it is wrong by an
octave, and a mean of 1 400 and 2 800 is a number no engine ever turned.

**Errors.** `useLive` does not render anything, so it reports through the
callback and `InputScreen` passes `fail` from `useAudioInput`. That puts a
refused microphone into `state.error` and onto the existing error line, above
the existing status, with the existing Dismiss — requirement 9, with no second
error mechanism. `record-failed` is remapped to a new `listen-failed` code on
the way, because "Recording failed" is the wrong sentence for a mode that
records nothing.

**A consequence worth stating.** `status` becomes `error`, and the stage is
drawn only when `status === 'idle'`. So a refused microphone hides the stage,
error line and all, and Dismiss brings it back with the Start button on it.
That is the behaviour asked for ("stage hidden when there's a mic problem") and
it is the reason the error is not rendered inside the stage.

**Backgrounding.** `useLive` listens for `visibilitychange` and `pagehide` and
calls its own `stop` when the document hides — requirement 10, with no
`@capacitor/app` dependency and no foreground service. The existing unmount
cleanup (`useEffect(() => stop, [stop])`) stays; between the two, there is no
path that leaves the microphone open.

## 5. Range constants

```ts
// dsp/types.ts
export const MAX_RPM = 12_000
export const REDLINE_RPM = 9_000

// dsp/autocorr.ts
export const MIN_RATE = 5                               // 600 rpm
export const MAX_RATE = MAX_RPM / 60 / REVS_PER_PULSE   // 100, as today
```

`MAX_RATE` evaluates to exactly the literal it replaces, so no fixture moves.
`MIN_RATE` does move, and what it moves is `lagMax = floor(sampleRate /
MIN_RATE)`: 2 000 samples becomes 3 200. The autocorrelation itself is
FFT-based, so the cost is the linear peak scan and not the transform; the
guard `lagMax + 1 >= window.length` still passes comfortably at one second of
16 kHz audio.

**The octave risk, concretely.** The peak scan now reaches lags twice as long,
which is exactly where a sub-harmonic sits. An engine at 1 200 rpm has a
600 rpm candidate that used to fall outside the search and now does not, and
the live path has no expected-range fields for `resolveOctave` to consult. This
is the PRD's one open question and it is *not* resolved here. It is bounded,
though: the fixtures are the regression net for the batch path, and the live
path's median-of-five discards a single octave-halved reading. If it proves
real, the cheapest answer is a live-only continuity rule — prefer the candidate
nearest the last accepted reading — and that is a change to `useLive`, not to
the DSP.

## 6. The dial

`Tacho.tsx`, a canvas, sized by `useElementSize` and painted at `devicePixelRatio`,
the same pattern `WaveformCanvas` uses.

```ts
interface Props {
  /** The value to point at, or undefined for "nothing to say". */
  rpm?: number
  motion: Motion
}
```

Geometry, all derived, no fixed pixel sizes (requirement 23):

```ts
const START_ANGLE = 150   // degrees, clockwise from 3 o'clock
const SWEEP = 240
const radius = Math.min(width, height) / 2 - strokeWidth
export const rpmToAngle = (rpm: number) =>
  START_ANGLE + (clamp(rpm, 0, MAX_RPM) / MAX_RPM) * SWEEP
```

`rpmToAngle` is exported and unit-tested; nothing else about the drawing is.

What is drawn, in order: the track arc in `palette.muted`; the sub-floor
segment of it — 0 to `MIN_RATE` converted to rpm — at reduced alpha, so the
region the app cannot read looks unlike the region where the engine is stopped
(Should 26); the redline arc from `REDLINE_RPM` to `MAX_RPM` in `palette.error`;
major ticks every 1 000 with `0`–`12` labels in `palette.fg`, minor ticks every
500 in `palette.muted`; the needle in `palette.accent`.

`palette.ts` gains `fg` (`--color-fg`) for the labels. Canvas text is ASCII
digits regardless of language — the same call the review made for the result
figure: it is a gauge reading, not a sentence.

**Motion.** A `requestAnimationFrame` loop eases the drawn value toward the
target, `next = current + (target - current) * (1 - Math.exp(-dt / TAU))` with
`TAU ≈ 120 ms`, and parks itself when the two are within a tenth of an rpm —
an idle screen runs no frames. With `motion: 'step'` there is no loop at all:
the value is drawn on change. That is why the setting is a prop of this
component and not a filter applied before it.

## 7. The scope

`LiveScope.tsx` reads `LIVE_SCOPE_S` of tail out of the ring every animation
frame and draws it. The PoC drew an oscilloscope line; this draws what the
recorded waveform draws, because requirement 22 asks the two to match: one
column per device pixel, `computePeaks` over the tail, a `fillRect` from min to
max per column in `palette.muted`.

It keeps the PoC's auto-scaling — an engine two metres away is quiet enough
that a fixed scale draws a flat line — with the same `NOISE_FLOOR = 0.002`
below which the tail is drawn flat rather than amplified into noise.

Cost is one `computePeaks` over 4 000 samples plus ~300 `fillRect`s per frame.
`WaveformCanvas` rasterises precisely to avoid that per frame, but it redraws
thousands of columns of a static signal; here the signal is new every frame and
there is nothing to cache. If it proves too much on the phone, the answer is to
draw the scope at 30 fps rather than to change how it looks.

## 8. The reading

DOM, not canvas, so it inherits the app's type and the rtl layout:
`{value === undefined ? '---' : Math.round(value)} {t('rpm')}`, styled like the
result view's figure but sized to its own strip — `clamp(1.5rem, 8vmin, 3rem)`
rather than the result's `clamp(3rem, 12vmin, 6rem)`, because the strip is a
fifth of the stage and the result's figure is the whole answer on its screen.

## 9. The two preferences

`liveSettings.ts` is `theme.ts` again, with the same tolerance for storage that
throws and the same shape of hook:

```ts
export type Fallback = 'zero' | 'hold'
export type Motion = 'smooth' | 'step'
export const FALLBACKS: readonly Fallback[] = ['zero', 'hold']
export const MOTIONS: readonly Motion[] = ['smooth', 'step']
export const DEFAULT_FALLBACK: Fallback = 'zero'
export const DEFAULT_MOTION: Motion = 'smooth'
export function useFallback(): [Fallback, (v: Fallback) => void]
export function useMotion(): [Motion, (v: Motion) => void]
```

Keys `rpm-boss.live.fallback` and `rpm-boss.live.motion`, beside
`rpm-boss.theme`.

Where `fallback` is applied — one pure function, which is the part worth
testing:

```ts
export function displayRpm(live: LiveState, fallback: Fallback): number | undefined {
  if (live.status !== 'listening') return undefined
  if (!live.quiet) return live.reading
  return fallback === 'hold' ? live.reading : undefined
}
```

`undefined` means needle at 0 and `---` on the line, which is also the resting
state, so one rendering path covers both.

## 10. The settings modal

- `Sheet` in `kit.tsx`: `border-0` becomes `border border-solid border-btn`.
  Both halves are needed — Preflight is not imported, so a width with no style
  draws nothing, and a style with no width draws `medium`.
- A `<hr>` after the theme fieldset, styled `border-0 border-t border-solid
  border-btn` for the same reason.
- The new section is a native `<details>` with a `<summary>`, closed by
  default. No state, no JS, keyboard and screen reader behaviour for free —
  the same argument that made the dialog a `<dialog>` and the language a
  `<select>`. The theme section is untouched (PRD: out of scope).
- Two rows inside, each a label and a `<select>` on one line.

`LanguagePicker` already owns the only styled `<select>` in the app, in a `css`
block. Rather than copy that block twice, it is extracted into `kit.tsx`:

```ts
export function Picker<T extends string>({label, value, options, onChange, layout = 'column'}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
  layout?: 'column' | 'row'
}): React.ReactElement
```

`LanguagePicker` becomes a caller of it (`layout="column"`), the two new rows
use `layout="row"`. This is the styling PRD's "no style statement written
twice" rule applied to the third copy before it exists.

## 11. The screen

`InputScreen` gains the live wiring and nothing else moves:

```ts
const {live, ring, start, stop} = useLive(fail)
const listening = live.status !== 'off'
const rpm = displayRpm(live, fallback)
```

- **Source row:** `disabled={busy || listening}` on Record, Open and Sample
  (requirement 8). Settings stays enabled.
- **Stop button:** the last child of the source row, rendered only while
  `listening`, with a new `Button` shape:
  `stop: 'w-24 flex-none justify-center p-0 split:w-full'`. The row already
  wraps, so a full-width child in landscape lands on its own line under the
  others, which is requirements 5 and 6 without a second element and without a
  grid area. Portrait gets 96 px — twice the icon button, as asked.
- **Stage:** `LiveStage` takes `{live, ring, rpm, motion, onStart}` and renders
  either the Start button or the scope in the lower fifth; the dial and the
  reading are always drawn, at 0 and `---` when there is nothing.
- **Mock button:** when `FEATURES.mockLive && SAMPLES_ENABLED`, the lower fifth
  holds two buttons of equal size rather than one — `onStart('mic')` and
  `onStart('mock')` — split down the middle of the same strip, so the resting
  screen keeps its proportions either way. Its label is the bare word "Mock",
  untranslated: it is a developer's button and translating it would put a
  debug string in front of sixteen translators.

`LiveStage`'s dashed placeholders and the `BOX` constant go. The 80/20 and
80/20 splits it already carries stay exactly as they are.

## 12. Strings

Ten keys, English first, then all sixteen translations in the same pass:

| key | English |
|---|---|
| `listen` | Listen |
| `stopListening` | Stop listening |
| `tachoSettings` | Tachometer settings |
| `liveFallbackLabel` | When the reading is lost |
| `liveFallbackZero` | Drop to zero |
| `liveFallbackHold` | Hold last value |
| `liveMotionLabel` | Needle movement |
| `liveMotionSmooth` | Smooth |
| `liveMotionStep` | Step |
| `errorListenFailed` | Could not start listening. Try again. |

`---` is not a string. It is punctuation and reads the same in every language,
like the ASCII separators phase 8 settled on.

## 13. Tests

New unit tests, all pure, no DOM:

- `test/ring.test.ts` — wrap-around, `snapshot` order, `latest` shorter than
  the ring, a chunk longer than the ring.
- `test/live.test.ts` — `displayRpm` across the four combinations of `quiet`
  and `fallback`, plus `status !== 'listening'`.
- `test/tacho.test.ts` — `rpmToAngle` at 0, `MAX_RPM`, above `MAX_RPM`
  (clamped), and monotonic in between.
- `test/liveSettings.test.ts` — modelled on `theme.test.ts`: defaults, a
  stored value, a corrupt value, and storage that throws.
- `test/mock.test.ts` — the loop cursor: chunks are contiguous, the wrap joins
  the end of the slice to its start with no gap and no repeat, and the total
  emitted per second of wall time is one second of audio.

Existing tests: `autocorr.test.ts` already reads `MAX_RATE` as a symbol rather
than as 100, so the derivation lands without touching it. Nothing anywhere
asserts 960 rpm or `MIN_RATE === 8`, so the floor moves without a test edit —
which is itself worth a line in the review, because it means the floor was
never covered.

The i18n parity test walks the message files and will fail until all sixteen
locales carry the ten new keys, which is the intended gate.

## 13b. Performance analysis at review

The review stage measures this feature rather than eyeballing it, because the
whole design rests on an assumption — that a phone can run the batch analysis
five times a second — that the PoC tested on one device and nothing has tested
since.

**The instrument already exists.** `LiveStats` is dropped from `useLive` in §4
as PoC scaffolding; it comes back for the review, behind the same debug flag as
the mock, as a small readout under the scope. The numbers are the PoC's,
because they are the right four:

| number | what it answers |
|---|---|
| `avgMs`, `maxMs` | how long one analysis takes, typical and worst |
| `skipped` | ticks that fired while the previous analysis still ran |
| `captureRatio` | seconds of audio received per second of wall time |
| scope fps | whether the 60 fps redraw of §7 is actually 60 |

`skipped` is the headline. Zero over a two-minute run means the device keeps up
at `LIVE_WINDOW_S = 2` and `LIVE_INTERVAL_MS = 200`; a rising count means it
does not, and by how much.

**Measured on both**, because they are different machines: the laptop browser
(the development loop, and the optimistic case) and the phone in a release APK,
which is the number that decides anything. The mock source makes the two
comparable — the same ten seconds of audio, looped, on both.

**If there is room to spare**, accuracy is what to spend it on, in this order:

1. **A longer window.** `LIVE_WINDOW_S` is at the `MIN_ANALYSIS_S` floor of 2 s
   precisely because it was the cheapest thing that works. Three or four
   seconds averages a blip of throttle away and makes the octave decision
   safer, at the cost of reacting slower — which is the trade the backlog
   already wants to hand the user as a slider.
2. **A wider smoothing median.** `LIVE_SMOOTH_N = 5` at 200 ms is a second of
   history. More of it costs nothing per analysis, only lag.
3. **An octave continuity rule** — §5's answer to the open question. It is
   arithmetic against the last reading, so it is nearly free; it is listed here
   because it is worth doing only if the rest fits.

**If it is the bottleneck**, in this order, cheapest sacrifice first:

1. **The scope to 30 fps** (§7). Costs nothing anyone can see, and it is the
   only part of the frame budget that is not the analysis.
2. **A longer `LIVE_INTERVAL_MS`.** 300 ms still overlaps windows by 85 % and
   removes a third of the work. The needle's easing (`TAU`) hides it.
3. **A shorter window.** Below `MIN_ANALYSIS_S` the analysis refuses outright,
   so this is a floor, not a dial — 2 s is already it.
4. **A cheaper envelope.** `envelope()` runs `filtfilt` three times over the
   window; a live-only path could drop to a single forward pass and accept the
   phase shift, which the autocorrelation does not care about. This is the
   first change that makes the live answer differ from the batch answer, and it
   is not made without saying so in `review.md`.
5. **Decimate before the autocorrelation.** The envelope is smoothed at 150 Hz
   and then correlated at 16 kHz; at the rates being searched, 4 kHz carries
   every lag of interest and quarters the transform. This is the largest win
   available and the one most likely to move a fixture, so it is a phase of its
   own if it is needed at all, not a fix folded into this one.

Whichever way it goes, the numbers and the decision go into `review.md` as
evidence, and any change that makes the live estimate differ from the batch one
is called out there explicitly rather than left in a constant.

## 14. Order of work

Bottom-up, so nothing is written against a thing that does not exist yet:
constants and the DSP floor; the ring and the stream; the plugin; `useLive`;
the dial; the scope; the settings and their pickers; the screen wiring; the
strings. Tasks doc next.

## 15. Open questions for implementation

1. **The octave risk of §5** — measured, not argued. If a real engine at
   1 200–1 500 rpm reads half on the phone, the continuity rule goes in.
2. **Scope cost** — if 60 fps of `computePeaks` plus 300 `fillRect`s is too
   much, drop the scope to 30 fps before changing its look.
3. **`LIVE_INTERVAL_MS` against `TAU`** — 200 ms between readings and a 120 ms
   easing constant should read as continuous. If the needle looks stepped
   anyway, `TAU` is the knob, not the interval.
4. **Whether the mock should be able to sweep** — a fixed 1 603 rpm loop proves
   the path but never moves the needle. Resampling the loop slowly up and down
   would exercise the smoothing and the redline, and is a small addition to
   `mock.ts` if the flat reading turns out to test too little.
5. **Which `maxS` the native cap gets** — 600 s is the PoC's. A session that
   dies at ten minutes with no explanation is worse than one that does not, so
   the review should check what the screen does when it fires.
