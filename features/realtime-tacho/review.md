---
id: rb-live-tacho
feature: realtime-tacho
branch: feat/realtime-tacho
stage: review
status: closed — B1-B18 confirmed by the maintainer
closed: 2026-09-15
created: 2026-09-14
commits: 08511e4..157559f (10 on the branch, unpushed)
---

# Review — Realtime tachometer

Review only: findings and a checklist, no fixes. Approved fixes land on the
branch as `fix(...): ... [rb-live-tacho]`.

The boxes in section B are the maintainer's. Items Claude drove itself are
marked **(agent-verified)** with what it saw; that is evidence, not a tick.

## A. Automated

| Check | Result |
|---|---|
| `npm test` | 377 passed, 28 files (this feature adds 34 in 5 files) |
| `npm run lint` | clean |
| `tsc -b` + `npm run build` | clean, 303.0 kB JS / 99.2 kB gzipped |
| Bundle growth | +14.3 kB raw, **+4.5 kB gzipped**, against the 10 kB budget in PRD criterion 12 |
| `scripts/install.sh --samples` | signed release APK, installed and exercised on the AGM G3 |

## B. Manual checklist

- [X] **B1** (agent-verified) At rest, the dial is drawn with the needle at 0, the reading is `---`, and the strip at the foot holds the way in. Portrait and landscape, dark and light.
- [X] **B2** (agent-verified) Mock drives the dial: needle at ~1.6, reading 1584-1632 against sample 6's reference of 1603, scope drawing continuously across the loop seam. Nothing audible.
- [X] **B3** (agent-verified) While live runs, Record, Open and Sample are disabled and Settings is not.
- [X] **B4** (agent-verified) Portrait, on the phone at 360 CSS px: the stop button sits to the right of the settings icon, 96 px against an icon button's 48. It wrapped to its own line at the original 12 px row gap; see D2.
- [X] **B5** (agent-verified) Landscape: the stop button spans the full width of the source row, on the line below it.
- [X] **B6** (agent-verified) Stop returns the screen to rest — needle 0, `---`, the way in back, source buttons enabled — five times running.
- [X] **B7** (agent-verified) Losing the foreground stops live mode: the reading goes to `---`, the stop button goes, the source row comes back.
- [X] **B8** (agent-verified) A refused microphone shows the existing error line ("Microphone blocked. Allow it, then try again.") above the status, and the stage is hidden while it stands. Dismiss brings the stage back.
- [X] **B9** (agent-verified) The settings dialog has a border; below the theme section a divider, then "Tachometer settings", closed on open, holding the needle-movement row. It held two rows until D6 removed one.
- [X] **B10** (agent-verified) The choice persists: `rpm-boss.live.motion` in `localStorage`, read back after a reload.
- [X] **B11** The needle visibly steps once per reading with motion set to *step*, and glides with *smooth*. Claude confirmed the two code paths and saw smooth motion; how it *feels* was the maintainer's call.
- [X] **B12** Cutting the sound drops the needle to 0 and the line to `---`. This was two behaviours behind a setting until it was tested: holding the last figure read as the dial lying about a stopped engine, and the option was removed rather than defaulted away. See D6.
- [X] **B13** (agent-verified) Recording still works end to end after the plugin change: 4.9 s captured on the phone, decoded, waveform drawn, crop, Play and Calculate all present.
- [X] **B14** A real engine, at idle and blipped. The needle follows, and the figure agrees with what the batch path says about the same engine.
- [X] **B15** A bike that idles low — under 960 rpm — now reads instead of failing. This is what moving `MIN_RATE` was for and no fixture covers it.
- [X] **B16** Two minutes of live mode on the phone without the app growing warm enough to throttle. Claude ran three minutes with no stall; heat was the maintainer's to judge.
- [X] **B17** The screen stays awake for the length of a live session and goes back to the device's own timeout after Stop. See D7.
- [x] **B18** After the merge, the same passes on the deployed site.

## C. Findings

Raised by Claude against its own diff at the code-review stage, with the
maintainer's disposition.

