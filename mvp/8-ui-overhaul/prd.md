---
id: rb-ui-overhaul
feature: 8-ui-overhaul
branch: feat/8-ui-overhaul
status: approved
created: 2026-09-10
depends_on: [7-i18n]
---

# PRD — UI overhaul

## Goal

The app uses the screen it is on. It splits into two columns when there is
width, it has a light theme beside the dark one, and the answer is never below
the fold.

## Why

This phase was scheduled last so the whole screen could be judged at once. It
now can be, and it does not hold up. Measured on the live build at 844×390,
with a result on screen:

| | |
|---|---|
| Content column | 480 px of 844 |
| Empty gutter | 364 px, 43 % of the screen |
| Page height | 778 px against a 390 px viewport |
| Answer position | 553 px down, two swipes past the button that produced it |

Turning the phone sideways makes the app narrower, not wider. The 480 px cap
that makes portrait comfortable is the same cap that ruins landscape: no pixel
of the extra width can be used, so the extra height is spent instead.

Landscape is not a nicety here. The app is used crouched next to a running
engine, which is the position in which a phone is held sideways, and the result
waveform drew 132 marks across roughly 360 px — one every 2.7 px, which renders
as a solid fence. Those marks exist so a person can catch a doubled or halved
beat, and at portrait width they cannot. Width is what makes the evidence
readable.

The research, the seven reference apps and the three layouts considered are in
`inspiration.md`. Layout A, split columns, was chosen on 2026-09-10 and drawn at
eleven screen sizes in the canvas under `canvas/`.

## User stories

1. As a rider crouched over an engine with the phone sideways, I read the number
   without scrolling.
2. As a rider on a cheap 360×640 phone, everything still fits without scrolling.
3. As a rider working in daylight, the app is readable in a light theme; at
   night it is dark without my asking.
4. As an Urdu reader, the layout reads right to left, while the waveform and the
   numbers still read left to right.
5. As a rider who doubts the reading, I can see the individual marks well enough
   to count them.
6. As a rider who just wants the number, the screen after Calculate leads with
   the number rather than with the controls that produced it.

## Scope

### In

- **Layout A, split columns.** A control column (source buttons, status, the
  answer, expected range, Calculate) beside a signal column (waveform,
  transport, crop numbers).
- **The switch is width, not orientation.** At 600 px and wider the screen
  splits; below it the current stack stays. One rule covers small-phone
  landscape at 640, tablet portrait at 820, and laptops.
- **One waveform.** Today the crop canvas and the result canvas draw the same
  ten seconds twice. Calculate leaves the marks on the crop canvas instead, and
  snaps the detail range to the analysed window so the marks are drawn at the
  window's own scale rather than smeared across a 30 s view. Dragging a crop
  handle outward zooms the detail range back out, so the surrounding audio is
  always one gesture away. Decided 2026-09-10.
- **Light theme.** The existing `index.css` variable block inverted onto the
  light token set. Dark is the default: an OS expressing no preference gets
  dark, which is a change from today. A stored override in settings beats the
  OS in both directions.
- **Demotion after Calculate, not hiding.** Open and Record shrink to icons but
  stay; play and the crop numbers stay; expected range stays collapsed and one
  tap away; the number is never hidden and never below the fold.
- **Portrait detail waveform inset 8 px on each side**, so both crop handles
  have grabbing room clear of the screen edge.
- **Right-to-left for Urdu.** The columns mirror wholesale. Layout expressed in
  logical properties, not `left` and `right`. Digits, times and the waveform
  stay left to right.
- **A small settings surface**, holding the language picker and a light/dark
  override. Neither belongs in the measure-an-engine flow, and both need
  somewhere to live. Decided 2026-09-10. It is a surface, not a settings
  system: two controls, reachable in one tap, closing back to the app.
- **`LONG_CLIP_S` derived from the measured canvas width** rather than the
  constant 30, which assumed a 360 px canvas. This requires lifting the width
  measurement out of `WaveformCanvas`.
