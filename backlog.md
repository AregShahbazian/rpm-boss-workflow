# rpm-boss — backlog (ideas to realize)

Post-MVP, unordered. Captured from the leading doc on 2026-09-10.

- Video input: load a video, scrub with the waveform visible, pick the section,
  extract its audio (WhatsApp-style crop). Deferred from the MVP on 2026-09-10.
- Live waveform before recording: entering record mode first shows the mic
  input as a running waveform without capturing anything, so the user can aim
  the phone and wait for a clean signal. Pressing Record then starts the 10 s
  countdown and the capture. Better UX than committing to a take blind.
  Captured 2026-09-10; revisit after phase 4, because if the estimator turns
  out fragile on noisy audio this stops being polish and becomes the fix.
- A way for users to report a bad translation. All seventeen languages were
  written by Claude and none has been read by a native speaker; verification
  was deliberately deferred to after launch, so the corrections have to be able
  to come back from the people using the app. Captured 2026-09-10.
- Enhanced analysis: noise reduction, adaptive band selection.
- User-aided analysis: tap the combustions you see in the waveform; the app
  fits to them.
- Live tachometer: continuous RPM without a stored recording.
- Tachometer gauge on screen, next to the number.
- Stored results, named and grouped per vehicle; choose the group before
  recording/uploading.
- 4-stroke / 2-stroke preset, persisted locally, switching the revolutions per
  combustion between 2 and 1. Deferred out of phase 4 on 2026-09-10: all seven
  ground-truth recordings are 4-stroke singles, so the 2-stroke path could only
  be tested as a multiplier. Needs a 2-stroke recording first.
- Multi-cylinder presets (firing order aware).
- Expected-range presets per vehicle.
- Suggested expected ranges per model: pick your bike and the range fills
  itself. Needs a body of data first — stock idle rpm for common
  single-cylinder bikes — which is a collection job before it is a feature.
  Captured 2026-09-10.
- Help dialog with instructions — what the app measures, where to hold the
  phone, what a bad reading looks like. Carries a language quick-selector with
  it, for the case the interface language is right and the explanation is not:
  a rider whose phone is set to English gets by with English labels but not
  with a paragraph of it. Whether the selector changes only the help text or
  switches the whole app is undecided; the first is less surprising, the second
  is one control instead of two. Captured 2026-09-14.
- Language support: English, Tagalog, Bisaya, possibly more — no longer a
  backlog item; it is phase `7-i18n`, inside the MVP.
