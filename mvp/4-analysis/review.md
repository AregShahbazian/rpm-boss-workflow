---
id: rb-analysis
feature: 4-analysis
branch: feat/4-analysis
stage: merged
status: closed 2026-09-10 — B1-B21 confirmed by the maintainer; merged as e917e1c, deployed
created: 2026-09-10
commits: a4e8601..481cac7 (20 on the branch, unpushed)
---

# Review — Analysis

Review only: findings and a checklist, no fixes. Approved fixes land on the
branch as `fix(...): ... [rb-analysis]`.

## A. Automated

| Check | Result |
|---|---|
| `npm test` | 148 passed, 15 files (analysis adds biquad 15, fft 6, envelope 4, autocorr 13, pulses 11, analyse 18, fixtures 35) |
| `npm run lint` | clean |
| `tsc -b` + `npm run build` | clean, 237 kB JS / 74.9 kB gzipped, plus a 4.6 kB worker chunk |
| `python3 scripts/reference/analyse.py` | reproduces `audio/combustion-counts.md` on all seven fixtures |

## B. Manual checklist

B1-B16 were driven by Claude in laptop Chrome through synthetic pointer events
and uploads, and what it observed is noted on each item. The maintainer
confirmed B1-B21 on 2026-09-10, phone included, and B20 on the deployed site
after the merge. Every box is ticked; the phase is closed.

- [X] **B1** (agent-verified) `after-cold.wav` at its default 0:00.0-0:06.4 window reads **1449 rpm · 12.08 combustions/s**, against 1449 from the scipy baseline and 1427 ± 62 from `expected.json` (AC 1, AC 4).
- [X] **B2** (agent-verified) Cropping the same clip to 0:00.0-0:03.8 and pressing Calculate reads **1450 rpm · 12.09**, against 1450 from the baseline over the same range. The window, not the clip, is what gets analysed.
- [X] **B3** (agent-verified) Moving the crop window clears the previous number before a new one is asked for, so no result is ever shown under a window it did not come from.
- [X] **B4** (agent-verified) An expected range of 2600-3400 on a clip reading 1449 gives **2898 rpm · range applied**, with the underlying 12.08 combustions/s unchanged (AC 5).
- [X] **B5** (agent-verified) With the range fields empty the same clip still reads 1449, so an unused range changes nothing (AC 5, second half).
- [X] **B6** (agent-verified) Non-engine audio is refused with "Couldn't hear a steady engine in that section", not a number (AC 6). Four clips in `audio/testing/` cover it — hiss, a quiet room, low rumble and speech-like modulation — scoring 0.00 to 0.22 against the 0.45 threshold. The fifth, `noise-tone.m4a`, is accepted at 1.77; that is **E2** below, and it is in the folder on purpose.
- [X] **B7** (agent-verified) A 1.5 s upload is refused at load with "That clip is too short. Record or pick at least 2 seconds" — the new minimum, named by the message rather than hardcoded.
- [X] **B8** (agent-verified) The 67.5 s `all-samples.m4a` shows the overview and detail pair, defaults to a 0:00.0-0:10.0 window, and reads **1608 rpm**, which is the first recording in that file (baseline 1607).
- [X] **B9** (agent-verified) Moving the window to 0:36.9-0:46.9 on the same file reads **1430 rpm**, a different recording in the join, confirming the window drives the answer.
- [X] **B10** (agent-verified) A 10 s window returns in **227 ms** from click to number, worker startup included, against the 1 s budget in the PRD (AC 4).
- [X] **B11** (agent-verified) The analysis runs in its own bundle chunk, so the main thread is not doing this work.
- [X] **B12** (agent-verified) The seven fixtures all land inside `toleranceRpm`, both estimators agree within 3 %, and every rate is within 0.01 % of the scipy baseline (AC 1, AC 2, AC 3).
- [X] **B13** (agent-verified) Uploading the same file twice, with an identical default window, clears the first result rather than leaving it under the new clip (C1 fix).
- [X] **B14** (agent-verified) With the `Worker` constructor forced to throw, Calculate shows "Couldn't run the analysis" and leaves the button and the range fields usable, rather than sitting on "Analysing…" (C1 fix).
- [X] **B15** (agent-verified) The expected range is folded away on first load, opens on a tap, and the choice survives a reload; a range typed while open still reaches the analysis.
- [X] **B16** (agent-verified) Closing it again flips the stored preference back, so the section is not sticky in one direction.
- [X] **B17** Phone: Calculate on a recorded clip returns in about a second, with the busy state visible while it runs.
- [X] **B18** Phone: the range section opens with a thumb, the fields take a numeric keyboard, and an octave correction works on a real recording.
- [X] **B19** Phone: a window under 2 s cannot be selected, and a recording under 2 s is refused at load with the new message. The four non-engine clips in `Download/rpms/testing/` are refused.
- [X] **B20** Phone: after the merge, the same passes on the deployed site.
- [X] **B21** Phone, **Brave**: Record fails within about a third of a second with the "will not record without the processing" message, rather than after a full take.

