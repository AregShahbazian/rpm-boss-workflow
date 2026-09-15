---
id: rb-demo-mock
feature: demo-mock
branch: feat/demo-mock
status: ready
created: 2026-09-15
depends_on: [rb-live-tacho]
---

# PRD — A demo build with a simulated engine

## Goal

Someone who opens https://areg.nl/rpm-boss/ with no motorcycle in the room can
use the whole app — including the live tachometer — and see it arrive at a
number, without ever being led to believe the number came from a real engine.

## Why

The web build is the demo linked from the workflow/career page. It is how a
stranger — a recruiter, a reader of the docs, anyone who follows the link —
finds out what the app does. Today that visitor can do about a third of it.

The batch path is already solved: the bundled samples give them audio to point
the app at, which is exactly why `VITE_SAMPLES=1` exists and why the closed
testers got it. The live tachometer is the part that has no answer. It is the
feature the 1.3 release and the whole store listing are built around, and a
visitor without an engine sees a dial at zero, a Listen button, and — if they
press it — a microphone permission prompt followed by silence and dashes. The
most interesting thing the app does is the one thing the demo cannot show.

There is already a mock live source in the source tree. It loops ten seconds of
`sample-6.m4a` and is gated by `FEATURES.mockLive`, a constant edited by hand
and never shipped on. It was built to test live mode away from a running
engine, and it does that. What it cannot do is be the public demo: it exists to
be switched on in a developer's working copy, it silently depends on the
samples being in the build, and it is not spoken about on screen at all — a
visitor pressing it would see a live reading with nothing saying where the
sound came from.

`~/git/revbench` already holds the missing piece: a synthesised single-cylinder
engine, four-stroke or two, which rpm-boss reads back to within 0.5% over
600–11,700 rpm. It was written to be played at a phone across a room. Playing
it inside the app instead is the demo.

## User stories

1. As a visitor with no engine, I can start live mode, hear an engine, and
   watch the needle settle on a number — the whole feature, in one press.
2. As that visitor, I can then open the engine up and close it again, and watch
   the needle follow me — which is the thing a tachometer is for, and the thing
   a still needle at a fixed speed cannot show.
3. As that same visitor, I can tell at every moment that the sound is
   simulated, both before I press and while it runs.
4. As a visitor who *does* have an engine nearby, the real Listen button still
   works exactly as it does today, beside the simulated one.
5. As a user of any of the seventeen languages, every new label is in mine.
6. As the maintainer, I can still test live mode at my desk, in `npm run dev`,
   without a flag to remember or a recording to depend on — and sweep the
   detector across its whole working range while I am there.
7. As the maintainer, I can be sure the Play build carries none of it — no
   button, no synthesiser, no slider, no dead code, no bytes.

## Requirements

### The simulated source

1. A second button sits beside Listen on the resting screen. Pressing it starts
   live mode from a synthesised engine instead of the microphone.
2. The synthesised engine starts at **1500 rpm** and does not stop, drift or
   loop back to a beginning: it runs until live mode is stopped.
3. The sound **plays out loud**, through the device's speakers, at a level a
   visitor will hear without turning anything up.
4. The app does **not** listen to it through the microphone. The signal reaches
   the analysis inside the app; no microphone permission is requested, and the
   room's own noise has no effect on the reading.
5. The dial reads the speed the engine is set to, to the same tolerance a real
   engine at a steady idle would read, and it reads that same speed whether the
   user's engine setting says four-stroke or two.
6. Stopping live mode stops the sound. Nothing keeps playing behind a stopped
   dial, and nothing is left running when the screen is left.
7. The real Listen button is unchanged and still works, on the same screen, in
   the same session, before or after the simulated one has run.

### The throttle

The demo exists to show a tachometer working, and a tachometer at a fixed speed
shows a picture of one. The visitor has to be able to move the needle.

8. While the simulated source is running, a slider sets the engine's speed.
9. The slider is shown **only** while the simulated source is running. It is
   not on the resting screen, and never while the microphone is the source.
10. Moving it changes the sound and the reading immediately — the visitor hears
    the engine open up and sees the needle follow, in one gesture. No confirm,
    no restart of live mode, no gap in the sound at the moment it changes.
11. Its range is bounded by what the demo can tell the truth about: the slider
    cannot reach a speed at which the synthesised engine and the analysis
    disagree. That bound depends on the engine setting — a two-stroke fires
    twice as often at the same speed and so reaches the detector's ceiling at
    half the rpm — and the slider respects the difference rather than offering
    a range that only one of them is honest over.
