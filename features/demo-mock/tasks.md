---
id: rb-demo-mock
feature: demo-mock
branch: feat/demo-mock
stage: tasks
created: 2026-09-15
---

# Tasks — A demo build with a simulated engine

> **Status, 2026-09-15.** Tasks 1–13 implemented on `feat/demo-mock`. Task 14,
> the browser pass, was **not** run: the maintainer is testing this build
> himself first, and asked for it to be left to him. Code review has not been
> run either. What the implementation did differently from what is written
> below is recorded at the foot of this file.

Fourteen, in order. Each one leaves the app working: the flag exists before
anything reads it, the microphone is re-tested before the mock is built on top
of its plumbing, and the strings land before the Playwright pass that reads
them. Commits reference `[rb-demo-mock]`.

`npm test` and `npm run lint` pass at every task, and are not restated below
except where a task adds something for them to say.

---

## 1. The flag

**`vite.config.ts`** — a second constant beside the samples one, computed the
same way, and a second entry in `define`. The comment above it says what it
gates and that it is independent of the samples, so the next reader does not
have to work out whether the pair is deliberate.

**`src/globals.d.ts`** — `declare const __MOCK__: boolean`.

**`src/live/mock.ts`** — `export const MOCK_ENABLED = __MOCK__` at the top, with
the module comment rewritten to describe what this file is about to become. The
old body stays for now; nothing is deleted until task 6 replaces it.

**Verify:** `VITE_MOCK=1 npm run build` and `npm run build` both succeed.
`console.log(__MOCK__)` from a scratch edit reads `true` under `npm run dev`,
`false` under a bare build. Revert the scratch edit.

## 2. Split the readout off the mock

**`src/features.ts`** — `mockLive` becomes `liveStats`. Its doc comment loses
the paragraph about the Mock button and keeps the paragraph about the readout;
the file's header note about `SAMPLES_ENABLED` gains `__MOCK__` as a second
example of a flag the build decides.

**`src/state/useLive.ts`**, **`src/ui/LiveStats.tsx`** — follow the rename,
including in `LiveStats`'s header comment and in the `LiveStats` interface's
doc comment in `useLive.ts`, both of which name `FEATURES.mockLive` in prose.

**`src/ui/LiveStage.tsx`** — `MOCK_AVAILABLE` becomes `MOCK_ENABLED` from
`mock.ts`, and stops consulting `SAMPLES_ENABLED`. The mock button's comment
stops calling it a debug button; it is about to be translated.

**Verify:** `grep -rn "mockLive" src/` is empty. The Mock button appears under
`npm run dev` with `FEATURES.liveStats` false — which it could not before, and
which is the point of the split.

## 3. The synthesiser

**`src/live/engine-worklet.js`** — `~/git/revbench/engine-processor.js`, copied
without an edit to its code. A header note is *prepended*, saying where it came
from, that the constants in it are measured by `revbench/scripts/check.py`, and
that the two copies do not track each other.

**Verify:** `diff <(tail -n +N src/live/engine-worklet.js) ~/git/revbench/engine-processor.js`
is empty for the right N. `npm run lint` passes over it.

## 4. Lift the capture tail out of the microphone

**`src/live/stream.ts`** — extract everything `liveWorklet` does after
`getUserMedia` into `captureFrom({context, source}, options, label)`: the
capture worklet, the batcher, the muted sink, `context.resume()`, `onOpen`.
`liveWorklet` keeps the permission, the error mapping, the track cleanup and
the `stopped` guards, and calls it. No behaviour changes.

**Verify:** this is the risky one, so it is verified before anything depends on
it. `npm run dev`, press Listen, hum at the laptop, watch the dial read.
Stop, start again, stop. Deny the permission once and confirm the sentence is
still the right one.

## 5. The audio graph

**`src/live/mock-engine.ts`** — new. Exports `openMockEngine(options, engine)`,
which makes the `AudioContext`, adds both worklet modules, builds the graph in
the design, and returns `{stop, tune}`. It holds the only reference to
`engine-worklet.js`, and nothing statically imports it.

The engine node connects twice: through a gain node to the destination, and
into the capture tail from task 4. `stop` posts `'stop'` to the processor,
disconnects, and closes the context.

**Verify:** temporarily import it from `useLive` and start it. The engine is
audible and the dial reads about 1500. Undo the temporary import.

