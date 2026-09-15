---
id: rb-live-tacho
feature: realtime-tacho
branch: feat/realtime-tacho
status: ready
created: 2026-09-14
depends_on: [4-analysis, 8-ui-overhaul]
---

# PRD — Realtime tachometer

## Goal

The rider points the phone at a running engine and watches the rpm change as it
happens, instead of recording ten seconds and asking for a number afterwards.

## Why

Every measurement the app makes today is a transaction: record or open, crop,
press Calculate, read a figure. That shape is right for a comparison — two
takes of the same engine, the same ten seconds, the same window — and wrong for
the job people actually do with a tachometer, which is turn a screw and watch
the needle move.

Tuning an idle is a loop. The screw goes an eighth of a turn, the engine
settles, the rider looks. With a stored recording that loop is four
interactions long and each pass measures a different ten seconds. Live, it is
the screw and the needle.

The algorithm already supports it: `analyse` works on a one-second window, and
`poc/live-rpm` demonstrated the whole path — a ring buffer, a stream off the
native recorder, and an oscilloscope — in a single commit. What that branch does
not have is a tachometer, a place on screen to put one, or any of the decisions
below. It is the reference for the design stage, not the branch this is built
on.

## User stories

1. As a rider tuning an idle screw, I watch the rpm change while I turn it,
   without pressing Calculate between turns.
2. As a rider, I can see at a glance that the app is hearing my engine, before
   I trust the number.
3. As a rider with a bike that idles low, or a generator at 1,800 rpm, I get a
   reading rather than a blank.
4. As a rider, when the app loses the engine for a moment, the dial does not
   lie to me about it.
5. As a user who prefers a steady number to a moving one, I can turn the
   smoothing off.
6. As a user of any of the seventeen languages, every new label is in mine.
7. As a user who has opened a recording, live mode is out of the way and does
   not compete with the file I am working on.

## What is already built

The layout landed ahead of this PRD, on the same branch, and is not up for
re-decision here:

- `LiveStage` fills everything under the source row when no clip is loaded. In
  landscape it takes the column the waveform occupies when a clip *is* loaded,
  so the screen does not change shape when a recording arrives.
- The stage splits 80 / 20 — tachometer over live waveform — and the
  tachometer splits 80 / 20 again, gauge over rpm reading, divided by a line
  rather than boxed off.
- Both halves are dashed placeholders. They are scaffolding and go when the
  real components land.

## Requirements

### Must — the two states

1. **At rest**, from app start: the dial is drawn with the needle at 0, the rpm
   line reads `---`, and the live-waveform section holds a single large Start
   button filling its full height.
2. **Start takes the microphone without recording.** Nothing is captured to a
   clip, nothing is decoded, nothing can be saved or cropped afterwards. This
   is a listening mode, and the distinction has to survive into the permission
   copy: the user is not being asked to be recorded.
3. **Running**, all three parts change together: the button's section becomes
   the live waveform, the needle follows the estimate, and the rpm line shows
   the figure.
4. **Stopping returns to rest** — needle to 0, `---`, Start button back.

### Must — the stop control

5. **Portrait:** to the right of the settings button in the source row, twice
   the width of an icon button, carrying a stop icon.
6. **Landscape:** under the source row, spanning its full width.
7. It exists only while live mode runs. Stopping removes it.

### Must — the rest of the screen

8. **Record, Open and Sample are disabled for the duration of live mode**, and
   re-enabled on stop. One microphone, one mode; a file cannot be opened into a
   screen that is already showing something live.
9. **Microphone refusal reuses the existing error treatment** — the same
   styling and the same placement, a line above the status — and returns the
   screen to rest.
10. **Losing the foreground stops live mode**, exactly as the stop button does:
    microphone released, needle to 0, Start button back. Nothing runs in the
    background, which is also what keeps the app clear of the foreground-service
    permissions Android would otherwise want.
11. **Live mode runs until it is stopped** — by the button, by backgrounding, or
    by the app closing. There is no cap of the kind `MAX_RECORD_S` puts on a
    recording, because nothing is being held in memory.

### Must — the range

12. **The gauge reads 0 to `MAX_RPM`, with `MAX_RPM` = 12,000**, major ticks
    every 1,000, and a redline arc from 9,000. The span covers the 110–155 cc
    singles the app is aimed at, whose redlines fall between 9,500 and 11,000.
13. **`MAX_RATE` is derived from `MAX_RPM`**, not stated separately:
    `MAX_RPM / 60 / REVS_PER_PULSE`. The estimator must not be able to return a
    number the dial cannot draw.
