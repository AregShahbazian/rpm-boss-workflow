---
id: rb-android
feature: 6-android
branch: feat/6-android
status: draft
created: 2026-09-10
depends_on: [5-result-view]
---

# PRD — Android app

## Goal

The same build, wrapped in Capacitor, signed, installed on a phone, and
recording through a microphone path no browser will give us.

## Why

Two reasons, and only one of them is distribution.

The first is that the MVP says the primary target is an Android app. Everything
so far runs in a browser because that is the fastest loop, not because the
browser is the destination.

The second came out of phase 4 and matters more. Android will not hand a web
page unprocessed microphone audio in any dependable way: with echo cancellation
on, the platform gates a steady engine note about a second in, and turning it
off produced silence on one of the two browsers tested. A native recorder can
open `MediaRecorder.AudioSource.UNPROCESSED`, which is not exposed to web pages
at all, and hand raw PCM straight to the same DSP. That is the difference
between an app that reads an engine and one that reads one on some phones.

## User stories

1. As a user, I install RPM Boss from a file, open it, and it looks and behaves
   like the web app because it is the web app.
2. As a user, I press Record and the engine sound arrives unprocessed, at a
   level that holds for the whole take, whatever browser I happen to use.
3. As a user, the app asks for the microphone once, in the way Android asks.
4. As a user, I can still load a file I already have.

## Scope

### In

- **Capacitor shell** around the existing Vite build. No second codebase, no
  framework change, no separate Android UI.
- **Identity**: name `RPM Boss`, package `com.mby4m.rpmboss`, versionCode 1,
  versionName 1.0, minSdk 24, targetSdk 36 — matching the two apps already
  published from this account.
- **Native recorder** as a small Kotlin Capacitor plugin: opens
  `AudioSource.UNPROCESSED`, falls back to `VOICE_RECOGNITION` then `MIC` when
  a device does not offer it, streams PCM to the web layer, and reports which
  source it actually got.
- **One recording path in the app.** The web layer asks the plugin when running
  natively and keeps the worklet path in the browser, behind one interface, so
  neither one grows a copy of the other's logic.
- **Microphone permission** requested through the platform, with the existing
  `mic-denied` message when refused.
- **Icon** from plate 01, Trace, at every density, as an adaptive icon.
- **Signing**: release built with a dedicated upload alias in the release keystore, wired the
  way the other two apps are — real values in a gitignored `key.properties`,
  a tracked example beside it, debug fallback so a fresh clone builds.
- **Installed and exercised on the maintainer's phone**, with screenshots for a
  later store listing.
- **Privacy policy** written and published at
  `https://mby4m.github.io/legal/rpmboss/`, since the app takes microphone input.

### Out

- **Anything in the Play Console.** No app created, no track, no upload, no
  tester list. Explicitly deferred by the maintainer.
- The 12-tester rule, the store listing copy, the feature graphic.
- iOS. Capacitor would allow it; nothing about this project asks for it.
- Background recording, foreground services, notifications.
- Any change to the DSP, the analysis, the crop or the result view.

## Acceptance criteria

1. `npx cap sync android` and a release build both succeed from a clean tree.
2. The signed APK installs on the maintainer's phone and opens to the app.
3. Recording works in the installed app, and the level holds for a five second
   take of the same laptop playback that faded in the browser.
4. The plugin reports the audio source it opened, and on this device that is
   `UNPROCESSED`.
5. Calculate on a native recording gives a number consistent with the same
   audio analysed in the browser.
6. Upload still works in the installed app.
7. Denying the microphone shows the existing message, and the app stays usable
   for uploads.
8. The APK is signed with the `rpmboss` upload key, confirmed against the
   fingerprints recorded in a private signing doc.
9. The icon appears correctly on the launcher, in both a round and a square
   mask.
10. `npm test`, `npm run lint` and `npm run build` still pass, and the browser
    build is unaffected.

## Non-goals and constraints

- The web build stays the source of truth. Nothing in `src/` may depend on
  Capacitor being present; the native path is behind a runtime check.
- No Capacitor community plugin for audio. The requirement is one specific
  audio source, and a plugin that does not expose it is worse than thirty lines
  of Kotlin that does.
- The keystore lives outside the repo and never enters it.

## Open questions

- **Does this phone actually grant `UNPROCESSED`?** It is optional; a device
  advertises it through `PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED` and may
  simply route it to `MIC`. The fallback order handles it either way, but the
  answer decides whether the native app is genuinely better here or only in
  principle. Answered by AC 4 on the real device.
- **Does the web recorder stay?** Keeping it means two capture paths forever.
  Removing it means the browser version loses recording entirely. Decide in
  design, but the browser is the test loop, so leaning towards keeping it.
- **What sample rate does the native path deliver?** Whatever the device gives;
  `decodeToClip` resamples. Worth confirming it is not doing something
  expensive at 48 kHz on a phone.
