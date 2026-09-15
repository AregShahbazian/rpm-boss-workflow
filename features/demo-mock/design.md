---
id: rb-demo-mock
feature: demo-mock
branch: feat/demo-mock
stage: design
created: 2026-09-15
---

# Design — A demo build with a simulated engine

## The shape of it

Five pieces, and only the third is new work in any interesting sense.

1. A build flag, `VITE_MOCK`, exactly parallel to `VITE_SAMPLES`.
2. `revbench/engine-processor.js`, copied in unchanged as a second worklet.
3. A mock capture that runs the synthesiser and the existing capture worklet in
   one `AudioContext`, taps the signal before the speakers, and hands chunks to
   the same `onChunk` the microphone path uses.
4. A throttle: an `AudioParam` under a slider, and the bounds arithmetic that
   keeps the slider inside what the app can honestly read.
5. The word "simulated", on screen, in seventeen languages.

Naming: **mock** throughout the code — the flag, the module, the `LiveSource`,
the existing `startMockCapture` — and **simulated** in every string a user
reads. The internal word says what it is to the person building it; the
user-facing word says what it is to the person looking at it. Neither has to
become the other.

## The flag

`vite.config.ts` gains a second constant beside the samples one, computed the
same way and for the same reasons:

```ts
const enabled = process.env.VITE_SAMPLES === '1'
const mockEnabled = process.env.VITE_MOCK === '1'
// …
define: {__SAMPLES__: JSON.stringify(enabled), __MOCK__: JSON.stringify(mockEnabled)},
```

Off unless asked for, in every mode. **This changed during implementation**, and
it took the samples with it: both flags used to default on for `command ===
'serve'`, which made `npm run dev` a different app from the one that ships. One
rule reads better than two and is worth the lost convenience — the convenience
is now a flag on the script, which is where it belongs. `src/globals.d.ts`
declares `__MOCK__: boolean` beside `__SAMPLES__`.

**Why not `FEATURES.mockLive`.** That constant is edited by hand and has to be
edited back. It has survived so far because nothing outside a working copy ever
wanted it on; the moment one build wants it on and another must not have it,
"remember to flip it back before the release" is the only thing standing
between the demo and the Play store. A flag the build sets cannot be forgotten.
This is the same argument `samples/index.ts` already makes about itself, and
the reason `SAMPLES_ENABLED` is deliberately not in `FEATURES`.

**The two flags stay independent.** `VITE_SAMPLES` keeps its meaning and its
default. The only place they are both set is `.github/workflows/deploy.yml`,
which is the one build that is a demo:

```yaml
- run: npm run build
  env:
    VITE_SAMPLES: '1'
    VITE_MOCK: '1'
```

`apk.sh` and `install.sh` gain `--demo`, which sets both flags: an APK to hand
someone who has no motorcycle, and the way the maintainer tests the demo on a
phone. `aab.sh` deliberately does **not** — the bundle is what goes to Play, and
no release on the store carries a simulated engine. `--samples` keeps meaning
what it means everywhere.

`dev.sh` carries the same vocabulary: `--samples`, `--demo`, and a `--build`
that builds and serves `dist/` rather than the source. So one flag, spelled the
same way, turns the demo on wherever the app is started from — and nothing has
to be exported by hand.

## Keeping it out of the other builds

`__MOCK__` is a compile-time constant, so `if (!__MOCK__) return` is a dead
branch and everything after it is dead code. That handles the button, the
slider and the badge. The synthesiser needs one step more, because
`new URL('./engine-worklet.js', import.meta.url)` emits an asset for any module
in the graph, whether or not the code that reaches it survives.

So the mock is two modules:

| | |
|---|---|
| `src/live/mock.ts` | statically imported. `MOCK_ENABLED`, the bounds arithmetic, and a `startMockCapture` that returns a `LiveCapture` synchronously. Nothing in it names the worklet. |
| `src/live/mock-engine.ts` | `import()`ed from inside `if (__MOCK__)`, and the only module that holds the worklet URL and the audio graph. |

With the constant false, the dynamic import sits in an unreachable branch,
Rollup removes it, `mock-engine.ts` never enters the graph, and no worklet asset
is emitted. **This is an assumption about the bundler and it is verified by a
task, not by reasoning**: task 12 greps the built assets. If it turns out Vite
keeps the chunk anyway, the fallback is an alias in `vite.config.ts` pointing
`./mock-engine` at an empty stub when the flag is off — more machinery, same
result, and only if measurement says it is needed.

**Measured, 2026-09-15: it drops out.** The fallback was not needed. Two things
the check turned up that the reasoning above did not predict:

