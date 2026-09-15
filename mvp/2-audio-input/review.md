---
id: rb-audio-input
feature: 2-audio-input
stage: review
status: closed — B1-B13 pass (maintainer, 2026-09-10) after fix 5b30457; C1-C4, C8 fixed in 1f812bc
created: 2026-09-10
commits: 509c64a..3f98b26 (8 commits on main, unpushed at time of writing)
---

# Review — Audio input

Review only: findings and a checklist, no fixes. Fixes, if any, are decided
after the checklist is filled and go in as `fix(...): ... [rb-audio-input]`.

## A. Automated

| Check | Result |
|---|---|
| `npm test` | 22 passed (fixtures 7, resample 7, decode 8) |
| `npm run lint` | clean |
| `tsc -b` + `npm run build` | clean, 220 kB JS |

## B. Manual checklist (Android Chrome, `./scripts/dev.sh`, http://localhost:5173)

Fill in with ✅ / ❌ and a note. Test files are in `Download/rpms` on the phone.

- [x] **B1** ✅ **Record hard stop** — passes after fix 5b30457 (C7). Before the fix: 0.1 s clip, 205 bytes recorded.
- [x] **B2** ✅ **Record early stop** — passes after fix 5b30457 (C7). Before the fix: empty blob, decode error.
- [X] **B3** **Seven AAC originals** upload and decode; durations match `combustion-counts.md` (11.2, 9.5, 9.8, 6.4, 6.6, 15.9, 8.1 s).
- [X] **B4** **WAV** decodes (after-cold.wav, 6.4 s).
- [X] **B5** **MP3** decodes (after-cold.mp3).
- [X] **B6** **OGG** decodes (after-cold.ogg) — open question from the PRD.
- [X] **B7** **M4A** decodes (after-cold.m4a) — open question from the PRD.
- [X] **B8** **60 MB refusal** — big.wav is refused at once with the 50 MB message, no "Decoding…" state shown.
- [X] **B9** **Undecodable file** — any non-audio file under 50 MB gives the "Couldn't read that file" message.
- [X] **B10** **Mic denied** — deny once: permission message; allow: Record works.
- [X] **B11** **Playback** — plays to the end, counter returns to 0:00; Stop mid-way resets; playing again after a new upload uses the new clip.
- [X] **B12** **Replace** — uploading while a clip is loaded replaces it; recording while playing stops playback first.
- [X] **B13** **Desktop Chrome** — nothing breaks (layout only).

## C. Code review findings (self-review, ordered by weight)

- **C1** ✅ fixed in 1f812bc — Double resampling in the browser. `decodeBuffer` creates a default `AudioContext`, so `decodeAudioData` first resamples the file to the device rate (48 kHz on Android), then `resampleTo16k` resamples again. Correct, but a wasted pass and two interpolation steps. Constructing `new AudioContext({ sampleRate: 16000 })` makes the browser deliver 16 kHz directly with its own resampler; `resampleTo16k` then only runs in tests and as a fallback. Suggested fix, small. (`src/audio/load.ts:6`)
- **C2** ✅ fixed in 1f812bc — `recorder.start()` is not guarded. If the WebView rejects the default mimeType or the stream is unusable, `start` throws inside the async IIFE and only surfaces as an unhandled rejection; the UI stays in "recording". Wrap it and route to `onError('record-failed')`. (`src/audio/record.ts:96`)
- **C3** ✅ fixed in 1f812bc — Redundant branch in the recorder's `onstop` catch: both arms build the same `InputError('record-failed', e)`. Cosmetic. (`src/audio/record.ts:88`)
- **C4** ✅ fixed in 1f812bc — Error state hides the clip actions. In `error` status the Player stays visible only if a clip exists, which is right, but the error text is dismissed by tapping it, with no hint that it is tappable. Consider auto-clearing on the next action only (already done) and dropping the tap handler, or adding a small "dismiss". UX nit.
- **C5** Recording name is local time without date. Two recordings in the same minute get the same name. Irrelevant until results are stored (backlog).
- **C6** No test for `trimClip` on a mic clip path — it is covered on a fixture, which exercises the same function. Acceptable.

- **C7** **Blocker.** `echoCancellation: false` starves MediaRecorder on the test phone (ASUS AI2302, Chrome 140). Probed on-device over DevTools: default constraints give 46 kB per 3 s; `echoCancellation:false` alone gives 0 bytes and also forces `noiseSuppression` and `autoGainControl` to false in the resulting track settings; `noiseSuppression:false` alone and `autoGainControl:false` alone both record normally (46 kB). So on this device "echo cancellation off" switches the capture to a raw path that never delivers frames to the recorder. Suggested fix: leave `echoCancellation` at the browser default, keep `noiseSuppression:false` and `autoGainControl:false`, keep `channelCount:1`; and make the recorder fail loudly if it produced fewer than ~1 kB (a clear "no audio captured" message instead of a decode error). Whether AGC/NS off actually helps the analysis is for `4-analysis` to measure; the fixture recordings were made with a stock recorder app, processing on. (`src/audio/record.ts:18`)
- **C8** ✅ fixed in 1f812bc — On a non-secure origin (the LAN address) `navigator.mediaDevices` is undefined and the user sees "Recording failed". Should say that the microphone needs `localhost` or https. The dev script should also re-apply `adb reverse` on demand, because the mapping is lost when the phone reconnects (happened during this review). (`src/audio/record.ts:46`, `scripts/dev.sh`)
- **C9** ✅ kept, committed in ebd95e9 — debug aids added during this review: dev-only cause chain appended to the error message in `useAudioInput.fail()` and a `[rec]` console line with chunk count and blob size in `record.ts`. Keep the console line, keep the cause chain dev-only; both go into the fix commit or are dropped, to be decided with the fixes.

- **C10** Dev-only cause chain (C9) shows on the 50 MB refusal too, e.g. "[dev: InputError: …]". Expected: dev builds only, stripped in production. Not a defect.

## D. Open question carried from the PRD

Whether Android Chrome decodes OGG/Vorbis and M4A through `decodeAudioData`.
Answered: B6 (OGG) and B7 (M4A) both decode on Android Chrome 140 and on laptop Chrome. No decoder needed. If either fails, the decision is a
discussion (drop the format from the promise, or add a decoder), not a fix
in this stage.

## E. Test environment decision
Laptop browser (upload + playback) is the dev-test loop from here on; the phone is only needed for recording and the Android phase. Laptop mic does not work under Ubuntu on this machine (separate, pre-existing issue), so recording is out of the laptop loop.