## 6. The mock, rewritten

**`src/live/mock.ts`** — the sample loop, `chunksOwed`, `readLooped` and the
three `MOCK_*` sample constants go. What remains is `MOCK_ENABLED`,
`MOCK_START_RPM = 1500`, the bounds helpers from the design, and a
`startMockCapture` that returns a `LiveCapture` synchronously while
`await import('./mock-engine')` runs inside `if (__MOCK__)`. It remembers the
last `tune` it was handed before the graph opened and applies it on open, and
its `stop` is idempotent and safe before the graph exists.

`MOCK_MAX_RPM` is written with a placeholder equal to `MAX_RPM` and a `TODO`
naming task 9. Task 9 replaces it.

**`test/mock.test.ts`** — deleted. It tests two functions that no longer exist.

**Verify:** `npm test` passes with one test file fewer. The mock button starts
the engine and the dial settles at 1500.

## 7. The source reaches the screen

**`src/state/useLive.ts`** — `LiveState` gains `source?: LiveSource`, set in
`start` and cleared by `OFF`. The hook returns `tune`, which forwards to
`capture.current?.tune?.()`. The existing effect that keeps `revs.current` up
to date also tunes a running mock, so the stroke setting and the simulated
engine cannot disagree.

**Verify:** start the mock, open the settings, switch to two-stroke and back.
The dial stays at 1500 through both, and the sound changes pitch character at
the switch (a two-stroke at 1500 fires twice as often).

## 8. The slider control

**`src/ui/kit.tsx`** — `Slider`: label, `input type="range"`, the set value
shown beside it in `tabular-nums` and `dir="ltr"`. Track and thumb take their
colours from the palette explicitly, in both themes. 48 px hit height, like
`Button`.

**Verify:** both themes, at 360 px and at desktop width. Keyboard: focus ring
visible, arrow keys move it, and the figure follows.

## 9. Measure the ceiling

Run revbench's own sweep, with the two-stroke rate range matched to the app's
scaled one rather than the Python baseline's fixed four-stroke range:

```bash
cd ~/git/revbench && python3 scripts/check.py --rpm-boss ~/git/rpm-boss
```

Read the two tables. `MOCK_MAX_RPM` in `mock.ts` takes the highest speed each
stroke reads back clean, rounded *down* to the next hundred. If both are clean
to the top of the dial, the `Record` collapses to a single constant and the
design's paragraph about the two-stroke cap goes with it.

The constants carry the measurement in their comment — what was run, what it
printed, on what date — the way `MIN_RATE` and `AMP_JITTER` already do in this
codebase.

**Verify:** the slider, driven to its top on each stroke setting, reads back
within the same tolerance a fixture gets. A stroke whose sweep is *not* clean
to the dial's top is a finding for `review.md`, written down rather than
quietly capped.

## 10. The screen

**`src/ui/LiveStage.tsx`** —

- the resting strip keeps Listen at `tone="go"` and gives the mock button a
  translated label beside the flask icon;
- the stage's rows become `4fr 1fr auto` while the mock runs, the `auto` row
  holding the `Slider`, bounded by `mockRpmBounds(revs, maxRpm)`;
- the badge goes over the dial: absolute, top, centred, muted, shown only when
  `live.source === 'mock'`.

`LiveStage` needs `revs` and `tune` passed down from `InputScreen`, which
already holds both.

**Verify:** portrait and landscape, both themes. The badge is over the dial in
every one of them and absent on the microphone path.

## 11. Seventeen languages

**`src/i18n/en.ts`** — `mockEngine`, `simulated`, `mockSpeed`, each with the
context comment the file's convention requires.

**`src/i18n/messages/*.ts`** — all sixteen. Bengali, Cebuano, Spanish, Filipino,
French, Hindi, Armenian, Indonesian, Malay, Portuguese, Russian, Swahili, Thai,
Ukrainian, Urdu, Vietnamese.

"Simulated" is the word to get right: it must not read as "fake" in the sense
of broken, nor as "demo" in the sense of a trial version. It says the engine is
not real.

**Verify:** `npm test` — `test/i18n.test.ts` fails any bundle missing a key, and
the compiler fails one with a key too many. Check Urdu in the app: the badge and
the slider label are both inside an RTL layout.