- A worklet under Vite's 4 KB inline limit is not emitted as a file at all — it
  is a `data:text/javascript;base64` URL inside the main chunk, which is what
  happens to `capture-worklet.js` (608 bytes). So "no asset" has two shapes, and
  looking only at `dist/assets/` would have proved nothing. `engine-worklet.js`
  is 4,510 bytes with its header note and lands over the line as a real file,
  `assets/engine-worklet-<hash>.js`, present in the demo build and absent from
  the bare one — and no base64 blob in the bare build decodes to it either.
- A React branch is only dead if the *constant* says so. `{simulated && <Slider/>}`
  keyed on `live.source === 'mock'` is unreachable in a bare build but not
  statically so, and it kept the whole `Slider`, its emotion CSS and the extra
  grid row in the bundle. `const simulated = MOCK_ENABLED && live.source === 'mock'`
  is what makes it go: redundant to the running app, load-bearing to the
  bundler.

## The audio graph

One `AudioContext`, made in the click handler that starts the mock, so the
autoplay policy is satisfied by the gesture that asked for it.

```
EngineWorklet ─┬─→ GainNode(level) ─→ destination     the visitor hears it
               └─→ CaptureWorklet ─→ batcher(ctx.sampleRate) ─→ onChunk
                        └─→ GainNode(0) ─→ destination
```

Three things follow from drawing it this way rather than any other way:

- **The tap is before the speakers.** Muting the device, pulling the
  headphones, or a phone whose ringer is down changes what the visitor hears
  and nothing about what the dial reads. That is the acceptance criterion about
  the muted device, and it is a property of the graph rather than something to
  be careful about.
- **One clock.** The sound and the samples are the same samples, generated
  once, in the same render quantum. The old mock's `setInterval` had to
  reconcile itself against `performance.now()` precisely because it had a
  second clock (`chunksOwed` exists for that reason, and goes with it).
- **The capture node still needs its muted sink.** A worklet whose output
  reaches nothing is rendered with silence at its input. The mic path already
  does this and the comment there explains it; the mock inherits the same two
  lines.

`level` is the worklet's own `AudioParam`, left at its default 0.5, and the
gain node at 1. One number sets both what is heard and what is measured, which
is what makes the muted-device property true. The DSP normalises, so the exact
figure is a comfort decision and not an accuracy one.

## Reusing the microphone's tail

`liveWorklet` in `stream.ts` is, after `getUserMedia` returns, exactly the graph
above minus the speakers: a context, the capture worklet, a batcher, a muted
sink. That part comes out as its own function and both callers use it:

```ts
export interface CaptureTail {
  /** The node the audio comes from: a MediaStreamSource, or the synthesiser. */
  source: AudioNode
  context: AudioContext
}

export async function captureFrom(
  {context, source}: CaptureTail,
  {onChunk, onOpen, onError}: LiveOptions,
  label: string,
): Promise<void>
```

The mock builds its own context (it needs one before the source node exists
anyway) and passes the engine node in. The microphone keeps its
`getUserMedia`, its error mapping and its track cleanup, none of which the mock
has any use for — no permission is asked for and there is no device to release.

This is a refactor of working code on the path the whole feature depends on, so
it lands as its own task with the microphone re-tested before anything is built
on top of it.

## The synthesiser

`engine-processor.js` is copied to `src/live/engine-worklet.js` **byte for
byte**, and the copy is the point. Its constants — the 120/180 Hz exhaust ring,
the 1000 Hz noise corner, the 7% amplitude jitter, the 1.2% period jitter — are
measured limits, not taste: `revbench/README.md` records that above roughly 10%
amplitude spread the autocorrelation starts preferring two or three periods to
one. Editing it here would mean re-earning numbers that were already earned,
against a sweep that lives in the other repo. It is loaded the way the capture
worklet is loaded, by `new URL(…, import.meta.url)`, because that is what
`addModule` takes.

Two divergences are accepted and written into the file's header comment: the
copy is the app's, `revbench` remains the place the sweep runs, and if one
changes the other does not follow automatically. The alternative — a shared
package for one 98-line file — costs more than the duplication it removes.

`oxlint` runs over `src`, so the copy must pass it. Expect nothing: it is the
same dialect as `capture-worklet.js`, which already sits there.

## Driving it

The rpm and the stroke reach the running worklet as `AudioParam` values, not as
messages:

```ts
node.parameters.get('rpm').value = 1500
node.parameters.get('revsPerPulse').value = revs
```

