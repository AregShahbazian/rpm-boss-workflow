# Phase 7: how the strings should read, and which languages to carry

**Date:** 2026-09-10
**Phase:** 7 (i18n), decided before the PRD

## Plain language first, machinery second

The audience is a rider standing next to a running engine, often not a native
English speaker, often on a phone in daylight. Three rules, in this order.

### 1. Let the platform format a number and its unit together

The too-short message is built from a constant and an English plural test:
"Record or pick at least 2 seconds", where 2 is `MIN_CLIP_S` and the `s` comes
from `n === 1 ? 'second' : 'seconds'`. Two things go wrong when that is
translated. The number gets baked into the translated sentence, so raising the
minimum again (phase 4 already raised it from 1 to 2, and its notes say
analysis may raise it further) leaves every language but English saying the old
number. And the plural rule is English grammar decided in the app: Tagalog and
Bisaya do not inflect the noun at all, and other languages have more than two
forms.

**`Intl.NumberFormat` with `style: 'unit'` solves both.** It turns 2 into
"2 seconds", "2 segundos", "2 detik", and the correct form everywhere,
including languages with more or fewer plural categories than English. The
message then carries one slot and no grammar:

```
Too short. Record at least {duration}.
```

Reach for ICU MessageFormat only where a count and its noun genuinely must be
separated. While `Intl` can carry the whole phrase, it should.

### 2. Write the English for someone who is not reading carefully

Short sentences, verb first, the fix before the diagnosis.

| now | better |
|---|---|
| That clip is too short. Record or pick at least 2 seconds. | Record at least 2 seconds. |
| Couldn't hear a steady engine in that section. Try a clearer part of the recording. | No steady engine sound here. Try another part. |
| This browser will not record without the processing that mutes engine sound. Record in Chrome, or upload a file instead. | This browser cannot record engine sound. Use Chrome, or open a file. |

Shorter English also translates better, because it leaves less to guess.

**Fix the jargon in English first**, since every language inherits it. "Clip"
and "crop" are editing words; a rider says recording and choose.

### 3. Give every string a note saying what just happened

"Too short" alone could be about a recording, a password or a name. One line of
context per string, written when the string is written, is the difference
between a natural translation and one that reads like a manual.

**Test this later**: pick a few translated strings and check them with someone
who is not a developer.

## The picker

A dropdown, somewhere convenient. Deliberately not designed: phase 8 overhauls
the UI and will place it properly. English is the default.

## Languages

Committed by the maintainer:

| Language | Where it earns its place |
|---|---|
| English | default, and the working language of much of Africa and South Asia |
| Spanish | Colombia, Peru, Mexico, Bolivia, Central America |
| Portuguese | Brazil |
| Indonesian | Indonesia, one of the largest two-wheeler markets anywhere |
| Malay | Malaysia; close enough to Indonesian that one file may serve both at first |
| Tagalog | Philippines |
| Bisaya | Philippines, Visayas and Mindanao |
| Armenian | the maintainer's own |

## Which markets to add, and why

The app is for engines without a tachometer: small-displacement singles, and
dual-sports in particular, which often ship without one. That points at places
where a 100-250 cc single is transport rather than a hobby, and where people
maintain their own.

**Strongest additions, in order.** Figures checked 2026-09-10; sources at the
end.

1. **Vietnamese.** ~45 million motorcycles, 86 % of households own one, the
   highest ownership per head in the world, and the fastest growing ASEAN
   market in 2025 at +13.5 %. The fleet is overwhelmingly small singles.
2. **Thai.** ~20 million registered, 87 % of people use a two-wheeler, +9.8 %
   in 2025. Thailand also has the strongest dual-sport and enduro culture in
   the region, which is exactly the machine that ships without a tacho.
3. **Hindi.** India registered **20.2 million** two-wheelers in 2025, more than
   all of ASEAN combined. Caveat unchanged and important: many Indian bikes do
   have a tachometer, so the fit is the older and cheaper end of the fleet, and
   Hindi alone does not cover India.
4. **Urdu.** Pakistan sold 1.8 million in 2025 and grew **39.8 %**, among the
   fastest anywhere. The 70-125 cc single is the default vehicle and
   instrumentation is minimal. Better placed than I first had it.
5. **French.** West and Central Africa. Confirmed: the Francophone market runs
   on 100-150 cc Asian bikes, largely second-hand, with Guinea and Mali among
   the largest consumers. Second-hand small singles are precisely the ones
   without a working tacho, and one language covers many countries.
6. **Swahili.** Kenya, Tanzania, Uganda, eastern DRC. Kenya registered 168,000
   motorcycles in 2025 — modest next to Asia — so the case here is the *use*
   rather than the volume: the boda boda trade turns over $4 million a day in
   Kenya alone, is projected to be Uganda's second largest employer after
   agriculture, and those bikes are worked hard and fixed by their riders.
7. **Bengali.** Bangladesh sold 476,000 units in 2025, 17th in the world.
   Real but an order of magnitude below Pakistan; **demoted** from where I had
   it.

**Worth considering after those:** Khmer (Cambodia), Burmese (Myanmar),
Nepali (Nepal), Sinhala (Sri Lanka), Amharic (Ethiopia), Arabic (Egypt and
North Africa), Turkish, Persian.

**One market to be careful with.** Nigeria is the obvious English-language
candidate in West Africa, but Lagos has banned commercial motorcycles across
much of the city since 2020 and was still impounding them through 2025.
Enforcement is patchy and the trade has partly returned, but it makes Nigeria a
weaker bet than its population suggests.

**What the research changed.** Pakistan moved up and Bangladesh down; French
West Africa moved up, because second-hand 100-150 cc bikes match the premise
better than raw volume does. Vietnam and Thailand were confirmed. India is
confirmed as the largest market and remains the least certain fit.

**Still unverified, and the premise of all of it:** whether the common models
in each place actually lack a tachometer. Nothing found addresses that
directly. It is worth an hour with the spec sheets of the five best-selling
bikes in Vietnam, Thailand and Pakistan before committing.

**A note on cost.** Every language is a permanent maintenance cost: each new
string needs translating again. Shipping the committed eight first and adding
from this list once the app has users in a place is cheaper than guessing now.

## Sources

- [ASEAN motorcycles 2026, MotorCyclesData](https://www.motorcyclesdata.com/2026/02/12/asean-motorcycles-industry/)
- [Countries with the most motorcycles per person](https://www.autopunditz.com/post/countries-with-most-motorcycles-per-person)
- [Two-wheeler sales cross 20 million in India, Autocar India](https://www.autocarindia.com/bike-news/two-wheeler-sales-cross-20-million-mark-in-438709)
- [Pakistan motorcycles 2026, MotorCyclesData](https://www.motorcyclesdata.com/2026/07/13/pakistan-motorcycles/)
- [Bangladesh motorcycles 2026, MotorCyclesData](https://www.motorcyclesdata.com/2026/02/15/bangladesh-motorcycles/)
- [Boda-boda taxis, East Africa's transport lifeline, TRT Afrika](https://www.trtafrika.com/english/article/14385534)
- [Boda-boda Uganda, Global Informality Project](https://www.in-formality.com/wiki/index.php?title=Boda-boda_%28Uganda%29)
- [Western Africa motorcycles and scooters market, IndexBox](https://www.indexbox.io/store/western-africa-motorcycles-and-scooters-market-analysis-forecast-size-trends-and-insights/)
- [Lagos okada enforcement, Guardian Nigeria](https://guardian.ng/news/nigeria/metro/okada-menace-lagos-task-force-intensifies-crackdown-impounds-139-motorcycles/)
