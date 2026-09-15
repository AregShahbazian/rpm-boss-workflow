# Audio input scope (MVP phase 2-audio-input) — 2026-09-10

Discussion before writing the PRD for the first phase built under the gated
workflow. The maintainer set the limits, Claude proposed defaults where asked.

## Summary
Every input, uploaded or recorded, ends as a mono buffer and is always passed
through a crop step capped at 10 s, so long files are handled and huge files
are prevented. Video input is deferred: it needs a proper crop-with-preview
flow (like sharing a video on WhatsApp) that is too much for the MVP.

## Conclusions
- Max analysed window: **10 s**. Crop is **always shown**, even for short files.
- Recording: **hard stop at 10 s**, visible countdown, stop button.
- Upload size cap: **50 MB** (duration stays the real bottleneck).
- Formats promised: **WAV, MP3, AAC/M4A, OGG**. Recordings arrive as
  WebM/Opus from MediaRecorder on Android Chrome, so that decodes too.
- Internal format: **16 kHz mono**, matching fixtures and the reference method.
- Mic constraints: echo cancellation, noise suppression and auto gain **off**,
  mono. Browser processing mangles engine pulses.
- **Playback** of the loaded audio is in scope for this phase.
- **Video files: out of the MVP** (backlog).

## Open questions
- Whether a 10 s window is always enough for the autocorrelation method at
  very low idle; revisit in 4-analysis if fixtures disagree.

## Ideas to realize
- Video input with crop-and-preview: load a long video, scrub with the
  waveform visible, pick the section, extract audio. Post-MVP.
- Long-audio crop UX: overview waveform plus a movable 10 s window, for files
  much longer than 10 s (needed in 3-waveform-crop, note for its PRD).