Both are `k-rate`, so a change takes effect at the next render quantum — about
3 ms — and the worklet reads them at the top of `process` with no protocol, no
message queue and no chance of a dropped update. The processor already jitters
each period around whatever `rpm` says, so a change mid-cycle produces the next
combustion at the new spacing. There is no gap in the sound, which is
requirement 10 satisfied by the mechanism rather than by care.

`LiveCapture` gains one optional method:

```ts
export interface LiveCapture {
  stop: () => void
  /** The mock only: what about the engine should change, from now on. */
  tune?: (engine: Partial<MockEngine>) => void
}
```

Optional, because the microphone cannot be tuned and should not have to say so
in a no-op. **Partial**, which the first draft was not: the two callers each
know one half — the slider sets a speed, the settings set a stroke — and making
each carry the other's value meant `useLive` holding a ref to remember the
current rpm. The engine's handle already remembers it, so it is the one that
merges. That removed the ref, and with it two lint complaints about a hook
modifying state an effect depends on. `startMockCapture`'s wrapper remembers the last `tune` it was given
before the graph opened and applies it on open, so a slider dragged during the
half-second the context takes to start is not lost.

`useLive` already holds the stroke in a ref and updates it on change; that
effect gains one line, `capture.current?.tune?.(…)`, so a rider who switches to
two-stroke mid-demo gets the engine switched with the analysis and the dial
never moves. That is requirement 5 — the same speed on both settings — and it
is why the demo follows the setting instead of carrying its own.

## What the slider may reach

Three bounds, and the tightest wins.

**The floor.** `FLOOR_RPM` in `ui/dial.ts` is already `MIN_RATE * 60 *
REVS_PER_PULSE` = 600 rpm, the bottom of what the estimator searches. Below it
the app has nothing to say, so the slider does not go there.

**The dial.** The visitor's own `maxRpm` setting, which may be as low as 9,000.
A demo that drives the needle onto the stop is showing a broken instrument.

**The truth.** The top of what the synthesiser and the analysis agree on. In
principle this is `MAX_RPM` for both strokes: `rateRangeFor` scales the search
by `rateScale(revsPerPulse)`, so 12,000 rpm is 100 combustions/s on a
four-stroke and 200 on a two-stroke, and the app searches to each. In practice
what has been *measured* is narrower, and it was measured against the Python
baseline's fixed four-stroke range rather than the app's scaled one:
revbench reports clean to 11,700 rpm four-stroke and 5,850 two-stroke, and that
second figure is 97.5 combustions/s — the baseline's ceiling, not the app's.

So the top was a number to be measured, not argued. **Measured 2026-09-15**
(`features/demo-mock/evidence/`): the sweep was run with the search range scaled
to the engine rendered — which is what the app does and what revbench's own
`check.py` does not, and the whole reason its two-stroke table stops at 5,850.
Every speed from 600 to 12,000 reads back inside 1.1% on both strokes. So the
ceiling is `MAX_RPM` for either engine, the `Record` collapses, and the bounds
take one argument:

```ts
export const MOCK_MAX_RPM = MAX_RPM
export const mockRpmBounds = (maxRpm: number) => ({
  min: FLOOR_RPM,
  max: Math.min(maxRpm, MOCK_MAX_RPM),
  step: 100,
})
```

Worth keeping from the numbers: on a two-stroke the confidence falls from 1.18
at the floor to 0.63 at 12,000, where the combustions arrive 200 a second. Still
clear of `MIN_CONFIDENCE` (0.45), but that is the figure that would give way
first if the envelope or the search were ever retuned.

`step: 100` is a drag resolution, not a precision claim.

## Settling

The window is 2 s and the reading is the median of five, so a slider moved from
one end to the other takes about a second and a half to be told the truth
about, and the windows in between contain a sweep rather than a speed. This is
correct behaviour and it is also good demo behaviour — it is what the needle
does when a real engine is blipped — but it means "the reading agrees with the
setting" is a statement about a settled reading. The review checklist says so,
and the acceptance criterion is read that way.

Nothing is done to hide the transit. Freezing the needle while the slider moves
would be the app lying about the one thing this feature exists to show.

## State and the screen

`LiveState` gains `source?: LiveSource`, set when live mode starts. It is what
the badge and the slider key off; `status === 'listening'` alone cannot tell
the two sources apart, and the badge must never appear over a microphone
reading (requirement 18).

`useLive` returns one more thing, `tune`, bound to the capture ref. The hook's
shape is otherwise unchanged.

