---
id: rb-live-tacho
feature: realtime-tacho
branch: feat/realtime-tacho
stage: tasks
created: 2026-09-14
design: design.md
---

# Tasks — Realtime tachometer

Follows `design.md`. Commit subjects carry `[rb-live-tacho]`.

**Every task ends green** on `npm test`, `npm run lint` and `npm run build`.
Bottom-up order, so nothing is written against a thing that does not exist yet;
the mock lands early, at T9, because everything after it can then be exercised
without a running engine on the desk.

**The live check**, referred to as *the run* from here on: `npm run dev`, open
the app, press Mock, and watch the dial, the scope and the reading for thirty
seconds. Until T9 there is nothing to run and the verification is unit tests
and the screen at rest.

---

## Constants and the DSP floor

- **T1** `src/dsp/types.ts`: add `MAX_RPM = 12_000` and `REDLINE_RPM = 9_000`,
  beside `REVS_PER_PULSE`, each with the sentence that says why the number is
  that number — the 110–155 cc singles the app is aimed at, redlines at
  9.5–11 k.
  *Verify:* `npm test` unchanged; nothing imports them yet.

- **T2** `src/dsp/autocorr.ts`: `MAX_RATE = MAX_RPM / 60 / REVS_PER_PULSE`,
  replacing the literal `100`; `MIN_RATE` 8 → 5. Keep the comment above the
  pair and rewrite it to say what the floor now means (600 rpm, and why it is
  not 960).
  *Verify:* `npm test` — all 334 pass, the fixture suite included. `MAX_RATE`
  must still evaluate to exactly 100; add a one-line assertion of that in
  `test/autocorr.test.ts` so the derivation cannot drift silently. Confirm in
  the same run that no test asserted the old 960 rpm floor — that absence is a
  finding for `review.md`, not a thing to fix here.

## The capture path

- **T3** `src/live/ring.ts`, new: ported from `poc/live-rpm` unchanged —
  `Ring`, `LIVE_WINDOW_S`, `LIVE_INTERVAL_MS`, `LIVE_SMOOTH_N`,
  `LIVE_SCOPE_S`, with their comments.
  *Verify:* `test/ring.test.ts`, new — wrap-around, `snapshot` returns oldest
  first, `latest` shorter than the ring, a chunk longer than the whole ring
  keeps only its tail, `full` flips exactly at capacity.

- **T4** `src/audio/native.ts`: add `FramesEvent`, the `stream?: boolean`
  option on `start`, and `addListener('frames', …)` to the plugin interface.
  Nothing else in the file changes; `recordNative` keeps its path.
  *Verify:* `test/native.test.ts` passes untouched; `npm run build`.

- **T5** `android/app/src/main/java/com/mby4m/rpmboss/RawAudioPlugin.java`:
  the streaming branch from the PoC — `stream` on the take, 2048-frame slices
  emitted as `frames` events, nothing accumulated, `maxS` applied to bytes
  emitted. Buffered recording behaviour must be untouched.
  *Verify:* `npm run android:sync && cd android && ./gradlew assembleDebug`
  compiles. Record a clip on the phone the ordinary way and confirm it still
  decodes and analyses — the regression risk of this task is the recorder, not
  the stream.

- **T6** `src/live/stream.ts`, new: ported — `LiveCapture`, `LiveOptions`,
  `startLiveCapture`, the native and worklet paths, `batcher`, `LIVE_MAX_S`,
  `MIC_CONSTRAINTS`.
  *Verify:* `npm run build`. No unit test: it is all platform I/O, and the
  thing worth testing about it is exercised at T8.

## The loop

- **T7** `src/state/useAudioInput.ts`: expose `fail(code: InputErrorCode)` from
  the hook. It is the existing internal helper; give it a `useCallback` and put
  it in the returned object.
  *Verify:* `npm run build`; no behaviour change on any existing path.

