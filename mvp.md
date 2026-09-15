# rpm-boss — MVP definition (leading document)

**Last updated:** 2026-09-11
**Status:** active. Everything in this repo is measured against this doc.

## What it is

An app that tells you the RPM of a running combustion engine from its sound.
Point the phone at the engine, record a few seconds (or pick a recording you
already have), press Calculate, read one number.

Target engines: simple ones. Single cylinder, not running too smoothly, e.g. a
motorcycle or generator at idle. Multi-cylinder engines are out of scope for
the MVP.

No backend. No account, no login. Everything runs on the device.

## Users and platforms

- **Primary:** Android app, published through Google Play.
- **Also:** the same app in a mobile browser (Android Chrome). Used for most
  testing during development, and must support mic recording and file upload.
- Desktop is not a target. It should not break, but nothing is designed for it.

One codebase for both; see Stack.

## Inputs

1. **Upload** a pre-recorded audio file: WAV, MP3, AAC/M4A, OGG. Max 50 MB.
   Video files are out of the MVP (see backlog).
2. **Record** live in the app. Hard stop at 10 s, visible countdown.

Both paths produce a 16 kHz mono buffer that the user can play back. The user
then **crops** it, with the waveform visible, to the clearest section. Cropping
is always shown and the analysed window is capped at **10 s**, so long files
are handled by picking a window, not by rejecting them. Mic capture runs with
echo cancellation, noise suppression and auto gain off.

## Analysis

- Engine type: **4-stroke single only** in the MVP. One combustion per two
  revolutions, a fixed factor rather than a user-facing preset. The
  4-stroke / 2-stroke toggle moved to the backlog on 2026-09-10: there is no
  2-stroke recording to validate it against.
- Optional **expected range** (min-max RPM). Not required. Rationale: when the
  estimator is wrong it tends to be wrong by a multiple (octave errors,
  half/double counting), not by a few percent, so a coarse range disambiguates
  bad audio.
- Output: **one number**, not a range.
- Visualization: the analysed section as a waveform with the detected
  combustions highlighted, so the user can judge whether the app "heard" it
  right. Since phase 8 this is the crop waveform itself, zoomed to the window,
  rather than a second canvas below the number.

Reference method (from the sample analysis, `~/git/rpm-boss/audio/combustion-counts.md`):
mono 16 kHz, Butterworth bandpass 60-2000 Hz, full-wave rectify, lowpass 150 Hz
envelope, then (B) autocorrelation per 1 s window, lag range 8-100 pulses/s,
median across windows; cross-checked by (A) peak counting with
`find_peaks(distance = 0.6 * sr / rate, prominence = 0.5 * std)`.
Both agree within ~3 % on all seven samples. RPM = pulses/s x 60 x
(revolutions per pulse: 2 for 4-stroke, 1 for 2-stroke).

## Ground truth

Seven recordings of a single-cylinder 4-stroke at idle, 6-16 s each, AAC 48 kHz
stereo, in `~/git/rpm-boss/audio/`, with independently verified pulse counts in
`combustion-counts.md` (1400-1800 RPM). These are the test fixtures. Every
change to the analysis is judged by the test suite over these files; the
tolerance is set per file from the A/B agreement in that table.

## UI (MVP)

One screen, one grid, two layouts. The same seven parts in the same DOM order;
only where they sit changes.

1. Source: **Open audio** | **Record** (with a countdown/limit), and a settings
   icon holding the language and the light/dark choice.
2. Waveform of the loaded audio with a crop range selector, plus an overview
   strip above it when the clip is longer than the detail view shows.
3. Play, and the crop's start, end and length.
4. Optional expected range fields.
5. **Calculate** button.
6. Result: the RPM as one large number, and how many combustions were counted.

There is one waveform, not two. When a result arrives the crop canvas zooms to
the analysed window and draws a mark on every combustion, so the number and the
evidence for it are the same picture. Touching the waveform widens the view
again.

**Stacked** below 600 px, or on any screen taller than it is wide: the parts in
the order above, one column.

**Split** at 600 px and wider in landscape: a control column beside a signal
column. The switch is width *and* shape, because a waveform gains almost
nothing from height and everything from width. Phase 8 measured what happens
otherwise: a portrait tablet took the landscape layout and the whole app
collapsed into a band across the middle of the screen.

Dark by default; light is a choice, not the device's. Urdu mirrors the whole
layout from one `dir` attribute, because grid columns follow the inline
direction.

## Stack

- **TypeScript, React, Vite.** One codebase.
- **DSP module:** hand-written, pure functions over `Float32Array`, no DOM
  dependency. Ported from the scipy reference. Runs in a Web Worker in the app
  and in Node under test.
- **Tests:** vitest. Fixtures = the seven recordings decoded to 16 kHz mono WAV
  (via ffmpeg, checked in) plus expected RPM and tolerance.
- **Audio I/O:** Web Audio `decodeAudioData` for files (incl. MP4 audio track),
  `MediaRecorder` + `getUserMedia` for recording.
- **Android:** Capacitor wrapping the same build. Native plugins only where a
  WebView API falls short.
- **Waveform UI:** canvas, hand-drawn.
- No backend, no auth, no analytics.

Rejected: Flutter (web would be second-class, and web is the test loop), Python
on device (not shippable), essentia/librosa-style WASM libraries (method does
not need them).

## MVP done means

- Upload or record, crop, Calculate, see one RPM and the marked waveform, on
  Android Chrome and as an installable Android app.
- Every user-facing string goes through the translation layer, with English,
  Tagalog and Bisaya available (phase 7).
- The interface has had its full redesign (phase 8), portrait and landscape,
  dark and light, judged with every screen in place rather than one phase at a
  time.
- Test suite green on all seven fixtures.
- Public repo with README and a runnable dev setup.

## Future (not MVP) — see backlog.md
Video input with crop-and-preview, noise reduction, user-marked combustions, live tachometer without recording,
tachometer gauge UI, named/grouped results per vehicle, multi-cylinder presets,
the 4-stroke / 2-stroke preset.