`LiveStage` grows a row. The stage is `grid-rows-[4fr_1fr]` today — dial and
figure over the strip that holds either the start buttons or the scope. With
the mock running it becomes `4fr 1fr auto`, the new `auto` row holding the
slider. An `auto` row costs nothing when it is empty, which is every other
state of the screen.

- **The badge** sits over the dial, not under it: absolutely positioned at the
  top of the tacho's box, centred, in the muted colour, the same way
  `LiveStats` sits over the scope. Over the dial is the only place that makes a
  screenshot of the needle carry the caveat, which is requirement 17's whole
  point.
- **The buttons.** Listen keeps `tone="go"` and its oversized word. The mock
  button sits beside it at the default tone — the real thing is the primary
  action even on the demo build — with `mdi:flask-outline` kept from the
  current mock and a translated label beside it.
- **The slider** is `kit.tsx`'s new `Slider`: a labelled `input type="range"`
  with the set figure beside it, `tabular-nums`, `dir="ltr"` like every other
  number in this app. The label names it as the simulated engine's speed, so
  the control reads as part of the simulation and not as something acting on
  the app (requirement 19). The set figure and the measured figure are never
  adjacent: one is in the strip at the foot, one is the big number under the
  dial.

`Slider` is a new kit component rather than a bare input because the app styles
its own controls and a platform range input in a dark theme is the one control
that does not follow `color-scheme` reliably across the WebView and the
desktop browsers. Thumb and track get explicit colours from the palette.

## The strings

Three keys, in `en.ts` with their context comments, then in all sixteen
translation files. `test/i18n.test.ts` already fails a bundle with a missing
key, so the compiler and the test between them make "all seventeen" checkable
rather than aspirational.

| key | English | note for translators |
|---|---|---|
| `mockEngine` | Simulated engine | The button that starts live mode from a synthesised engine instead of the microphone. |
| `simulated` | Simulated — not a real engine | Shown over the dial the whole time the synthesised engine is running. It has to be readable as a disclaimer at a glance. |
| `mockSpeed` | Simulated speed | Labels the slider that sets how fast the synthesised engine turns. |

`rpm` stays untranslated, as it already does everywhere else.

These are user-facing strings in a demo a stranger reads, so they are not the
place for the app's internal word. "Mock" appears nowhere on screen.

## The performance readout

`FEATURES.mockLive` currently gates two unrelated things: the mock button and
the stats readout. It becomes `FEATURES.liveStats`, gating only the readout,
and keeps being a hand-edited constant — which is right for it, because unlike
the demo it is never wanted in *any* build, only in a working copy for an
afternoon. `useLive`'s stats gathering and `LiveStats`'s header comment follow
the rename.

## What goes

- `src/live/mock.ts`'s current body: the sample loop, `chunksOwed`,
  `readLooped`, `MOCK_SAMPLE`/`MOCK_FROM_S`/`MOCK_TO_S`. The file keeps its
  name and its job and loses its implementation.
- `test/mock.test.ts`, which tests exactly those two functions. There is
  nothing equivalent to replace it with: what the new mock does is make an
  audio graph, and the assertions worth making about it are the ones a browser
  makes. The Playwright pass is where this feature is verified.
- The samples dependency. Nothing in the mock path reads `SAMPLES_ENABLED` any
  more, and `MOCK_AVAILABLE` in `LiveStage` becomes `MOCK_ENABLED`.

## What a release build actually costs

`npm run build` on `main` is 376,416 bytes; on this branch, 378,447. The
**+2,031** is entirely the three new strings in seventeen languages, spread
across the sixteen lazy language chunks (+2,192 — Thai, Hindi, Bengali and
Armenian cost more per character). `index.js` itself came out **489 bytes
smaller** than main's: the sample-looping mock it replaced — the fetch, the
decode, `chunksOwed`, `readLooped` — was live code in every build, and the
synthesiser that replaced it is in none.

The strings are the one part that cannot be flagged away. `en.ts` is a single
object and every bundle is typed against it, so a key that exists for the demo
exists everywhere. Requirement 25 asks for no button, no slider, no synthesiser
and no asset, and gets all four; the honest footnote is 2 KB of translations.

## Open questions

1. ~~**The two-stroke ceiling**~~ — answered above, measured.
2. ~~**Does the chunk really drop out**~~ — answered above, measured, with two
   findings the reasoning had missed.
3. **Landscape.** The slider adds a row to a stage that is 360 px tall on a
   phone on its side. If it crowds the scope, the answer is to put the slider
   *over* the scope the way the badge sits over the dial, not to shrink the
   dial. To be judged when the screen is driven, not now.
