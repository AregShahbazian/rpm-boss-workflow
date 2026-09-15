---
id: rb-android
feature: 6-android
branch: feat/6-android
stage: merged
status: closed 2026-09-10 — B1-B15 confirmed by the maintainer
created: 2026-09-10
commits: e55a6c7..2471aad (7 on the branch, unpushed)
---

# Review — Android app

Review only: findings and a checklist, no fixes. Approved fixes land on the
branch as `fix(...): ... [rb-android]`.

## A. Automated

| Check | Result |
|---|---|
| `npm test` | 172 passed, 18 files |
| `npm run lint` | clean |
| `tsc -b` + `npm run build` | clean; the browser build is unchanged by this phase |
| `npm run android:build` | release APK, 3.2 MB |
| `apksigner verify` | signed with the `rpmboss` upload key |

## B. Manual checklist

B1-B11 were driven by Claude on the maintainer's phone over adb: install,
launch, taps, screen dumps and screenshots. Claude cannot hear, so anything
about how a recording *sounds* was the maintainer's. All fifteen confirmed on
2026-09-10.

- [X] **B1** (agent-verified) The signed APK installs and opens to the app (AC 2).
- [X] **B2** (agent-verified) The APK is signed with the dedicated upload key, fingerprint matching the private signing doc (AC 8).
- [X] **B3** (agent-verified) The permission prompt reads "Allow **RPM Boss** to record audio?" and granting it starts the countdown (AC 7, first half).
- [X] **B4** (agent-verified) The plugin logs `source=UNPROCESSED rate=16000 deviceClaimsUnprocessed=true`. This phone gives the raw path, at the app's own sample rate, so nothing is resampled on the device (AC 4).
- [X] **B5** (agent-verified) A ten second recording of laptop playback across the room reads **1640 rpm, 104 marked**, and the marks begin where the playback did rather than at the start of the take (AC 3, AC 5).
- [X] **B6** (agent-verified) Ambient room noise is refused with "Couldn't hear a steady engine in that section", not a number.
- [X] **B7** (agent-verified) Record then immediately Stop reports the clip as too short, and the next recording starts normally — the microphone is released rather than left held (C2 fix).
- [X] **B8** (agent-verified) A second recording after that opens `UNPROCESSED` again, so nothing is stuck busy.
- [X] **B9** (agent-verified) The file picker opens from Upload. Claude could not drive it far enough to choose a file; **B13** covers actually loading one (AC 6).
- [X] **B10** (agent-verified) The result survives a trip out to the picker and back.
- [X] **B11** (agent-verified) `npm test`, lint and the web build all still pass, and nothing in `src/` requires Capacitor to be present (AC 10).
- [X] **B12** Phone: a recording of the real engine sounds right and holds its level for the whole take, and the number matches what the engine is doing.
- [X] **B13** Phone: choosing a file from the picker loads and analyses it (AC 6).
- [X] **B14** Phone: denying the microphone shows "Microphone access was denied", and uploads still work afterwards (AC 7, second half).
- [X] **B15** Phone: the icon looks right on the launcher, under both a round and a square mask (AC 9).

## C. Code-review findings, disposition

Run by Claude at the maintainer's standing permission, at high effort. Seven
findings, all fixed in `9c0e64a`, and the ones reachable from a phone
re-verified afterwards. The maintainer was away, so fixing all seven was
Claude's call; any of them can be reversed.

