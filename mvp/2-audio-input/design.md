---
id: rb-audio-input
feature: 2-audio-input
stage: design
status: draft
created: 2026-09-10
---

# Design — Audio input

Implements `prd.md`. Everything below is scoped to this feature; later features
consume `AudioClip` and nothing else from here.

## 1. The one shape: `AudioClip`

```ts
// src/audio/types.ts
export interface AudioClip {
  sampleRate: 16000          // fixed for the whole app
  samples: Float32Array      // mono, -1..1
  durationS: number          // samples.length / sampleRate
  source: { kind: 'file' | 'mic'; name: string }  // file name or "Recording 15:04"
}
```

Fixed 16 kHz is a design decision, not a parameter: the fixtures, the
reference method and the analysis all assume it. A clip longer than 10 s is
allowed here; the crop feature enforces the window.

## 2. Modules (no React below `src/audio/`)

```
src/audio/
  types.ts        AudioClip, InputError
  resample.ts     toMono(), resampleTo16k()      pure, tested in Node
  decode.ts       decodeToClip(channels, rate)   pure: mono + resample + trim
  load.ts         loadFile(file): Promise<AudioClip>     browser (Web Audio)
  record.ts       record(opts): Recording                browser (MediaRecorder)
  player.ts       createPlayer(clip): Player             browser (Web Audio)
src/state/
  useAudioInput.ts   state machine hook used by the screen
src/ui/
  InputScreen.tsx  UploadButton.tsx  RecordButton.tsx  Player.tsx  StatusLine.tsx
```

### 2.1 `resample.ts` (pure)

- `toMono(channels: Float32Array[]): Float32Array` — arithmetic mean per
  sample. One channel returns a copy.
- `resampleTo16k(x: Float32Array, fromRate: number): Float32Array`
  - `fromRate === 16000`: return as is.
  - Anti-alias first: windowed-sinc FIR lowpass, cutoff 7.2 kHz, 63 taps,
    Blackman window, applied only when `fromRate > 16000`.
  - Then linear interpolation at the new positions
    `i * fromRate / 16000`. Linear is enough after the lowpass for this
    use (analysis band is 60-2000 Hz); documented as a known simplification.
  - Upsampling (`fromRate < 16000`, unlikely) is plain linear interpolation.
- Both are `O(n)` and synchronous. A 10 s clip at 48 kHz is 480k samples,
  well under 50 ms; no worker in this phase.

### 2.2 `decode.ts` (pure)

`decodeToClip(channels, sampleRate, source): AudioClip` = `toMono` →
`resampleTo16k` → build the clip. No trimming here (crop feature owns it).

### 2.3 `load.ts` (browser)

```
loadFile(file: File): Promise<AudioClip>
```
1. `file.size > 50 * 1024 * 1024` → throw `InputError('too-large')` before
   reading anything.
2. `file.arrayBuffer()` → `new AudioContext().decodeAudioData(buf)`.
   Decode failure → `InputError('undecodable')`.
3. Pull `getChannelData(c)` for each channel → `decodeToClip(...)` with
   `source = { kind: 'file', name: file.name }`.
4. Close the `AudioContext`.

Accepted MIME/extension list is only a hint to the picker
(`accept="audio/*"`); the real gate is decode success, so a promised format
that the WebView cannot decode surfaces as `undecodable` and becomes a review
finding, per the PRD.

### 2.4 `record.ts` (browser)

```
record({ maxS = 10, onTick, onDone, onError }): { stop(): void }
```
1. `getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false,
   autoGainControl: false, channelCount: 1 } })`. Permission errors →
   `InputError('mic-denied')`, no device → `InputError('no-mic')`.
2. `new MediaRecorder(stream)` with the default mimeType (WebM/Opus on
   Android Chrome). Chunks collected on `dataavailable`.
3. `onTick(elapsedS)` every 100 ms from `performance.now()`.
4. Hard stop: `setTimeout(stop, maxS * 1000)`. `stop()` is idempotent, stops
   the recorder and every track of the stream.
5. On `stop` event: `new Blob(chunks)` → same decode path as a file
   (`decodeAudioData` on the blob's buffer) → `decodeToClip` with
   `source = { kind: 'mic', name: 'Recording HH:MM' }`. Then a safety trim to
   `maxS` seconds in case the recorder overshoots.

Note: the recorder's own timestamps are not used; the hard stop is wall-clock
and the trim guarantees the contract.

### 2.5 `player.ts` (browser)

```
createPlayer(clip): { play(), stop(), position(): number, onEnded(cb), dispose() }
```
`AudioContext` + `createBuffer(1, n, 16000)` filled from `clip.samples`, one
`AudioBufferSourceNode` per `play()`. `position()` =
`ctx.currentTime - startedAt`, clamped to duration. `onended` resets state.

### 2.6 `useAudioInput` (state machine)

```
idle → decoding → loaded
idle → recording → decoding → loaded
any  → error(message) → idle (on next action)
```
State: `{ status, clip?, elapsedS?, error? }`. Actions: `upload(file)`,
`startRecording()`, `stopRecording()`, `dismissError()`. Recording or loading
again replaces `clip`.

Error messages (single sentence each, in `src/audio/types.ts`):

| code | message |
|---|---|
| too-large | "That file is over 50 MB. Pick a shorter recording." |
| undecodable | "Couldn't read that file. Use WAV, MP3, AAC/M4A or OGG." |
| mic-denied | "Microphone access was denied. Allow it in the browser and try again." |
| no-mic | "No microphone found on this device." |
| record-failed | "Recording failed. Try again." |

### 2.7 UI

One screen, portrait, no router:

```
[ rpm-boss ]
[ Upload audio ]  [ ● Record ]        ← Record turns into "■ Stop  7.3 s" while recording
StatusLine: "Loaded: after cold.aac · 6.4 s"  |  "Decoding…"  |  error text
[ ▶ Play ]  0:02 / 0:06
```

- Upload = `<input type="file" accept="audio/*">` behind a styled button.
- Countdown text shows elapsed and the 10 s cap: "7.3 / 10 s".
- Plain CSS in `index.css`, large touch targets (min 48 px), no UI library.

## 3. Tests

- `test/resample.test.ts`: 16 kHz passthrough is identical; a 48 kHz stereo
  synthetic (440 Hz on L, 440 Hz on R with half amplitude) resamples to 16 kHz
  with length `n/3` (tolerance 1 sample) and a dominant frequency of 440 Hz
  measured by zero crossings (tolerance 2 Hz); a 44.1 kHz input gives the
  expected length; a 6 kHz tone at 48 kHz survives (amplitude > 0.8 of input),
  a 7.9 kHz tone is attenuated (< 0.5).
- `test/decode.test.ts`: `decodeToClip` on each 16 kHz fixture returns the
  documented duration and the same samples.
- Browser behaviour (upload of the AAC originals, recording, playback, error
  messages) is checked manually in the review checklist. No jsdom this phase.

## 4. Out of scope reminders

No worker, no waveform, no crop, no persistence, no video, no seeking. Keep
`src/audio/` importable from Node (no `window` at module top level).