## 12. Prove the release builds are clean

```bash
npm run build && grep -rl "engine\|EngineProcessor" dist/assets | head
ls dist/assets | wc -l
du -sb dist
VITE_SAMPLES=1 VITE_MOCK=1 npm run build && ls dist/assets
```

The bare build must contain no worklet chunk for the synthesiser, no
`registerProcessor('engine'` anywhere, and no string from task 11's keys. Its
size is within a kilobyte of `main`'s.

**If the chunk is there**, the fallback is in the design: alias `./mock-engine`
to an empty stub in `vite.config.ts` when the flag is off. Take it, and say so
in `review.md` — it changes what the "no bytes" requirement cost, which is
worth recording.

**Verify:** also build the APK once, `./scripts/apk.sh`, and confirm its size
matches the last release's. That is the build the requirement exists for.

## 13. The deploy, and the README

**`.github/workflows/deploy.yml`** — `VITE_SAMPLES: '1'` and `VITE_MOCK: '1'`
on the build step, with a comment saying this is the demo build and why both
are on here and nowhere else.

**`README.md`** — the "Bundled samples" section gains a sibling about the
simulated engine: what the flag is, that it is on in dev, off in every build
that is not the website, and that the synthesiser comes from revbench. The
Deploy section says the site is built with both.

**Verify:** the workflow file parses (`gh workflow view` or a YAML lint). No
push — the deploy runs on merge to `main`, which is stage 7 and the
maintainer's.

## 14. The Playwright pass

The stage-4 gate: the feature is not implemented until it has been driven in a
real browser. Against `npm run dev`, at 360×740 and 740×360, in both themes:

1. Press the simulated button. The engine is audible, the badge is over the
   dial, the slider is at 1500, and the reading settles at 1500.
2. Drag the slider to its top, wait for it to settle, read. Then to its floor.
   Then back to 1500. The needle follows each time and the reading agrees at
   each stop.
3. Mute the machine and repeat one stop. The reading is unchanged.
4. Stop. The sound stops with it, the badge and the slider go, the buttons come
   back.
5. Press Listen. The microphone path runs, with no badge, no slider and no
   engine underneath it.
6. Switch to two-stroke and repeat 1 and 2.
7. Leave the tab and come back: `pagehide`/`visibilitychange` stop live mode,
   so the sound must not be playing behind a stopped dial.

Screenshots go to the scratchpad, not the repo. What was seen is reported in
the session, and the findings go to `review.md` at the review stage — not into
fixes during the pass.


---

## What the implementation did differently

Five, all small, all in `design.md` in full.

1. **Task 6 → `mockRpmBounds(maxRpm)`, not `(revs, maxRpm)`.** Task 9's sweep
   came back clean to 12,000 on both strokes, so the per-stroke ceiling the
   design provided for was not needed and the `Record` collapsed to one
   constant.
2. **`LiveCapture.tune` takes a `Partial`.** The slider knows a speed, the
   settings know a stroke, and making each carry the other meant a ref in
   `useLive` to remember the rpm — which the engine's own handle already does.
   Merging there instead removed the ref and two lint warnings with it.
3. **Two hooks in `useLive` sit below `start` and `stop`** rather than beside
   the ref they serve. `oxlint`'s `react(immutability)` rule will not have a ref
   read inside a hook callback and assigned by anything declared after it. The
   order is load-bearing and the file says so.
4. **`const simulated = MOCK_ENABLED && live.source === 'mock'`** — the constant
   is redundant to the running app and load-bearing to the bundler. Without it
   the `Slider`, its CSS and the extra grid row stayed in a bare build, because
   "unreachable" and "statically dead" are not the same thing.
5. **The defaults inverted, at the maintainer's instruction.** Both flags now
   default **off** everywhere, the dev server included, and `--demo` on
   `dev.sh`, `apk.sh` or `install.sh` turns them on — one flag, one script call,
   no environment variables. `dev.sh` absorbed the `demo.sh` this task list
   originally added, and gained `--build` (serve `dist/` instead of the source)
   and `--samples`. `aab.sh` deliberately has no `--demo`: the bundle is what
   goes to Play. PRD 13 and 14 were amended to match.

And one number to carry into the review: a bare build grows **2,031 bytes**, all
of it the three strings in seventeen languages. `index.js` itself shrank by 489.