## C. Code-review findings, disposition

The round the maintainer triggered produced five findings. All are addressed on
the branch, in three commits, and each was re-driven in Chrome afterwards.

- **C1** ✅ fixed in 88a32df — the analysis client set only `onmessage`, so a worker that failed to load left the run awaiting forever with Calculate and the range fields disabled until a reload. Every path settles now, including a `Worker` constructor that throws and a `dispose` with requests outstanding. Verified in B14.
- **C2** ✅ fixed in 88a32df — the reset key came from the clip's name, and recording names carry only minutes, so two recordings inside one minute shared a key and the previous rpm stayed on screen under the new clip. Clips carry an id that rises on every load. Verified in B13.
- **C3** ✅ fixed in b628b9d — the octave candidates were ordered half, estimate, double, and the tie-break kept the first, so a correct 2000 rpm inside a 900-2100 range was reported as 1000. The measurement now wins whenever it fits the range at all. That also removed the tie-break as dead code: a range holding both half and double holds the estimate between them, so at most one octave is ever a candidate.
- **C4** ✅ fixed in f7cada8 — the Python baseline used a true Butterworth bandpass while the port cascades a highpass and a lowpass. They agree to 0.06 rpm, so nothing failed, but the fixture check could not have seen drift in that stage. The Python runs the same cascade now, so the baseline grades the chain that actually ships.
- **C5** ✅ fixed in f7cada8 — `filtfilt` padded one sample less than scipy's `sosfiltfilt`, which uses `edge = 3 * (2 * sections + 1)`. Harmless in itself, but a silent divergence from the thing the port is graded against.

With C4 and C5 in, the port matches the baseline to **0.0004 %**, so the
fixture tolerance dropped from 1 % to 0.01 % and can now catch a real change.

## D. What changed outside this phase

