---
id: rb-i18n
feature: 7-i18n
branch: feat/7-i18n
status: draft
created: 2026-09-10
depends_on: [6-android]
---

# PRD — Languages

## Goal

Every user-facing string comes from a translation layer, and the app speaks
fifteen languages.

## Why

This phase was scheduled last on purpose. Every string the MVP will ever have
now exists, so extracting them is one pass rather than an archaeology dig, and
the phases so far have kept strings out of deep component internals to make
that true. The error messages in `audio/types.ts` are the pattern the rest
should follow.

The reason to do it at all is the market. The app is for engines without a
tachometer, which means small single-cylinder bikes used as transport rather
than as a hobby: Southeast Asia, South Asia, West and East Africa, Latin
America. English is not comfortably read in most of those places. An app that
tells a rider something they cannot read is an app that gets deleted.

The research behind the language list is in
[`discussions/2026-09-10-i18n-language-and-markets.md`](../../discussions/2026-09-10-i18n-language-and-markets.md), along with the writing
rules below.

## User stories

1. As a rider whose phone is set to Vietnamese, I open the app and it is in
   Vietnamese, without being asked.
2. As a rider whose language is not one of the fifteen, I get English rather
   than an empty screen.
3. As a rider who prefers a different language to my phone's, I change it once
   and it stays changed.
4. As a rider who is not a confident reader, every message tells me what to do
   in a short sentence.

## Scope

### In

- **A translation layer of our own.** A small module, no library, in keeping
  with the hand-written DSP and the hand-drawn canvas. Message lookup by key,
  one file per language, English as the source and the fallback.
- **Seventeen languages.** English (source), Armenian, Bengali, Bisaya, French,
  Hindi, Indonesian, Malay, Portuguese, Russian, Spanish, Swahili, Tagalog,
  Thai, Ukrainian, Urdu, Vietnamese. Urdu's *strings* ship in this phase; its
  right-to-left *layout* is phase 8's, which is redesigning every affected
  component anyway.
- **Automatic language choice.** The device language when it is one of the
  fifteen, English otherwise. A chosen language overrides it and is remembered
  on the device, the way the expected-range panel already is.
- **A language dropdown**, somewhere convenient. Deliberately not designed;
  phase 8 places it properly. Each language is listed by its **own name in its
  own script** — Français, Русский, हिन्दी, ไทย, Հայերեն — with no flags. A flag
  is a country and a language is not: eight of the seventeen have no single
  obvious flag, Bisaya and Tagalog would share one, and Spanish, Portuguese and
  French would all show the flag of a country that is not the market. A name in
  its own script is also the one label a speaker recognises without reading the
  interface language first.
- **The English strings rewritten for plainness first**, before anything is
  translated, because every language inherits them. Short sentences, verb
  first, the fix before the diagnosis. The jargon goes too: "clip" and "crop"
  are editing words, and a rider says recording and choose.
- **Numbers and units through `Intl`.** `Intl.NumberFormat` with
  `style: 'unit'` formats a duration and its unit together, so the too-short
  message carries one slot and no plural rule. This is what stops English
  grammar being decided in the app for languages that do not work that way.
- **A note per string** saying what the user just did, written beside it, so a
  translation reads like a sentence rather than a label.
- **Every string**: the input messages in `audio/types.ts`, the analysis
  messages in `dsp/types.ts`, and the interface text in `src/ui/`. Nineteen at
  last count.

### Out

- **The RPM number stays unlocalised.** No thousands separator, no local digit
  grouping. It is the one figure on the screen and a rider comparing it against
  a manual or a sticker should see the same shape everywhere.
- Right-to-left layout. Phase 8, with Urdu's strings waiting for it.
- Translating the app name. **RPM Boss** is identity, in the Capacitor config
  and in Android's `strings.xml`, and stays as it is everywhere.
- The Play listing, the store description, the screenshots. No Console work in
  this project yet.
- Development-only text: the mic check panel and the export button are
  scaffolding and are not translated.
- Language-specific fonts. The system font is expected to cover Thai, Hindi,
  Bengali, Armenian and Urdu on the target devices; if it does not, that is a
  phase 8 problem.

## Acceptance criteria

1. No user-facing string literal remains in a component or a module outside the
   translation files. A test asserts it.
2. Every key present in English is present in all seventeen files, with no
   leftover English in a translated file. A test asserts both.
3. A device set to any of the seventeen languages opens the app in that language;
   a device set to something else opens it in English.
4. Choosing a language from the dropdown changes the screen immediately and
   survives a reload and an app restart.
5. The too-short message reads correctly in every language when the minimum is
   1, 2 and 3 seconds, including languages that do not pluralise nouns.
6. The RPM figure reads the same in every language.
7. Nothing in the layout breaks in the longest language: German is not on the
   list, but Portuguese, Tagalog and Swahili all run considerably longer than
   English, and the buttons are fixed-width rows.
8. Urdu's strings are present and correct, and the layout being wrong for them
   is recorded rather than hidden.
9. `npm test`, `npm run lint` and `npm run build` pass, and the Android build
   still installs and runs.

## Non-goals and constraints

- No i18n library. A key-value lookup plus `Intl` is the whole requirement, and
  a dependency here would be larger than the thing it replaces.
- Translations are Claude's, and are worth a native speaker's eye before the
  app is marketed anywhere. Recorded, not blocking.
- No change to the DSP, the analysis, the crop or the result view beyond the
  strings they display.

## Open questions — all settled 2026-09-10

1. **Indonesian and Malay get separate files.** They are close, but the
   differences land on the words this app uses most: record is *rekam* against
   *rakam*, upload *unggah* against *muat naik*, second *detik* against *saat*,
   engine *mesin* against *enjin*, browser *peramban* against *pelayar*, try
   again *coba lagi* against *cuba lagi*. Six of the nineteen strings contain at
   least one. A Malaysian understands the Indonesian, but it reads as foreign,
   which is a real cost for an app whose pitch is being easy to read.
2. **A missing key falls back to English**, so nothing ever blanks the screen.
   It is a safety net rather than a strategy: the test in AC 2 fails the build
   when any language is short a key, so it should never fire.
3. **Language names follow Google's.** *Filipino* and *Cebuano*, not Tagalog and
   Bisaya. Those are the labels Android already shows in phone settings, so they
   are what users have seen before. Codes stay `fil` and `ceb`, with `tl`
   detected as Filipino.
4. **The list sorts by the written name**, through `Intl.Collator`. Latin names
   come out A to Z and each non-Latin script forms its own block, so a Thai
   speaker finds ไทย by spotting Thai script rather than by knowing where T
   falls in English. This is what Android's own picker does.
