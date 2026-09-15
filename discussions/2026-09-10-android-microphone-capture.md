# Recording on Android: what the microphone will and will not give a web page

**Date:** 2026-09-10
**Phase:** 4 (analysis), during the review stage
**Device:** ASUS AI2302, Android, Brave and Chrome

## The short version

Recording engine sound in a mobile browser needs the voice processors off. Echo
cancellation, specifically, gates a steady engine note about a second in and
leaves nothing the analysis can read. Turning it off works in Chrome. Brave
grants the request and then delivers digital silence.

The app now asks for all three processors off, captures through an audio
worklet rather than `MediaRecorder`, and fails in 300 ms with a message naming
the cause when a browser hands back silence.

## How it surfaced

The maintainer played `all-samples.m4a` from a laptop, held the phone next to
it and recorded. The clip sounded like it faded after a second. The
development-only export button, added minutes earlier for exactly this, saved
the recording; measuring it showed the level dropping roughly forty times
between 1.0 s and 3.0 s and partly recovering at 3.0 s.

Without that button the recording would have been lost to a page reload, as an
earlier one had been. It earned its place before it was a day old.

## The chain of wrong guesses

Worth recording, because three of the four were reasonable and wrong.

1. **"Echo cancellation is on, turn it off."** Correct diagnosis, and it
   reproduced the phase 2 failure exactly: `MediaRecorder` delivered container
   headers and no audio. Phase 2 had left the flag on for this very reason,
   without knowing what it cost.
2. **"Then drop `MediaRecorder` and capture raw through Web Audio."** Right
   move, wrong implementation. The first version left the worklet node
   unconnected, on the reasoning that a capture node needs no output. Web Audio
   only renders the part of the graph that reaches the destination, so
   `process` was called on schedule with silence in its input. The phone
   produced a clip of exactly the right length with every sample zero.
3. **"The graph is fixed, so it will work now."** It did not, and at that point
   two failures in a row made the app the likelier suspect than the device.
4. **"Browser recording on Android cannot produce usable engine audio."**
   Overreached. It was true of the browser being tested and not of the
   platform. The maintainer pushed back on exactly this, and was right to.

## What settled it

Guessing had to stop, and the phone has no reachable console, so the numbers
had to go on screen. A development-only **Mic check** opens the microphone
three times — all processors off, echo cancellation only, browser defaults —
and for each one reports what the platform actually granted, the level through
an analyser hung straight off the source, and the level through the same
worklet the recorder uses. Two independent measurements, so the capture path
can be cleared or blamed without argument.

Chrome, all processors off, one reading per 250 ms:

```
0.034 0.035 0.048 0.033 0.047 0.035 0.040 0.040 0.030 0.040 0.040 0.029
```

Flat. Chrome, echo cancellation on:

```
0.005 0.080 0.075 0.042 0.015 0.007 0.0001 0.0015 0.0029 0.0027 0.0054 0.0016
```

The gate closing, live. Brave, all processors off: `echoCancellation=false`
granted, then 94,848 frames with a peak of exactly `0.00000` while the engine
was playing.

Three facts fall out. Echo cancellation is the cause of the fade, and it is
reproducible on demand. The capture path is sound, since an analyser hung
directly off the source agrees with it. And Brave is alone in refusing.

## Decisions

- **All three processors off**, and not negotiable: the one sound this app
  exists to hear is exactly the kind a voice processor removes.
- **Capture through an audio worklet, not `MediaRecorder`.** No encoder, no
  container, no decode round trip, and not tied to the echo cancellation
  switch. Frames arrive at the microphone's rate and go through the resampler
  that was already under test.
- **No fallback to processed capture.** The gated audio was run through the
  analysis section by section: confidence 0.00 everywhere, and nonsense rates.
  A fallback would show a healthy waveform and fail at Calculate, which is a
  worse place to fail than at the start.
- **Fail fast and say something useful.** 300 ms of exact zeros is enough to
  stop, because a real microphone always has a noise floor. The message names
  the cause and points at Chrome or an upload, rather than reporting "no audio
  was captured" and leaving the user nowhere.

## What this says about the stack

The maintainer asked, mid-struggle, whether the stack was wrong for this. The
evidence says no, with one qualification. Analysis, waveform, cropping and
uploads were never in question. Microphone capture is the one place where the
browser is a thin layer over a platform that has its own ideas, and where a
single browser can take the capability away entirely.

Phase 6 wraps the same build in Capacitor. Android's native recorder can open
an unprocessed audio source, which is not exposed to web pages at all, so the
shipped app has a route that does not depend on browser goodwill. That was
already the plan; this makes it a deliberate one.

## Loose ends

- The **Mic check** panel is development-only and stays for now. It is the only
  way to ask this question of a phone without a cable.
- Whether Brave is doing this deliberately, as fingerprinting protection, is
  unknown. Not worth chasing.
- The parabolic lag refinement could run past the peak on degenerate audio and
  return a negative rate. Always rejected for low confidence, so it never
  reached a user, but it is guarded now in both the port and the baseline.
