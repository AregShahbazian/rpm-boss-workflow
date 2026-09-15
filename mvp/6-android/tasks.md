---
id: rb-android
feature: 6-android
branch: feat/6-android
status: draft
created: 2026-09-10
---

# Tasks — Android app

Commit subjects carry `[rb-android]`. The web build must keep passing
throughout: `npm test`, `npm run lint`, `npm run build`.

- **T1** Capacitor: install `@capacitor/core`, `@capacitor/cli`,
  `@capacitor/android`; `capacitor.config.ts` with the app id, name and
  `webDir: dist`; `npx cap add android`; commit the generated tree.
- **T2** Identity and gitignore: name, versionCode, versionName, minSdk 24,
  targetSdk 36, and `key.properties` / `*.jks` ignored.
- **T3** `RawAudioPlugin.kt`: `AudioRecord` with the source fallback chain,
  16 kHz mono, background read loop, `start`/`stop`, permission handling,
  reporting the source and rate it got. Registered in `MainActivity`.
- **T4** `src/audio/native.ts`: the plugin's typed face, base64 to
  `Float32Array`, through `decodeToClip`, raising the existing `InputError`
  codes.
- **T5** `record.ts` picks native or worklet by platform, signature unchanged.
- **T6** Icon: Trace as an adaptive icon at every density, plus a 512 px master.
- **T7** Signing: `key.properties.example`, the Gradle block with debug
  fallback, and a release build.
- **T8** Install on the phone over adb, launch, grant the microphone, exercise
  upload and Calculate, capture the reported audio source, take screenshots.
- **T9** Privacy policy at `~/git/legal/rpmboss/index.html`, pushed.
- **T10** `review.md`, carrying whatever T8 found and what the maintainer still
  has to judge by ear.

Scope check before calling the phase done: `git log main..feat/6-android`.