14. **`MIN_RATE` drops from 8 to 5** — a 600 rpm floor instead of 960. 960 was
    the bottom of the seven ground-truth clips, never a measured limit, and it
    excludes a Royal Enfield at 800–1,000, a mistuned bike hunting at 600–700,
    and a half-speed generator at 1,500 or 1,800. Five periods still fit the
    one-second window.
15. **The gauge's minimum is 0 and the estimator's is not.** A rate of zero is
    an infinite period; below the floor the app has nothing to say, and says so
    (requirement 17) rather than drawing a zero it did not measure.

### Must — motion and dropouts

16. **The needle is smooth by default.** `WINDOW_S = 1` yields a reading about
    once a second while the scope redraws at screen rate; the needle
    interpolates between readings instead of stepping.
17. **Two settings govern what happens when there is no estimate** — engine
    off, too quiet, below the floor, or under `MIN_CONFIDENCE`:
    - **Fallback:** *drop to 0* (default) or *hold the last value*.
    - **Motion:** *smooth* (default) or *step*.

    Both persist in `localStorage`, by the mechanism `theme.ts` already uses,
    including its tolerance for storage that throws.

### Must — the settings modal

18. **The modal gains a border.**
19. **Below the theme section:** a horizontal divider, then a section headed
    "Tachometer settings", **collapsed by default**, the header being the only
    thing visible when closed.
20. **Inside it, two rows**, each a label and a picker on the same row.
21. **Every new string is translated into all seventeen languages**, like every
    other string in the app.

### Must — styling

22. **The live waveform matches the recorded waveform's styling.** Same colours
    off the palette, same weight of line; it is the same signal, seen sooner.
23. **Each fills its own wrapper.** The gauge is drawn as large as the space
    it is given allows — scaled to the smaller of the box's two dimensions, not
    to a fixed pixel size — and the scope spans the full width and height of
    its strip. Neither leaves a margin of its own inside the stage; the stage's
    proportions are the only thing deciding how big either is, so the same
    components fill a landscape phone and a tablet without a second set of
    numbers.
24. **The gauge and the scope are deliberately minimal.** Refinement is a later
    feature, and this PRD does not describe a skeuomorphic dial.
25. **Both are drawn by hand, on canvas.** No gauge or charting dependency. The
    three candidate libraries each depend on d3 and re-render SVG through React
    per value, which is the wrong shape for a live needle in a WebView and
    several times the size of the whole current bundle. Redline, range and
    style are arcs; `usePalette` and `useElementSize` already exist for exactly
    this.

### Must — the mock source

26. **A debug flag, `mockLive`, in `features.ts`**, alongside `expectedRange`
    and read the same way: edited in the source, never at runtime, and off in
    what ships.
27. **With the flag on, a Mock button sits beside Start, the same size**, and
    starts live mode exactly as Start does.
28. **Mock replaces the microphone and nothing else.** The audio is sample 6,
    its 3.0 s to 13.0 s section, looped and delivered at real time. Everything
    below the capture boundary — the ring, the worker, the smoothing, the
    needle, the scope, the settings — is handed the same shape of data at the
    same rate and cannot tell which source it came from.
29. **The mock is never audible.** The clip is decoded into samples and fed
    forward; it never reaches an audio output.
30. **It degrades honestly.** Samples are a build-time inclusion
    (`SAMPLES_ENABLED`), so in a build without them the Mock button is not
    shown at all rather than shown and broken.

### Should

31. The sub-floor region of the dial should be visibly a region the app cannot
    read, rather than a region where the engine is stopped.
32. The Start button should say what it does in a word a rider would use, and
    not the word "record".

### Won't

- **Not a recording.** Live mode produces no clip, no waveform to crop, no
  result to save, and no download.
- **Not a second screen.** Everything happens in the stage already built; there
  is no live route, no tab, and no navigation.
- **Not the styling refinement.** Minimal is the brief, and a nicer dial is a
  later feature.
- **Not the 2-stroke preset.** `REVS_PER_PULSE` stays 2, as in the batch path;
  the preset is its own backlog item and lands for both paths at once.
- **Not vehicle presets or suggested ranges.** The dial is one range for
  everybody until there is a body of data behind the alternative.
- **Not a change to the batch path's UI.** Opening a file behaves exactly as it
  does today.
- **The mock is not a feature.** It is a test harness with a button: no
  persistence, no settings entry, no mention in any user-facing string, and no
  presence in a release build.
