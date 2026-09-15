# RPM Boss 1.3 (versionCode 4) - what changed

Everything since `acd7a52`, the 1.2 build (versionCode 3). 41 commits, four
branches: `rb-live-tacho`, `rb-two-stroke`, `rb-dial-limits`, `rb-audio-input`.

Source for the listing rewrite and the release notes. Written from the commit
messages, not from the code.

## The headline: live tachometer mode

The app no longer has to record before it can tell you anything. Press Start
and it listens continuously, showing rpm on a drawn tachometer dial with a
needle that eases between readings, the figure in numerals under it, and a live
waveform of the last quarter second below that.

- Reads five times a second. A window that arrives while the previous one is
  still being analysed is dropped rather than queued, so it cannot fall behind.
- Nothing is recorded. The audio passes through a ring buffer and is gone; the
  wording in all seventeen languages says "listen", never "record".
- When the engine stops or the room goes quiet the needle returns to zero. An
  earlier version held the last reading and it was judged a worse lie than a
  needle at rest.
- The screen is held awake while listening, through the Screen Wake Lock API.
  No new permission, no native code.
- A refused microphone shows the same error line the recorder uses.

Measured on the phone and the laptop: the device keeps up with room to spare,
about 60 ms of analysis per 200 ms tick.

## Two-stroke engines, and the whole rpm range

The stroke setting now reaches the analysis instead of only being stored. A
two-stroke fires twice as fast at the same rpm, so the smoothing and the rates
searched are doubled with it rather than the answer being multiplied after the
fact.

Getting there meant rewriting the peak picker, which used to take the tallest
correlation peak. Near the top of the dial that let noise choose between the
true period and two or three times it: a two-stroke at 9,000 would read 3,000,
then 6,000, then 4,500. It now starts from the tallest genuine peak and tries
every shorter peak it is a whole multiple of, accepting the first whose comb
holds up.

Result, measured on synthetic engine renders at 48 kHz: both strokes read back
within 1.1 percent from 600 to 12,000 rpm. Live in the browser, within 0.5
percent across the same range.

The floor came down too, from about 960 rpm to 600, which brings in a big
single at 900, a mistuned bike hunting at 650, and a generator running at half
speed.

Still one cylinder only. The cylinder row in settings is shown answered and
greyed out for that reason.

## The dial is yours to set

A 0 to 12,000 face suits the small singles the app was built for and wastes
half its sweep on a bike that never sees 8,000. Where the numbers stop and
where they turn red are both settings now.

- The top of the dial can go no lower than 9,000, because a gauge whose stop
  sits inside the working range is a warning light rather than an instrument.
- The redline can come down to 600 and can never sit past the end of the dial,
  so shrinking the face brings the redline with it.
- A reading past the end pins the needle at the stop and prints the real figure
  underneath, which is what a tachometer does.
- This is the drawing only. What the analysis can reach is unchanged, so a
  smaller face is not a deafer app.
- Reset puts needle movement, the dial top and the redline back to the shipped
  defaults, and touches nothing else. Language, theme and engine are not the
  tachometer's to reset.

## Settings, reorganised

Stacked radio buttons became rows of segmented tab buttons, so every option is
visible at once. Two rows about the motorcycle sit between theme and the
tachometer section: stroke, and cylinder count.

## Recording, improved along the way

- A recording draws itself while it runs. Ten seconds of holding a phone at an
  engine with no idea whether the microphone is hearing anything was a strange
  thing to ask.
- Cancel unloads a clip and puts the screen back to empty.
- Download saves a recording, as 16-bit PCM WAV. On Android it goes through the
  share sheet, so Files and Drive are both reachable. Offered for recordings
  only, since a file that came off the device is already on it.
- The crop handles are twice the size and can be grabbed from 48 px away, which
  is about what a fingertip actually covers.
- An error is now a line above the status rather than replacing it, so a failed
  recording no longer leaves an open clip with nothing describing it.

## Polish

Start is green, twice the size, and says a word instead of showing an icon. The
tap highlight no longer squares off rounded buttons. The source row is three
icons and a label. The stage keeps its width when live mode starts. Both red
stop buttons finally say they can be pressed.

## What did not change

- `RECORD_AUDIO` is still the only permission. No INTERNET, so the claim that
  nothing can leave the phone is still verifiable from the bundle.
- No ads, no accounts, no analytics, works offline.
- Record, crop and Calculate is untouched and still there. Live mode is beside
  it, not instead of it.

## What this means for the store listing

The current full description is now wrong in three places:

1. It describes record, crop, Calculate as the only way to use the app. Live
   mode is the first thing on screen and should lead.
2. It says "a single-cylinder four-stroke at idle". Two-stroke works, and the
   range is the whole dial rather than idle.
3. WHAT IT IS NOT says a revving engine gives nothing worth trusting. Revving
   reads fine if it is steady. The honest caveats now are: one cylinder, a
   steady engine, and not too much background noise.

Do not name the test bench software in anything public.

Release notes should be short and plain: live tachometer, two-stroke support,
adjustable dial.
