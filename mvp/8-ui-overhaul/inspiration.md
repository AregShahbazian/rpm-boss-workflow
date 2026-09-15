# 8-ui-overhaul — inspiration research

**Date:** 2026-09-10 · **Stage:** pre-PRD input, not the PRD.

Visual board (all screenshots, annotated):
<https://claude.ai/code/artifact/2cd56646-88ee-40e4-9e41-5e69fba0773b>

Images in `inspiration/`. The rpm-boss shots were captured from the live build
at areg.nl/rpm-boss with headless Chrome 152, sample `Standard recording 1.aac`
(11.2 s), viewport 844×390.

## Measured, current build

| | |
|---|---|
| Content column | 480 px of 844 (`.screen` max-width) |
| Empty gutter | 364 px, 43 % of the screen |
| Page height at result | 778 px against a 390 px viewport |
| Answer position | 553 px down, ~2 swipes below the fold |
| Result marks | 132 marks over ~360 px = one every 2.7 px |

Portrait is **not** affected: ~760 px of content in an 844 px viewport, no
scroll. This is a landscape-only failure, caused by the 480 px cap that makes
portrait comfortable.

Second finding, unprompted: the marks comb is unreadable at portrait width. The
marks exist so a person can spot a doubled or halved beat. Width is not spare
room here, it is what makes the evidence legible. That is an argument for
landscape being a first-class mode rather than a tolerated one.

## References collected

| App | File | The move to steal |
|---|---|---|
| Engine Sound Analyzer (`i.jetik.BIKERPM`) | `ref-engine-sound-analyzer-car/-bike.png` | Direct competitor, same job, landscape-native. Left third = settings + readout; right two-thirds = waveform over spectrum; sliders in the seam. Prints Hz *and* rpm so the arithmetic is checkable. |
| WaveEditor for Android | `ref-waveeditor-android.png` | Waveform is the page, edge to edge. Transport floats over it, icon-only, no strings to translate. |
| AudioMass (web) | `ref-audiomass-web.png` | All chrome in one top band, grouped into three clusters. Start/end/length is a cluster, not a paragraph row. |
| Spectroid | `ref-spectroid.png` | Chart is the whole screen; two icons are the entire chrome; the reading is a label pinned to the peak, not a panel. |
| Torque Pro | `ref-torque-gauges.png` | The bar to clear: rotating shows *more*, 6 gauges at once, never scrolls. Don't borrow the round needle gauge, it suits a live feed and we measure once. |
| Tuner Ninja (web) | `ref-tunerninja-negative.png` | Counter-example. Same centred-column bug as ours, dial below the fold. |

## Three layout options (detail and wireframes on the board)

- **A · Split columns** — controls + answer on one side, waveform on the other.
  The competitor's layout, least risky, portrait unchanged.
  Cost: waveform gets ~62 % of the width; a crop handle can sit under the hand.
- **B · Full-bleed waveform** — waveform is the screen, one icon-first control
  bar, RPM as an overlay. Widest marks comb.
  Cost: overlay covers signal; the range fields need a sheet or popover.
- **C · Two stages** — landscape has a crop state and an answer state.
  Cost: a state change to learn; re-cropping becomes deliberate.

## On hiding components after Calculate (maintainer's question)

Verdict: yes to reducing, no to hiding. Demote rather than remove; a control
that vanishes makes people hunt.

- **Open / Record** — demote to icons, never hide. First fix for a bad reading
  is a new recording.
- **Crop waveform** — merge with the result waveform. The same 10 s is drawn
  twice today. One canvas that gains marks after Calculate saves ~180 px of the
  778, the single biggest win available.
- **Play / time** — keep, shrink to an icon plus a mono readout.
- **Expected range** — keep collapsed and one tap away. It is the standard fix
  for the factor-of-two error.
- **Calculate** — the one real hiding candidate. Its result is on screen and it
  goes stale when the crop moves; it could stand down until an input changes.
- **The number** — never hidden, never below the fold.
- **Language picker** — move out of the main flow. Its own comment says phase 8
  places it.

## Constraints that bear on layout

- **Urdu is RTL.** `languages.ts` carries `rtl: true` on `ur` with a comment
  saying nothing reads it yet and phase 8 will. Any two-column landscape has a
  side that mirrors: pick the leading column now and express the split with
  logical properties (`inline-start`), not `left`. Waveform time still runs
  left to right, because that is time and not text. Icon-first controls help
  twice: no string to grow, nothing to re-measure per language.
- **Light theme is mostly a token swap.** The canvas already reads its colours
  from CSS variables via `usePalette` and re-reads on scheme change. Two things
  do not simply invert: the record dot and error red need darker shades on
  white, and the 60 %-opacity selection blue reads much weaker over a light
  waveform. Dark stays the default.
- **`LONG_CLIP_S = 30`** (`waveform/range.ts`) assumes a 360 px canvas. In a
  landscape layout the canvas can be 800 px+, so the overview threshold has to
  come from the measured width. Carried into this phase already by
  [`workflow.md`](../../workflow.md); the redesign is what forces it.

## Not yet decided

Which of A / B / C. That is the PRD's first question.
