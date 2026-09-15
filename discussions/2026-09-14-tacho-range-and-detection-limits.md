# Tachometer range, redline, and the detector's limits

*2026-09-14. Feature: realtime tachometer (`feat/realtime-tacho`). Follows
[the layout and visualization-library discussion](2026-09-14-realtime-tacho-layout-and-viz-libs.md).*

## Summary

With the gauge to be hand-drawn, it needs a scale, and until there are
per-vehicle presets that scale has to suit every user. The question turned out
to be less about what a motorcycle does than about what the estimator can say:
`autocorr.ts` searches 8–100 pulses/s, which with `REVS_PER_PULSE = 2` is
960–12,000 rpm, so the dial's honest span was already decided by a pair of
constants nobody had looked at in product terms. Both ends were then
re-examined. The ceiling is arbitrary and should follow the gauge rather than
lead it — one `MAX_RPM` the detector derives its rate limit from, so the app can
never compute a number it cannot draw. The floor turned out to be a floor of
convenience: all seven ground-truth clips idle well above 960, but a Royal
Enfield idles at 800–1,000, a mistuned bike hunting at 600–700 is precisely the
case someone opens this app for, and a half-speed generator sits at 1,500 or
1,800. The floor moves to `MIN_RATE = 5`, or 600 rpm, which still holds five
periods inside the 1 s analysis window.

## Key conclusions

- **Gauge scale: 0 to `MAX_RPM`**, with 12,000 the working value — it covers the
  110–155 cc singles the app is aimed at (Click, Sniper, Raider redline at
  9.5–11 k) and nothing sold in that class goes past it.
- **`MAX_RPM` is the single source of truth.** `MAX_RATE` is derived from it
  (`MAX_RPM / 60 / REVS_PER_PULSE`), not stated independently, so the estimator
  can never return a value the dial cannot show.
- **Gauge minimum is 0 rpm**; the detection minimum is not, and cannot be. A
  rate of 0 is an infinite period, and `WINDOW_S = 1` means the window has to
  hold two or three periods for autocorrelation to find one.
- **`MIN_RATE` moves from 8 to 5** — 960 rpm to 600 rpm. Five periods still fit
  the 1 s window. 960 was never a measured limit, only the bottom of the
  ground-truth set.
- **Redline starts at 9,000 rpm** by default, chosen conservatively: warning a
  little early costs less than missing a bike that spins to 11 k.
- **The dial reads nothing below the detection floor**, rather than showing a
  fake zero.

## Open questions

- Idle tuning happens at 1,300–1,800 rpm, which is one tick off the stop on a
  12,000 rpm dial — the needle barely moves where the app is most used. Two
  scales? A compressed lower region? Not resolved.
- Should the redline follow the expected-range fields when the user has filled
  them, instead of the 9,000 default?
- Generators at 1,800 rpm (60 Hz, PH) — does the dial acknowledge them, or is it
  bikes-first?
- Below the floor, does the live dial read nothing or hold the last value greyed
  out?
- `resolveOctave` now has a wider band to be wrong in: with a 600 rpm floor, a
  1,200 rpm idle has a half-octave that is no longer out of bounds.

## Ideas to realize

- Introduce a `MAX_RPM` constant and derive `MAX_RATE` from it, so no computed
  value can fall outside what the gauge can display.
- Lower `MIN_RATE` from 8 to 5 (600 rpm), and check every test asserting the
  960 rpm boundary.
- Record a deliberately low idle — choke off, idle screw backed out — as ground
  truth before trusting the new floor.
- Default the gauge to 0–12,000 rpm with major ticks every 1,000 and a redline
  arc from 9,000.
- Grey the sub-floor region of the dial so it is visibly a region the app cannot
  read, not a region where the engine is stopped.
- Let the redline start follow the expected-range fields when they are filled
  (ties to the backlog's "expected-range presets per vehicle").
- Revisit the idle-resolution problem: a second, lower scale or a non-linear
  lower region so 1,300–1,800 rpm is readable.
