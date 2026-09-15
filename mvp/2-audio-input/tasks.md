---
id: rb-audio-input
feature: 2-audio-input
stage: tasks
status: T1-T8 done, T9 pending
created: 2026-09-10
---

# Tasks — Audio input

Ordered. Each task ends in a commit referencing `[rb-audio-input]`, with
`npm test` and `npm run lint` green. Pure code first, browser code second, UI
last, so every step is testable as it lands.

## T1 — Types and error messages
- [x] `src/audio/types.ts`: `AudioClip`, `InputErrorCode`, `InputError` class
      with the five messages from design §2.6.
- [x] Commit: `feat(audio): AudioClip type and InputError [rb-audio-input]`

## T2 — Pure resampling
- [x] `src/audio/resample.ts`: `toMono`, `lowpassFir` (windowed sinc, 63 taps,
      Blackman, cutoff 7.2 kHz relative to source rate), `resampleTo16k`.
- [x] `test/resample.test.ts` per design §3: passthrough, 48 kHz stereo
      440 Hz, 44.1 kHz length, 6 kHz survives, 7.9 kHz attenuated.
- [x] Commit: `feat(audio): mono mix and 16 kHz resampler with tests [rb-audio-input]`

## T3 — Pure decode
- [x] `src/audio/decode.ts`: `decodeToClip(channels, sampleRate, source)`.
- [x] `test/decode.test.ts`: every fixture round-trips with documented
      duration and identical samples at 16 kHz.
- [x] Commit: `feat(audio): decodeToClip [rb-audio-input]`

## T4 — File loading (browser)
- [x] `src/audio/load.ts`: `loadFile(file)` with the 50 MB gate, Web Audio
      decode, `AudioContext` closed after use, errors mapped to `InputError`.
- [x] Commit: `feat(audio): loadFile via Web Audio [rb-audio-input]`

## T5 — Recording (browser)
- [x] `src/audio/record.ts`: `record({maxS, onTick, onDone, onError})` per
      design §2.4: constraints, MediaRecorder, 100 ms ticks, wall-clock hard
      stop, idempotent `stop()`, track cleanup, decode via the same path,
      safety trim.
- [x] Commit: `feat(audio): microphone recording with 10 s hard stop [rb-audio-input]`

## T6 — Playback (browser)
- [x] `src/audio/player.ts`: `createPlayer(clip)` with `play`, `stop`,
      `position`, `onEnded`, `dispose`.
- [x] Commit: `feat(audio): clip player [rb-audio-input]`

## T7 — State hook
- [x] `src/state/useAudioInput.ts`: the state machine from design §2.6, with
      `upload`, `startRecording`, `stopRecording`, `dismissError`. Replaces
      the clip on each new input; disposes the previous player.
- [x] Commit: `feat(state): useAudioInput [rb-audio-input]`

## T8 — Screen
- [x] `src/ui/UploadButton.tsx` (hidden file input, `accept="audio/*"`),
      `RecordButton.tsx` (record/stop with "7.3 / 10 s"), `Player.tsx`
      (play/stop + "0:02 / 0:06"), `StatusLine.tsx`, `InputScreen.tsx`.
- [x] `src/App.tsx` renders `InputScreen`. `index.css`: portrait layout,
      48 px targets, error text style.
- [x] Commit: `feat(ui): input screen with upload, record and playback [rb-audio-input]`

## T9 — Manual verification on the phone
- [ ] `./scripts/dev.sh`, open `http://localhost:5173` on Android Chrome.
- [ ] Walk PRD acceptance criteria 1-5 (record hard stop, seven AAC originals,
      WAV/MP3/OGG, 60 MB refusal, playback, mic denial). Note per-format
      decode results, especially M4A and OGG, for the review's open question.
- [ ] Update `README.md` status to "implemented, review pending".
- [ ] No commit unless something was fixed; fixes are `fix(audio|ui): ... [rb-audio-input]`.

## Handoff to review
The review stage writes `review.md` with a numbered checklist from the PRD
acceptance criteria and the T9 findings. No fixes in that stage.

## Test files to have on the phone before T9
- The seven AAC originals from `audio/`.
- One WAV (`test/fixtures/after-cold.wav`), one MP3 and one OGG: generate with
  `ffmpeg -i audio/"after cold.aac" after-cold.mp3` and `... after-cold.ogg`
  into the scratch dir, not the repo.
- A >50 MB dummy: `head -c 60000000 /dev/urandom > big.wav` (must be refused
  by size before decode).