12. The slider is bounded below by the same floor: it cannot reach a speed too
    slow for the detector to read.
13. It also cannot leave the dial's own face — a demo that drives the needle
    past the end of the scale is showing a broken instrument, not a working one.
14. Its current value is readable as a number, so the visitor can compare what
    the engine was told to do with what the app worked out on its own. The two
    figures are distinguishable at a glance: one is the setting, one is the
    measurement.
15. The setting is not remembered. Every start of the simulated source begins
    at 1500 rpm again.

### Saying it is simulated

16. The button says what it is, in words, not only by an icon.
17. While the simulated source is running, the screen carries a visible,
    persistent mark that the reading is of a simulated engine — placed so that a
    screenshot of the dial cannot be mistaken for a measurement.
18. That mark is absent when the microphone is the source. A real reading is
    never decorated with a caveat that does not apply to it.
19. The slider is legible as part of the simulation rather than as a control of
    the app, so it is not mistaken for something that acts on a real engine.
20. Every new string is translated into all seventeen languages, like every
    other user-facing string in the app.

### Which build carries it

21. The demo is decided by the **build**, not by an edit to a source constant —
    the same way the samples are decided, and for the same reason: the build
    that results is the build that ships.
22. It is **on** for `npm run dev`, so testing live mode at a desk needs no
    flag.
23. It is **off** for any build, unless explicitly turned on. A bare
    `npm run build`, `./scripts/apk.sh`, `./scripts/aab.sh` and
    `./scripts/install.sh` all produce the app as it is today.
24. The web deploy to areg.nl turns on **both** the samples and the demo. That
    is the one build that carries either, and it is the only place the two are
    coupled.
25. A build without the demo contains no part of it: no button, no slider, no
    synthesiser, and no asset emitted for one.

### What it replaces

26. The existing sample-looping mock source goes. The synthesised engine is the
    only mock live source, and it does not depend on the samples being present.
27. The performance readout under the scope — runs, ms, skipped, capture ratio
    — stays, and stays a developer's affordance. It is separated from the mock
    it currently shares a flag with, and keeps a hand-edited constant of its
    own.

## Acceptance criteria

- On a build with the demo on: pressing the simulated button plays an engine
  aloud, shows the simulated mark and the slider, and settles the dial at
  1500 ± the tolerance a steady idle gets, with no permission prompt.
- The same build, with the device muted: the dial still reads 1500. The reading
  does not come from the room.
- Four-stroke and two-stroke both read 1500.
- Dragging the slider from one end of its range to the other: the sound rises
  and falls with it, the needle follows within the smoothing's own lag, and the
  reading agrees with the setting at every stop along the way — including both
  ends, on both engine settings.
- The slider cannot be put anywhere the two disagree.
- Stop and start the simulated source again: the slider is back at 1500.
- Stop, then Listen: the microphone path runs, with no mark and no synthesised
  sound underneath it.
- `npm run build` with no flags: the built bundle contains no reference to the
  synthesiser, and no worklet asset for it. Byte size within a kilobyte of
  today's.
- `npm test` and `npm run lint` pass.
- Every new string is present in all seventeen message files.

## Non-requirements

- **No presets.** The slider is the only way to change the speed: no idle/redline
  buttons, no typed figure, no stepper.
- **No revbench parity.** Waveform display of the synthesised signal, the
  two-stroke comparison, the WAV export, the twelve-speed sweep — all stay in
  revbench. This is one button, one slider.
- **The slider is not a second engine setting.** It drives the simulation only.
  Two-stroke versus four-stroke stays where it is, in the settings, and the
  simulated engine follows it rather than offering its own.
- **Not a test harness.** The fixtures and `npm test` are unaffected; this does
  not become a way to assert DSP accuracy.
- **Not on Play.** No release to the store carries it, and no flag in a store
  build turns it on.
- **Nothing is recorded.** The simulated audio is not savable, croppable or
  loadable into the batch path. Live mode records nothing, and that does not
  change because the source did.
- **No settings entry.** The demo is not a preference, not in the settings
  sheet, and neither it nor the slider's position is remembered between
  sessions.
- **The samples flag is untouched.** `VITE_SAMPLES` keeps its current meaning
  and its current default; the two flags are independent everywhere except in
  the deploy workflow, which sets both.
