---
id: rb-audio-input
feature: 2-audio-input
status: draft
created: 2026-09-10
depends_on: [1-bare-app]
---

# PRD — Audio input

## Goal

Get engine sound into the app as one decoded buffer, from an uploaded file or
the microphone, so that every later feature works on a single, known input
shape regardless of where the audio came from.

## Why

The analysis is only as good as its input. Users have two realistic situations:
they are standing next to the engine with the phone, or they already have a
recording. Both must end in the same place, with enough control to check what
was captured. See [`discussions/2026-09-10-audio-input-scope.md`](../../discussions/2026-09-10-audio-input-scope.md) for the
decisions behind the limits below.

## User stories

1. As a user with a running engine, I tap Record, hear/see a countdown, and
   after at most 10 s the app has my recording.
2. As a user with a recording on my phone, I tap Upload, pick the file, and the
   app has it.
3. As a user, I can play back what the app has, to check it captured the
   engine and not my thumb over the mic.
4. As a user, if something goes wrong (unsupported file, too large, mic
   denied), I get one plain sentence telling me what and what to do.

## Scope

### In
- **Upload** via the platform file picker. Accepted: WAV, MP3, AAC/M4A, OGG.
  Max **50 MB**; larger files are refused before decoding.
- **Record** via the microphone. **Hard stop at 10 s.** Visible countdown
  while recording, a Stop button to end early. Mic constraints: echo
  cancellation off, noise suppression off, auto gain off, mono.
- **Decode** both to the internal shape: **mono, 16 kHz**, `Float32Array`
  samples in the range -1..1, plus the sample rate and duration. Recordings
  arrive as WebM/Opus (MediaRecorder on Android Chrome) and go through the
  same decode path.
- **Playback** of the loaded buffer: play/stop, current position shown as
  time text. No seeking in this phase.
- **State shown:** empty, decoding, loaded (duration, source name), recording
  (countdown), error (message). One screen, phone portrait.
- **Errors:** unsupported or undecodable file, file over 50 MB, microphone
  permission denied, no microphone. Each a single sentence with a retry path.
- **Replace:** loading or recording again replaces the current buffer.

### Out
- Video files (backlog: video input with crop-and-preview).
- Cropping and the waveform display (3-waveform-crop). The 10 s analysis
  window limit is enforced there, not here; long uploads are accepted whole.
- Any analysis, presets, expected range, persistence, result view.
- Seeking, volume, trimming during playback.
- Desktop-specific layout. It must not break on desktop, nothing more.

## Acceptance criteria

1. On Android Chrome via `localhost` (adb reverse), Record captures up to 10 s
   and stops itself at 10.0 s (tolerance 0.2 s); Stop ends it earlier.
2. Each of the seven fixture originals in `audio/` (AAC) uploads and decodes;
   the resulting buffer is 16 kHz mono with the duration in
   `test/fixtures/expected.json` (tolerance 0.1 s).
3. A WAV, an MP3 and an OGG file upload and decode. A 60 MB file is refused
   with the size message without being read into memory.
4. Playback plays the loaded buffer from start to end and stops.
5. Denying the mic permission shows the permission message and the Record
   button remains usable after granting.
6. Unit tests: the decode-to-internal-shape step (resample to 16 kHz, mix to
   mono) is a pure function tested against the WAV fixtures and against a
   synthetic stereo 48 kHz signal.
7. `npm test`, `npm run lint`, `npm run build` pass.

## Non-goals and constraints

- No backend. Nothing leaves the device.
- No new runtime dependencies for decoding; Web Audio `decodeAudioData`
  and `MediaRecorder` only. If Android Chrome cannot decode a promised
  format through Web Audio, that is a finding for the review, not a reason to
  add a library in this phase.
- Keep the input module free of React: a small API (`loadFile`, `record`,
  `decodeToInternal`) that later features and tests call directly.

## Open questions

- Does Android Chrome's `decodeAudioData` accept every promised container
  reliably (in particular M4A and OGG/Vorbis)? To be verified in review; the
  fallback decision, if any, is a separate discussion.
