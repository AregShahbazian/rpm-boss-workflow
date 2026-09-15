---
id: rb-result-view
feature: 5-result-view
branch: feat/5-result-view
status: draft
created: 2026-09-10
depends_on: [4-analysis]
---

# PRD — Result view

## Goal

Show the answer, and show enough of the working to be believed.

## Why

Phase 4 produces the number and prints it as a line of small text under a
button. That was deliberate, enough to check against the test suite and no
more. What the user needs is different: one figure they can read while
crouching next to a running engine, and a picture that lets them judge whether
the app heard what they heard.

The picture is not decoration. The method fails by a factor of two, and a
marked waveform makes that visible at a glance: markers on every second
combustion, or two markers per combustion, are obvious to a human and invisible
in a number. It is the cheapest confidence check the app can offer, and the
reason `pulseTimesS` was produced in phase 4 rather than left to this phase.

## User stories

1. As a user standing over an engine, I read the RPM at arm's length without
   putting my face near the phone.
2. As a user who is not sure the app got it right, I look at the marks on the
   waveform and see whether they land on the beats I can hear.
3. As a user whose reading looks wrong, I move the crop and try again without
   losing my place.
4. As a user whose recording was unreadable, I see why, with the crop still
   there to adjust.

## Scope

### In

- **The number**, large and plain, in whole RPM. It is the screen's subject,
  not a line of status text.
- **The marked waveform**: the analysed window redrawn, with a mark at every
  time in `pulseTimesS`. Same drawing code path as the crop waveform, without
  the handles and without the crop shading.
- **A quiet note when the expected range moved the answer** an octave, so a
  corrected figure is never mistaken for a measured one.
- **The failure message in place of the number**, with the crop and its
  controls untouched, so the next attempt costs one drag.
- **Clearing on change.** Phase 4 already drops the result when the clip or the
  window changes; the view follows it, including the marks.
- **Portrait phone layout** first. The number and the marked waveform both fit
  above the fold at 360 px wide with a 10 s window loaded.

### Out

- A gauge, a dial, or any skeuomorphic tachometer. Backlog.
- Saving, naming or sharing results. Backlog.
- Showing confidence as a figure. It is a threshold, not a score, and putting a
  number on it invites the user to interpret it.
- Zooming or scrubbing the marked waveform. It shows at most 10 s.
- Any change to the DSP, the analysis contract, or the crop interaction.

## Acceptance criteria

1. Each of the seven fixtures, analysed at its default window, shows a number
   matching the test suite and marks whose count is within 5 % of
   `pulsesPerS * windowLength`.
2. The marks line up with the envelope peaks, not with an arbitrary grid: on a
   synthetic clip of a known rate the mark times are within 10 ms of the pulses.
3. At 360 px wide the number and the marked waveform are both visible without
   scrolling, with a 10 s window loaded.
4. Moving the crop window clears the number and the marks together.
5. An unreadable clip shows the failure message where the number would be, and
   leaves the crop, the range fields and Calculate usable.
6. A result corrected by the expected range says so.
7. The number is legible in both colour schemes and does not reflow when it
   changes from three digits to four.
8. `npm test`, `npm run lint` and `npm run build` pass.

## Non-goals and constraints

- Canvas 2D and hand-drawn, per the stack. No chart library.
- The marked waveform reuses `computePeaks` from phase 3 rather than growing a
  second way to reduce samples to columns.
- No new state. The view renders what `useAnalysis` already holds.
- Strings stay out of deep component internals, for phase 7.

## Open questions

- **Does the marked waveform replace the crop view or sit below it?** Replacing
  it is calmer and halves the vertical space; keeping both makes "move the crop
  and try again" a single gesture. Decide in design, from what fits at 360 px.
- **How do 130 marks stay legible?** Ten seconds at 13 pulses per second is a
  mark every 2.7 px at phone width. They may need to be ticks along an edge
  rather than full-height lines, or to thin out below some spacing. Decide in
  design, measured at 360 px rather than guessed.
- **Does the octave note need dismissing?** It is one line and it is important;
  leaning towards no.
