---
id: rb-i18n
feature: 7-i18n
branch: feat/7-i18n
status: draft
created: 2026-09-10
---

# Design — Languages

## 0. The strings, counted

Every user-facing string in the app today, which is what the extraction has to
cover. Twenty-three, not the nineteen the PRD guessed.

| Where | Count | What |
|---|---|---|
| `audio/types.ts` | 9 | input errors, including the one with a number in it |
| `dsp/types.ts` | 3 | analysis errors |
| `ui/StatusLine.tsx` | 5 | idle, decoding, recording, loaded, dismiss |
| `ui/UploadButton.tsx` | 1 | Upload audio |
| `ui/RecordButton.tsx` | 2 | Record, Stop |
| `ui/Player.tsx` | 2 | Play, Stop |
| `ui/RangeFields.tsx` | 3 | legend, Min, Max |
| `ui/InputScreen.tsx` | 1 | Calculate |
| `ui/ResultView.tsx` | 4 | Analysing, rpm, marked, and the two octave notes |
| `ui/octave.ts` | — | the two notes live here |

Development-only text in `MicCheck.tsx` and `ExportButton.tsx` is excluded, per
the PRD.

Two of these are not plain strings. The too-short message carries a duration,
and the loaded line carries a filename and a length. Both are handled in §3.

## 1. Rewriting the English first

Every language is translated from English, so jargon and long sentences cost
seventeen times over. The rewrite happens before any translation, and it is
part of this phase rather than a tidy-up afterwards.

| now | after |
|---|---|
| That clip is too short. Record or pick at least 2 seconds. | Record at least 2 seconds. |
| Couldn't hear a steady engine in that section. Try a clearer part of the recording. | No steady engine sound here. Try another part. |
| This browser will not record without the processing that mutes engine sound. Record in Chrome, or upload a file instead. | This browser cannot record engine sound. Use Chrome, or open a file. |
| Couldn't read that file. Use WAV, MP3, AAC/M4A or OGG. | Cannot open that file. Use WAV, MP3, AAC/M4A or OGG. |
| That file is over 50 MB. Pick a shorter recording. | Too big. Use a recording under 50 MB. |
| Microphone access was denied. Allow it in the browser and try again. | Microphone blocked. Allow it, then try again. |
| No audio was captured. Check that no other app is using the microphone and try again. | Nothing was recorded. Close other apps using the microphone. |
| The microphone only works over https or localhost. Open the app from a secure address. | The microphone needs a secure address (https). |
| Couldn't run the analysis. Reload the page and try again. | Analysis could not start. Reload the page. |
| Upload a recording or record the engine. | Open a recording, or record the engine. |
| Recording… hold the phone near the engine. | Recording. Hold the phone near the engine. |
| Upload audio | Open audio |
| The selected window is under 2 seconds. Widen it and try again. | Choose at least 2 seconds. |

Two words go for being jargon rather than for being long. **Clip** is an
editing word; a rider says recording. **Upload** implies sending something
somewhere, which this app never does, and *unggah* / *muat naik* carry the same
implication in Indonesian and Malay. Opening a file is what actually happens.

The changed English is what gets translated, and it changes the app in English
too.

## 2. The layer

```
src/i18n/
  index.ts          t(), current language, setLanguage, detection
  languages.ts      the seventeen: code, own name, and where it comes from
  en.ts             the source, and the type every other file must satisfy
  es.ts fr.ts pt.ts id.ts ms.ts fil.ts ceb.ts hy.ts vi.ts
  th.ts hi.ts ur.ts ru.ts uk.ts sw.ts bn.ts
```

No library. `en.ts` exports a plain object; every other file is typed
`Messages`, so a missing or misspelled key is a TypeScript error rather than a
runtime surprise. That is most of what an i18n library sells, obtained from the
compiler for free.

`t('key')` reads from the current language and falls back to English per key.
The fallback is a safety net: `messages.test.ts` fails the build when any
language is short a key, so it should never fire.

Language is held in a React context with a provider at the root, so a change
re-renders the tree. `setLanguage` writes to `localStorage` under
`rpm-boss.language`, beside the expected-range preference that phase 4 added,
with the same try/catch since a private window can refuse it.

**Detection**, in order: a stored choice, then `navigator.languages` matched
first exactly (`pt-BR` → `pt`) and then by base tag, then English. `tl` maps to
`fil`, since Android reports Tagalog and our file is Filipino.

## 3. The two strings that are not plain strings

**A duration.** `Intl.NumberFormat` with `style: 'unit'` formats the number and
its unit together:

```ts
new Intl.NumberFormat(lang, { style: 'unit', unit: 'second', unitDisplay: 'long' }).format(2)
// en: "2 seconds"   id: "2 detik"   ru: "2 секунды"   hi: "2 सेकंड"
```

So the message is `Record at least {duration}.` — one slot, no plural rule
anywhere in the app. Russian has three plural forms and Thai has none; neither
is our problem. This is the point of §1 of the discussion note.

**A filename and a length.** The loaded line is
`{name} · {seconds} s`. The name is the user's own and is never translated;
the length is a plain number with one decimal. Formatting is
`t('loaded', { name, duration })`, with interpolation by a five-line replace
over `{key}` — the whole of what is needed here.

## 4. The picker

A `<select>`, placed after the source buttons, which is convenient and nothing
more; phase 8 puts it somewhere considered. Each option is the language's own
name in its own script, and the list is sorted with
`new Intl.Collator().compare` over those names, so Latin names run A to Z and
each other script forms its own block.

Native `<select>` rather than a custom dropdown, deliberately: it gets the
platform's own picker on a phone, which is scrollable, searchable on Android
and already in the user's language.

## 5. Urdu

Urdu's strings ship. Its layout does not: `dir="rtl"` would mirror the crop
handles, the waveform, the player and the result, all of which phase 8 is
rebuilding. The app stays left-to-right for now, so Urdu reads correctly
line by line while sitting in a layout built for the other direction.

`languages.ts` carries a `rtl: true` flag on Urdu that nothing reads yet, so
phase 8 has the fact recorded rather than having to rediscover it.

## 6. Translating

Claude writes all sixteen non-English files. The rules from the discussion note
apply to every one: short sentences, the fix before the diagnosis, no idiom, no
borrowed English where a common word exists.

Two specific cautions:

- **Do not translate the app's name.** RPM Boss stays RPM Boss.
- **Do not translate `rpm`.** It is a unit and it appears on the tachometers
  these riders already know. Several of the seventeen would happily render it
  as an abbreviation nobody uses.

Every file gets a header comment naming the language and stating that a native
speaker has not yet reviewed it, so nobody later mistakes it for verified.

## 7. Tests

- `messages.test.ts` — every language has exactly the keys English has, no
  key's value is identical to English by accident in a language that should
  differ, and no value still contains `{` after formatting with its arguments.
- `detect.test.ts` — `navigator.languages` cases: exact, base tag, `tl` to
  `fil`, unknown to English, stored choice beating the device.
- `duration.test.ts` — the too-short message at 1, 2 and 3 seconds in English,
  Russian, Indonesian and Thai, which between them cover one plural form, three,
  and none.
- `strings.test.ts` — a source scan asserting no bare user-facing literal is
  left in `src/ui/`, `src/audio/` or `src/dsp/`. This is AC 1, and it is the one
  test that stops the layer rotting the first time someone is in a hurry.

## 8. Out

No date or time formatting, since the app shows neither. No currency. No
per-language fonts. No translation of the Play listing, which does not exist.