- **No merge of `poc/live-rpm`.** It is read for its approach; its code arrives
  only by being rewritten to fit what is here now.

## Acceptance criteria

1. From a cold start, the dial is visible with the needle at 0, the reading is
   `---`, and the Start button fills the live-waveform section — in both
   orientations and both themes.
2. Pressing Start prompts for the microphone on a fresh install, and on refusal
   the existing error line appears and the screen returns to rest.
3. With the engine running, the needle moves and the reading changes without
   any further interaction.
4. While live mode runs, Record, Open and Sample are visibly disabled, and the
   stop control is where requirements 5 and 6 put it, checked at 360×640 and in
   landscape.
5. Stopping restores the resting state exactly, and the microphone is released
   — verified by the platform's own recording indicator.
6. A tone swept from 600 to 12,000 rpm equivalent reads across the whole dial
   without clipping at either end, and nothing outside that range is ever
   displayed.
7. `MAX_RATE` is not a literal anywhere: changing `MAX_RPM` changes both the
   dial and the estimator's ceiling.
8. With fallback set to *hold*, interrupting the sound leaves the last figure
   in place; with *drop to 0*, the needle returns to 0 and the line to `---`.
9. With motion set to *step*, the needle jumps once per reading; with *smooth*,
   it does not.
10. Both settings survive a reload, and the app still starts when
    `localStorage` throws.
11. The settings modal has a border, the tachometer section is collapsed on
    open, and both rows read label-then-picker in Urdu as well as English.
12. No new runtime dependency, and the web bundle grows by less than 10 kB
    gzipped.
13. `npm test`, `npm run lint` and `npm run build` pass; the existing tests that
    assert the 960 rpm boundary have been updated deliberately, not deleted.
14. A release APK installs and runs live mode on the phone for two minutes
    without the reading stalling or the app growing warm enough to throttle.
15. With `mockLive` on, Mock drives the dial to roughly sample 6's reference
    figure of 1 603 rpm, indefinitely, with nothing audible and no gap in the
    scope where the loop wraps.
16. With `mockLive` off — the shipping default — no Mock button exists and no
    sample is fetched, on any screen.
17. The review records measured performance, on the laptop and on the phone,
    over a two-minute run against the mock: analysis time typical and worst,
    ticks skipped because the previous analysis had not finished, audio
    received per second of wall time, and the scope's actual frame rate. The
    figures decide what happens next — spare headroom is spent on accuracy, a
    shortfall is paid for in a named, recorded trade — and neither is decided
    before the numbers exist.

## Open questions for the design stage

Seven questions came out of the discussions. Six are answered, and the answers
are requirements above or the notes here; one is left for the design stage.

**Answered:**

- **Idle resolution.** The dial is one ordinary linear scale from 0 to 12,000.
  No second scale and no compressed lower region: the app is not only for idle
  tuning, and a dial that lies about its own linearity is worse than a needle
  that sits low.
- **Backgrounding and session length.** Requirements 10 and 11.
- **Section consistency in the modal.** Out of scope. The theme section is not
  touched; the tachometer section collapses and the theme section does not.
- **Ground truth for the new floor.** Not gathered. The 600 rpm floor is taken
  on the algorithm's own terms, and a low-idle fixture is a later job if the
  floor turns out to misbehave.

- **Estimator reuse.** Do what the PoC does: the full `analyse` — band filter,
  envelope, autocorrelation, pulse marking — in the worker, on a sliding window
  off a ring buffer, on an interval. No cheaper live-only estimator is written
  until this one is shown to be too slow or too rough, which is a measurement
  the implementation and review stages make (criterion 14), not an argument to
  have now.

**Still open:**

- **`resolveOctave` at the new floor.** With 600 rpm reachable, a 1,200 rpm idle
  now has a half-octave inside the valid range where it used to fall outside it
  and be rejected. Unresolved: what protects the live reading from settling on
  the wrong octave, given the live path has no expected-range fields to consult.

## Sources

- [`discussions/2026-09-14-realtime-tacho-layout-and-viz-libs.md`](../../discussions/2026-09-14-realtime-tacho-layout-and-viz-libs.md)
- [`discussions/2026-09-14-tacho-range-and-detection-limits.md`](../../discussions/2026-09-14-tacho-range-and-detection-limits.md)
- [`discussions/2026-09-14-realtime-tacho-requirements.md`](../../discussions/2026-09-14-realtime-tacho-requirements.md)
- `poc/live-rpm`, for the capture path and the oscilloscope.