- **D1** `MIN_CLIP_S` rose from 1 s to 2 s, measured rather than chosen: below 2 s one fixture falls outside its tolerance at some window positions. `scripts/reference/sweep.py` reproduces the table in `design.md` §0.1.
- **D2** The too-short message now derives from the constant. Phase 7 inherits an interpolation case, which is the kind a naive extraction pass misses.
- **D3** `MIN_WINDOW_S` in `waveform/selection.ts` follows `MIN_CLIP_S` rather than holding its own copy of the number. Phase 3 recorded them as already being one constant; they were two.
- **D4** Phase 3's **B3** tested the smallest crop window at 1.0 s. That boundary is now 2.0 s. The phase 3 review is closed, so the change is recorded here.
- **D5** `getWindowClip()` is now consumed, closing phase 3's **D4**.
- **D6** `AudioInputState` gained `clipId`, which anything needing to notice "different clip now" should key off rather than the source name.
- **D7** The expected range is a collapsed `<details>` now, remembered in `localStorage` under `rpm-boss.range-open`. Asked for during the review stage, so it sits outside the code-review round above. First device-persisted preference in the app; phase 7 will want the summary text in the translation sweep.
- **D8** `audio/testing/` gained five non-engine clips, and `scripts/reference/__pycache__` was untracked and ignored.
- **D9** Recording was rewritten. Echo cancellation had been left on since phase 2 and was gating the engine note about a second in; turning it off reproduces the phase 2 failure in `MediaRecorder`, so capture moved to an audio worklet. Chrome now records flat; Brave grants the constraints and returns digital silence, which is detected in 300 ms and reported with a message naming the cause. Full account in [`discussions/2026-09-10-android-microphone-capture.md`](../../discussions/2026-09-10-android-microphone-capture.md).
- **D10** `InputErrorCode` gained `capture-blocked`, and a development-only **Mic check** panel reports what the microphone actually grants and delivers. The panel is the only way to ask this of a phone without a cable, and it stays for now.
- **D11** The parabolic lag refinement could run past the peak on degenerate audio and return a negative rate. Guarded in both the port and the Python baseline; fixture values unchanged.
- **D12** A development-only "Export recording" button writes the loaded clip as 16-bit mono wav, the format `test/fixtures/` uses, with the crop window in the file name. Added during the review stage after the maintainer lost a problem recording to a page reload. `encodeWav` in `src/dsp/wav.ts` is the inverse of the reader the fixtures already went through, and the production bundle contains no trace of the button.

## E. New findings from this round

- **E1** A refused upload leaves the previous clip loaded *and* its previous result line on screen, so the error and a stale number are visible together. Consistent with how phase 2 handled a refused upload, but worth a look on the phone where less fits on screen.
- **E2** A pure tone is reported as an engine, because a flat envelope correlates with itself at every lag. `audio/testing/noise-tone.m4a` scores 1.77 and reads 1875 rpm; the other four non-engine clips score 0.00 to 0.22 against a 0.45 threshold. Recorded and now demonstrable, not guarded against — nothing that comes out of a microphone in a garage looks like it.
- **E3** The two estimators are not independent: the peak-count method takes its minimum spacing from the rate the autocorrelation found. That is the reference's own design, and their agreement is still a real check because the count comes from the envelope, but it is not the independent confirmation it might look like.
- **E4** `scripts/reference/` needs numpy and scipy, which the npm test run does not. It is a development aid, not part of CI. If the fixtures are ever regenerated, `reference.json` has to be regenerated with them.
- **E5** The `worker-failed` message tells the user to reload, which is the only recovery the app offers. If module workers turn out to be missing on a target browser, the fix is a main-thread fallback rather than a better message.

## F. Unreproduced

- **F1** The maintainer saw a recorded clip leave the app on "Analysing…" with no result, on the phone, and lost the clip to a page reload. Not reproduced. The obvious suspect is **C1**, a worker that never answers, which was exactly this failure and is fixed on the branch; whether that session predates the fix is unknown. Two theories were tested and ruled out: peak picking is not quadratic in practice, because the 150 Hz envelope holds local maxima under 1500 even for noise, dither and a clipped square wave, and every one of those inputs completed in under 100 ms. The export button (**D9**) exists to capture the next one — it keeps working while a run is stuck, since it reads the clip rather than the analysis. A watchdog that fails a run after a few seconds would make the state unreachable regardless of cause; not added, since it was not asked for.

## G. Open questions carried from the PRD

- Both are answered, with numbers, in `design.md` §0.1 and §0.2: the minimum window is 2 s, and the failure path uses a confidence threshold of 0.45 rather than "no peak in the lag range".

## H. Environment

Laptop Chrome through Playwright, uploads only. The laptop microphone does not
work under Ubuntu, so recording is testable only on the phone, which is what
B17-B19 cover; B20 covers the deployed site after the merge.