- **C1** ✅ fixed — `client.current?.run(...)` could have frozen the loop for good: an undefined client short-circuits the whole chain, `then` included, so the in-flight flag would never clear and every later tick would return early. Live mode would go on drawing a dial it had stopped measuring. Unreachable today, silent if it ever were not.
- **C2** ✅ fixed — the in-flight flag now clears in `finally`, so a rejection unblocks the loop as well. `AnalysisClient.run` is documented to settle every request; this loop should not be the thing that finds out otherwise.
- **C3** ✅ fixed — the pointer cursor sat in the colour branch of `Button`, which left the two red buttons, stop recording and stop listening, as the only things on screen that did not say they could be pressed.
- **C4** ⏸ left alone by decision — `Tacho` redraws the whole face every frame while the needle eases, where `WaveformCanvas` rasterises precisely to avoid that. The phone held 62 fps with no analysis skipped, so the offscreen face would buy nothing visible and costs a second canvas and a cache-invalidation rule. The move to make *if* the dial ever gets heavier.
- **C5** ⏸ deferred by decision — `useLive` has no test of its own; only `displayRpm` is covered. Testing the hook needs a DOM, and vitest runs under `environment: 'node'` here, so it means a `jsdom` devDependency and an env switch for one file. Larger than the hazards it would catch, both of which C1 and C2 closed structurally. Recorded as a gap in D4.
- **C6** ⏸ declined by the maintainer — the sub-floor segment of the dial (0-600 rpm) is 5% of the sweep and barely reads as "cannot measure here". The figure under the dial says it plainly enough.
- **C7** ⏸ declined by the maintainer — `mock.ts` does not check its slice against the clip's length. Sample 6 is 15.9 s so the 3-13 s window fits, but a shorter sample would give an empty slice, `readLooped` would divide by zero and the whole path would see NaN as silence. It is a developer's tool and is not being polished.

## D. What changed outside the plan

- **D1** The dial is sized by `faceIn` rather than `min(w, h) / 2` as design §6 and PRD requirement 23 said. A 240-degree sweep is two radii wide and 1.87 tall, so fitting the box rather than a circle inside it makes the dial noticeably bigger in landscape, which is the shape a phone on a tank rail is in.
- **D2** The source row's gap went from 12 px to 8 px, in both layouts. At 12 px, four icon buttons and the double-width stop came to 336 px in a row 328 px wide on a 360 px phone, and the stop dropped to a line of its own in portrait — where PRD requirement 5 puts it beside the settings icon. Caught on the device, not in the browser; see D5.
- **D3** A race was found on the phone during the measurement and fixed inside the implementation stage rather than left for review. An analysis occupies about 60 ms of every 200, so roughly a third of stops landed while one was in the worker; its result then arrived at a torn-down hook and set the screen back to `listening` — stop button on screen, a reading on the dial, but the timer cleared, the ring gone and the scope blank, permanently. A generation counter makes a late result recognise that nobody is waiting for it.
- **D4** No test covers `useLive`. See C5.
- **D6** The *hold last value* fallback was removed after B12, along with its storage key, its picker row and its three strings in seventeen languages. Falling to zero is now the only behaviour, not the default of two. A dial that goes on showing 1600 after the engine has stopped is a worse lie than one that admits it lost the sound, and that is not a judgement worth handing to a rider as a setting.
- **D7** Live mode holds a screen wake lock. It is the one screen nobody touches — the phone is propped against the engine and the rider is turning a screw — so the display timeout would otherwise take it mid-measurement. `navigator.wakeLock`, which needs no permission and no native code and is in the Android WebView; released on Stop, including when the stop beats the request.
- **D5** The Playwright browser reports `innerWidth` 480 at a 360-wide window, at `devicePixelRatio` 0.75, so laptop widths in this pass are not the CSS widths they look like. The narrow-screen checks in B4 were done on the phone for that reason, and D2 is the defect that slipped through because of it.

## E. Measured performance

PRD criterion 17. Two minutes against the mock on the laptop, three on the
phone in a release APK.

| | laptop | phone (AGM G3) |
|---|---|---|
| analyses completed | 607 | 850 |
| typical | 42 ms | 62 ms |
| worst | 63 ms | 109 ms |
| **ticks skipped** | **0** | **0** |
| audio received per second | 1.00 | 1.00 |
| scope frame rate | 120 | 62 |

Against the 200 ms between readings that is a 21% duty cycle on the laptop and
31% on the phone, with nothing dropped at either end.

**The decision this was for:** there is headroom, and it has not been spent.
Design §13b lists what to spend it on — a longer window, a wider smoothing
median, the octave continuity rule — in that order. None of it is done here,
because none of it is needed to ship what the PRD asked for, and each changes
what the app answers.

## F. Still open

- The octave question the PRD raised and this feature did not answer: with
  600 rpm reachable, a 1,200 rpm idle has a half-octave inside the valid range
  where it used to fall outside it. The median of five discards a single bad
  reading, which is a mitigation and not an answer. B14 and B15 passed, so it
  did not show on the engines tested — which is evidence and not a proof, and
  the continuity rule in design §5 stays on the shelf rather than in the bin.
- PRD criterion 6, a tone swept from 600 to 12,000 rpm reading across the whole
  dial, is unverified: only ~1,600 rpm was ever driven through it.
- PRD criterion 5's "verified by the platform's own recording indicator" is
  unverified. The app's own state was checked instead.