- **C1** ✅ fixed — Capacitor keeps a rejection's message and its code apart, and the plugin put the app's code in the code field while the web side read the message. A denied microphone came back as "Recording failed. Try again." with no hint that a permission was the problem. Confirmed against `PluginCall.java` and `CapacitorException` before fixing.
- **C2** ✅ fixed — pressing Stop while the microphone was still opening left the native recorder running with nobody to end it: the microphone stayed hot and every later take was refused as busy until the app was killed. Verified on the phone in B7 and B8.
- **C3** ✅ fixed — the capture thread read the plugin's own fields, so tearing a take down raced it, and on activity destroy released the `AudioRecord` out from under a thread still inside `read()`. Each take now owns its recorder, its buffer and its own flag, handed to the thread as a final local, and the join is unconditional.
- **C4** ✅ fixed — a negative `read()`, which is what a phone call or another app taking the microphone looks like, was ignored, so the loop span a core until the hard stop and then returned a silently truncated take. It ends the take and reports `no-audio`.
- **C5** ✅ fixed — `org.gradle.java.home` pointed at this machine's JDK in a tracked file, so any other clone would fail before the first task. The reviewer suggested `local.properties`; that is wrong, Gradle does not read it for this, so the requirement is documented in the README instead.
- **C6** ✅ fixed — the build comment claimed a fresh clone builds, but the Capacitor-generated pieces are not committed. `npm run android:sync` makes them, and the README says so.
- **C7** ✅ fixed — the ten second cap was a JS timer, and Android suspends those when the activity stops, so switching apps mid-recording would have held the microphone with an unbounded buffer. The plugin enforces the cap too.

- **C8** ✅ fixed in `2471aad` — reported by the maintainer from the phone: after denying the microphone and dismissing the warning, Play did nothing until the file was loaded again. Pressing Record disposed the player straight away, and a recording that never started never replaced it. Playback is stopped now rather than torn down, and `setClip` disposes the player when a recording actually arrives. Reproduced in Chrome with `getUserMedia` stubbed to refuse before fixing, and confirmed by the maintainer on the phone afterwards.
- **C9** ✅ done at the maintainer's request — the page heading is gone. It was the last place still reading `rpm-boss` while the app is called RPM Boss, and the launcher, the tab and the app switcher all carry the name anyway. This closes **E2** below.

## D. What changed outside this phase

- **D1** `record.ts` now picks between the native recorder and the audio worklet by platform. Its signature is unchanged and everything above it is untouched.
- **D2** `package.json` gained `android:sync` and `android:build`.
- **D3** A privacy policy is live at `https://mby4m.github.io/legal/rpmboss/`, sourced from `~/git/legal/rpmboss/`, and linked from that site's index.
- **D4** The private signing doc records the alias and fingerprints; the keystore was backed up off-machine.
- **D5** `scripts/apk.sh`, `scripts/install.sh` and `scripts/uninstall.sh` build, install and remove the app. They find a JDK 21 themselves, check for a phone before spending a build, and say which microphone source to look for afterwards.
- **D6** The page heading is gone, from the website as well as the app.

## E. New findings from this round

- **E1** The screen shows "Recording…" and a Stop button while the permission dialog is still up, and the countdown sits at 0.0 until it is answered. Harmless but it claims something that has not started. Not fixed.
- **E2** ~~The heading still reads `rpm-boss`~~ — removed at the maintainer's request; see **C9**.
- **E6** The playback bug in **C8** existed on the website too, and had done since phase 2. It only surfaced now because the phone is where a microphone actually gets denied.
- **E3** Claude cannot judge audio, so B5 proves the pipeline and not the quality. A recording that captured almost nothing would still produce a plausible number if the little it caught was periodic. B12 is the real test.
- **E4** `android/` is committed but the Capacitor-generated pieces inside it are not, so the tree is neither fully generated nor fully checked in. This is the normal Capacitor arrangement and the README now documents the sync step, but it is a seam worth knowing about.
- **E5** The native recorder has no automated test. `pcm16ToFloat` is covered; the plugin itself is only exercised by hand on a device. An instrumented test would need a device in CI, which this project does not have.

## F. Open questions carried from the PRD

- **Does this phone grant `UNPROCESSED`?** Yes, and at 16 kHz. Answered in B4.
- **Does the web recorder stay?** Yes. The browser is the development loop, and a browser build that cannot record would cost more than the second implementation does.
- **What rate does the native path deliver?** 16 kHz, the app's own, so there is no resampling on the phone.

## G. Environment

The maintainer's phone over USB, driven by adb. Claude installed, launched,
tapped, read the screen and took screenshots; it cannot hear, and could not get
far enough into the system file picker to choose a file.