- **T8** `src/state/useLive.ts`, new: the PoC's hook, rewritten per design §4 —
  `LiveStatus`, `LiveState`, `start(source)`, `stop`, the skip guard, the
  median of `LIVE_SMOOTH_N`, `record-failed` remapped to `listen-failed`, and
  the `visibilitychange` / `pagehide` stop. No `LiveStats` (it returns at T24).
  Add `displayRpm(live, fallback)` here — it is the pure part.
  Add `'listen-failed'` to `InputErrorCode` in `src/audio/types.ts` and to
  `INPUT_ERROR_KEYS`.
  *Verify:* `test/live.test.ts`, new — `displayRpm` over the four combinations
  of `quiet` × `fallback`, plus `status !== 'listening'` returning `undefined`.

- **T9** `src/live/mock.ts`, new, and `src/features.ts`: `mockLive: boolean`,
  `false`. `startMockCapture` per design §3b — fetch sample 6, decode, slice
  3.0–13.0 s, emit 2048-frame chunks paced against the wall clock, cursor
  modulo the slice length. Errors to `onError` as `listen-failed`.
  *Verify:* `test/mock.test.ts`, new — the cursor wraps with no gap and no
  repeated frame, and one second of wall time emits one second of audio. Then,
  with the flag on and a temporary button, *the run*: the console shows
  readings near 1 603 rpm and nothing is audible.

## The dial

- **T10** `src/ui/palette.ts`: add `fg` from `--color-fg`, fallback `#111`.
  *Verify:* the waveform still draws in both themes after a theme switch with
  no reload — the memoisation is shared, so this is the only thing that can
  break.

- **T11** `src/ui/Tacho.tsx`, new: the canvas dial per design §6. Export
  `rpmToAngle`. Track arc, dimmed sub-floor segment, redline arc, major ticks
  with `0`–`12` labels, minor ticks, needle. Sized by `useElementSize`, painted
  at `devicePixelRatio`.
  *Verify:* `test/tacho.test.ts`, new — `rpmToAngle` at 0, at `MAX_RPM`, above
  it (clamped), and monotonic between. Then by eye at 360×640 and 844×390: the
  dial is circular, not an ellipse, and fills the shorter dimension.

- **T12** `src/ui/Tacho.tsx`: motion. The `requestAnimationFrame` easing loop,
  `TAU = 120`, parking within a tenth of an rpm; `motion: 'step'` draws on
  change with no loop.
  *Verify:* with the mock running, the needle moves continuously on `smooth`
  and visibly in 200 ms steps on `step`. Confirm in devtools that an idle
  screen — needle parked — schedules no frames.

## The scope

- **T13** `src/ui/LiveScope.tsx`, new: per design §7 — `LIVE_SCOPE_S` of tail
  per animation frame, `computePeaks`, one `fillRect` per device pixel column
  in `palette.muted`, `NOISE_FLOOR = 0.002`, auto-scaled.
  *Verify:* side by side with a recorded waveform of the same clip, the two
  read as the same drawing. With the mock running, the scope is continuous
  across the loop seam.

## The settings

- **T14** `src/ui/liveSettings.ts`, new: `Fallback`, `Motion`, the two `*_S`
  lists, defaults `zero` and `smooth`, `useFallback`, `useMotion`, storage keys
  `rpm-boss.live.fallback` and `rpm-boss.live.motion`, all of it tolerant of
  storage that throws.
  *Verify:* `test/liveSettings.test.ts`, new, modelled on `theme.test.ts`:
  default, stored value, corrupt value, throwing storage.

- **T15** `src/ui/kit.tsx`: extract `Picker` per design §10, with `layout` of
  `'column'` or `'row'`. Move the `select` `css` block out of
  `LanguagePicker.tsx` into it, unchanged.
  `src/ui/LanguagePicker.tsx`: becomes a caller, `layout="column"`.
  *Verify:* the language picker is pixel-identical before and after, in both
  themes and in Urdu. Nothing else in the app uses `Picker` yet.

