---
id: rb-result-view
feature: 5-result-view
branch: feat/5-result-view
stage: review
status: closed 2026-09-10 — B1-B13 confirmed by the maintainer
created: 2026-09-10
commits: a658c33..e3518d6 (2 on the branch, unpushed)
---

# Review — Result view

Review only: findings and a checklist, no fixes. Approved fixes land on the
branch as `fix(...): ... [rb-result-view]`.

## A. Automated

| Check | Result |
|---|---|
| `npm test` | 168 passed, 16 files (this phase adds tick 9, plus 7 fixture assertions) |
| `npm run lint` | clean |
| `tsc -b` + `npm run build` | clean, 241 kB JS / 76.5 kB gzipped |

## B. Manual checklist

B1-B9 were driven by Claude in laptop Chrome and what it observed is noted on
each item. The maintainer confirmed B1-B13 on 2026-09-10, phone included. The feature is not done until every box is ticked.

- [X] **B1** (agent-verified) `after-cold.wav` at its default window reads **1449 rpm** as a display figure with `rpm` beside it, over a marked waveform, captioned **75 marked**. The independently verified count for that recording in `combustion-counts.md` is 75 (AC 1).
- [X] **B2** (agent-verified) Sampling the canvas finds exactly 75 ticks, spaced 3 to 5 device pixels apart with a median of 4: an even comb, no gaps and no crowds (AC 2).
- [X] **B3** (agent-verified) `all-samples.m4a` at its default 10 s window reads **1608 rpm**, captioned 132 marked, and the canvas holds exactly 132 ticks.
- [X] **B4** (agent-verified) The number and the marked waveform are 180 px together and scroll into view as a pair when the result arrives (AC 3, as amended in the design).
- [X] **B5** (agent-verified) Dragging the crop edge clears the number and the marks together, and the crop readout follows (AC 4).
- [X] **B6** (agent-verified) Four seconds of noise shows the failure message where the number would be, with the crop, the range fields and Calculate all still usable, and no waveform drawn (AC 5).
- [X] **B7** (agent-verified) An expected range of 2600-3400 reads **2898 rpm · 75 marked · your range says each mark is two combustions**; a range of 650-800 reads **725 rpm · 75 marked · your range says two marks are one combustion**. The tick count is 75 in both, because the marks are the raw detection (AC 6).
- [X] **B8** (agent-verified) In dark mode the ticks are drawn in `--accent`, sampled from the canvas as `#8ab4f8`, and the trace in `--muted` (AC 7).
- [X] **B9** (agent-verified) The figure holds its width between three and four digits: 162 px for both 998 and 1608 (AC 7).
- [X] **B10** Phone: the number is readable at arm's length in daylight.
- [X] **B11** Phone: at true phone width the number and the marked waveform still arrive together, and the comb is legible rather than a smear. The laptop browser would not go below 480 px, so this is the first real test of 360 px.
- [X] **B12** Phone: the marks land where the beats are, judged against a recording the maintainer can hear.
- [X] **B13** Phone: after the merge, the same passes on the deployed site.

## C. Code-review findings, disposition

Run by Claude at the maintainer's standing permission, at high effort. Three
findings, all fixed in `e3518d6`, and each re-driven in Chrome afterwards. The
maintainer was away, so the decision to fix all three was Claude's; any of them
can be reversed.

- **C1** ✅ fixed — `findPulses` runs before `resolveOctave`, so a corrected reading left the comb showing the raw rate. On a doubled reading the marks disagreed with the number by exactly the factor the comb exists to expose, with only a "corrected" note as a hint. The marks stay raw, because there is no honest way to draw combustions that were never found; the caption now says whether each mark is two combustions or two marks are one. Verified in B7.
- **C2** ✅ fixed — the caption read "75 combustions in 6.4 s", and dividing it out gave 1406 against a headline of 1449, because the count comes from peak picking and the number from autocorrelation. It reads "75 marked" now, a count rather than an invitation to arithmetic.
- **C3** ✅ fixed — the result canvas draw effect omitted `height` from its dependencies, and assigning that attribute clears the canvas, so any caller passing a non-default height would have got a blank one.

The reviewer also checked two things that look suspicious and are not: the
retained clip cannot be drawn against a result from a different window, since
the reset key changes first, and the worker clones rather than transfers the
samples, so the retained buffer is never detached. A comment in `InputScreen`
claimed a clearing that does not happen; the wording is corrected.

## D. What changed outside this phase

- **D1** `ResultLine.tsx` from phase 4 is deleted. It was scaffolding and said so.
- **D2** Palette reading moved out of `WaveformCanvas` into a shared `usePalette` hook, so the result canvas does not carry a second copy.
- **D3** `analysis.fixtures.test.ts` gained an assertion that marks are ordered and inside the window, which caught that `expected.json` durations are rounded to one decimal while the clips are not.

## E. New findings from this round

- **E1** The design amended AC 3. The screen was already 610 px on a production build before this phase, so a number and a marked waveform could not also fit; the result sits below and the page scrolls, with the pair scrolled into view. The measurements are in `design.md` §0.1 along with the two alternatives that were rejected.
- **E2** True phone width was not reachable: the laptop browser would not size its viewport below 480 px, so every desktop measurement is at 448 px of content rather than 328 px. B11 is the first real test of that.
- **E3** The marks are the raw detection even when the range corrects the reading, and the caption explains rather than redraws. Worth a second opinion on the phone: it is honest but it asks the user to hold two facts at once.
- **E4** `pulseTimesS` is drawn one tick per pixel column, so at a dense rate two combustions inside one pixel become one tick. The count in the caption comes from the array and not from the ticks, so the number is right even where the comb cannot show it.

## F. Open questions carried from the PRD

- All three are answered in `design.md` §0.1 to §0.3: the result sits below and the page scrolls, marks are edge ticks with none thinned, and the octave note is not dismissable.

## G. Environment

Laptop Chrome through Playwright, uploads only, at 448 px of content width.
B10-B12 need the phone; B13 covers the deployed site after the merge.