- **Tablet and laptop stop growing.** Above phone size the working block is
  capped and centred rather than stretched; the extra height goes to the
  long-clip overview strip, not to a taller waveform.

### Out

- Any new feature. No Hz readout beside the RPM, no gauge or dial, no 2-stroke
  toggle, no saving, naming or sharing a result. All backlog.
- A CSS framework, a component library, an icon package, or any new dependency.
- A motion or animation system. A layout that changes on rotation may transition,
  nothing else.
- A desktop-specific design. Wide screens get the split layout and no more.
- Bundling a Nastaliq or Naskh font for Urdu. The platform font is used.
- Any change to the DSP, the analysis contract, the crop interaction, or what
  Calculate computes.

## Acceptance criteria

1. At each of 360×640, 390×844, 430×932, 820×1180 and all four rotations, with a
   10 s window loaded and a result shown, nothing scrolls and nothing is clipped.
2. At 844×390 the RPM number is fully visible without scrolling, at the moment
   the result arrives.
3. The layout splits at 600 px wide and stacks at 599 px, verified at both.
4. At 844×390 the waveform canvas is at least 500 px wide, so a 10 s window at
   13 pulses a second puts the marks at least 3.4 px apart, up from 2.7 today.
5. Every colour in both themes comes from the `index.css` token set. Muted text
   on the background meets 4.5:1 in both, and the record dot and the error red
   are legible on the light ground.
6. An OS reporting no colour-scheme preference gets the dark theme, and a
   stored override in settings beats the OS in both directions and survives a
   reload.
7. With Urdu selected the columns mirror, and the digits, the time readouts and
   the waveform still run left to right.
8. `LONG_CLIP_S` is gone. The overview strip appears when the clip is longer
   than the measured canvas width divided by 12 px per second, which reproduces
   30 s at a 360 px canvas.
9. The language picker and the theme override are both in the settings surface
   and neither appears in the measure-an-engine flow.
9a. Calculate on a clip longer than the detail range snaps the detail view to
   the analysed window, and dragging a crop handle outward restores a wider
   view without a second control.
10. In portrait the detail waveform has 8 px clear on each side.
11. `npm test`, `npm run lint` and `npm run build` pass, and a Playwright pass
    exercises upload, crop drag, play and Calculate at the eight sizes in
    criterion 1, in both themes.

## Non-goals and constraints

- Plain hand-written CSS, as today. The layout is flex and grid with `gap`; no
  utility classes, no preprocessor.
- No new state. The redesign rearranges what `useAudioInput` and `useAnalysis`
  already hold.
- The canvases keep reading their colours from the CSS variables through
  `usePalette`, so a theme change costs no drawing code.
- Every string already comes from the i18n layer. Any new label is a new key in
  all seventeen languages, so prefer an icon.
- Hit targets stay at 44 px or larger, including the demoted icon buttons.
- Status strings mix scripts: the loaded line is an Urdu sentence around a Latin
  file name and duration. The Latin run needs its own `dir="ltr"`, or truncation
  in a right-to-left box eats the wrong end of it.

## Decided

- **Calculate snaps the detail range to the analysed window**, and an outward
  drag on a crop handle zooms back out. This is what lets the crop canvas and
  the result canvas become one, and it is why `ResultWaveform`'s reason for
  existing separately no longer applies.
- **The app gets a small settings surface** for the language picker and the
  light/dark override.

## Open questions

- **Does Calculate stand down after it has run?** Its result is on screen and it
  goes stale the moment the crop moves. Hiding it until an input changes is the
  one genuine hiding candidate; leaving it is simpler.
- **How narrow can the control column get before the labels have to go?** The
  canvas drops them below 240 px, which is what a 640 px landscape screen
  forces. An unlabelled upload icon may not be clear enough, in which case the
  column takes a 240 px minimum and the waveform gives up the width.
- **Where do the expected-range fields live in the split layout?** Drawn as a
  collapsed row in the control column, which is the smallest change. Opening
  them there costs the answer its space.