- **T16** `src/ui/kit.tsx`: `Sheet` gains `border border-solid border-btn` in
  place of `border-0`. Add the `stop` shape to `SHAPE`:
  `'w-24 flex-none justify-center p-0 split:w-full'`.
  *Verify:* the settings dialog has a visible border in both themes and does
  not shift its contents. `border-solid` must be present — without Preflight a
  width with no style draws nothing.

- **T17** `src/ui/SettingsButton.tsx`: an `<hr>` after the theme fieldset
  (`border-0 border-t border-solid border-btn`), then a `<details>` with a
  `<summary>` reading `t('tachoSettings')`, closed by default, holding two
  `Picker`s in `layout="row"`. The theme fieldset is not touched.
  *Verify:* the section is closed on open, opens on click and on Enter, and the
  two choices persist across a reload. Check at 844×390 that the dialog still
  scrolls rather than running off the screen.

## The screen

- **T18** `src/ui/InputScreen.tsx`: wire `useLive(fail)`, derive `listening`
  and `rpm`, and pass `disabled={busy || listening}` to Record, Open and
  Sample.
  *Verify:* with the mock running, the three source buttons are visibly
  disabled and Settings is not.

- **T19** `src/ui/InputScreen.tsx`: the stop button — last child of the source
  row, rendered only while `listening`, `shape="stop"`, `aria-label` from
  `t('stopListening')`, a stop icon.
  *Verify:* portrait 360×640, it is twice an icon button wide and sits right of
  Settings; landscape 844×390, it is on its own line at the full width of the
  row above. Pressing it returns the screen to rest.

- **T20** `src/ui/LiveStage.tsx`: the placeholders and `BOX` go. The dial and
  the reading are always drawn — 0 and `---` at rest; the lower fifth holds the
  Start button at rest and the scope while listening. The 80/20 and 80/20
  splits stay exactly as they are.
  *Verify:* at rest, in both orientations and themes, the stage looks
  deliberate rather than unfinished. The reading strip's figure does not
  overflow its fifth at any of the three sizes.

- **T21** `src/ui/LiveStage.tsx`: the Mock button beside Start when
  `FEATURES.mockLive && SAMPLES_ENABLED`, the same size, splitting the strip
  down the middle. Label `Mock`, untranslated.
  *Verify:* with the flag off, no button and no fetch of any sample — check the
  network tab. With it on, both buttons are the same size in both orientations.

## Strings

- **T22** `src/i18n/en.ts`: the ten keys of design §12.
  *Verify:* `npm test` — the i18n parity test now fails for sixteen locales,
  which is the gate working.

- **T23** `src/i18n/messages/*.ts`: the ten keys in all sixteen languages.
  *Verify:* `npm test` green again. Read the Urdu and Thai rows in the settings
  dialog on the phone: the label and the picker must still share a line, and
  the section header must not wrap to three lines.

## Performance

- **T24** `src/state/useLive.ts` and `src/ui/LiveStage.tsx`: `LiveStats` back
  from the PoC — `runs`, `lastMs`, `avgMs`, `maxMs`, `skipped`, `captureRatio`
  — plus the scope's measured frame rate, shown as a small readout under the
  scope behind `FEATURES.mockLive`.
  *Verify:* the readout appears only with the flag on, and the numbers move.

- **T25** The measurement itself, per design §13b: two minutes against the mock
  on the laptop, then two minutes against the mock in a release APK on the
  phone. Record all six numbers for both.
  *Verify:* the figures go into `review.md` as evidence. No tuning happens in
  this task — the decision about what to spend headroom on, or what to
  sacrifice, is taken with the numbers in hand and recorded as its own change.

---

## Not in any task

- The octave continuity rule of design §5. It is written only if T25's phone
  numbers leave room and a real engine actually reads half.
- Any change to `envelope()` or a decimated autocorrelation. Both are §13b's
  last resorts and both would make the live answer differ from the batch one;
  neither is folded into this feature quietly.
