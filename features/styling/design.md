---
id: rb-styling
feature: styling
branch: feat/styling
status: draft
created: 2026-09-13
---

# Design — Styling the app by hand

Satisfies `prd.md`. One decision here reverses what the PRD expected, and it
was reversed by a spike rather than by argument, so that comes first.

## The spike

A throwaway Vite 8 + React 19 project, built to answer one question: does the
`css` prop actually work in this app's toolchain? It was built, not reasoned
about, because every part of the answer turned out to be a fact about versions.

### styled-components' `css` prop cannot be used

The PRD leaned towards `styled-components`, on the grounds that it is what
the maintainer's day-job codebase uses and that only `twin.macro` was stale. That is true of
`styled-components` itself. It is not true of the Babel plugin its `css` prop
requires, and the `css` prop is the requirement.

Three independent blocks, each verified:

1. **Vite 8's React plugin no longer runs Babel.** `@vitejs/plugin-react@6.1.1`
   declares exactly one dependency, `@rolldown/pluginutils`; the transform is
   oxc, and Babel is reachable only through the optional
   `@rolldown/plugin-babel` peer. A `babel: { plugins: [...] }` option is
   accepted and silently ignored — the spike built cleanly, and the `css` prop
   passed straight through to the DOM as an unknown attribute. Nothing failed
   loudly. That is the worst way for this to break.

2. **`babel-plugin-styled-components@2.3.0` refuses Babel 8.** Installing it
   beside `@babel/core@8.0.5` fails resolution outright:
   `ERESOLVE could not resolve … While resolving: babel-plugin-styled-components@2.3.0`.

3. **Its `css` prop visitor is written against Babel 7.** Forced to run anyway,
   it throws `TypeError: t.jSXIdentifier is not a function` at
   `visitors/transpileCssProp.js:107` — a builder alias Babel 8 removed.

So adopting it would mean adding a Babel pass back to a build that no longer
has one, pinning Babel to 7, and depending on a plugin that has not caught up.
That is the same shape of block the PRD rejected `twin.macro` for. Rejecting
one and accepting the other would be incoherent.

### Emotion's `css` prop works, with no Babel at all

`@emotion/react` needs only a JSX factory swap — `jsxImportSource`, a setting
the oxc transform already honours. No plugin, no macro, nothing to keep in
step with Babel.

The spike compiled this, type-checked it, and shipped it:

```jsx
<div
  className={clsx('flex w-full gap-2 text-muted', on && 'bg-accent', 'split:grid-cols-2')}
  css={css`
    height: ${h}px;
    border-left: 2px solid var(--color-accent);
    ${on ? 'opacity: 1;' : 'opacity: 0.5;'}
  `}
>
```

Verified in the output, not assumed: `.bg-accent{background-color:var(--color-accent)}`
and `.text-muted` in the stylesheet, `[data-theme=light]{--color-accent:#1f4e79}`
overriding the theme token, the custom variant compiled to
`@media (width>=600px) and (orientation:landscape)`, and Emotion's runtime
genuinely bundled (`@emotion/sheet`'s `speedy` and `insertRule`,
`@emotion/unitless`'s `boxFlexGroup` and `strokeDashoffset` all present).

**Cost: +7.1 kB gzipped** — 68.78 kB without, 75.89 kB with. The budget in
requirement 9 is 15 kB.

### What this costs against the day-job syntax

The `css` tag has to be imported and applied:

```jsx
// day-job app
import tw, {css} from "twin.macro"
<span css={[tw`shrink-0 text-base`, css`color: ${TONE[b.mode]};`]}>

// rpm-boss
import { css } from '@emotion/react'
<span className="shrink-0 text-base" css={css`color: ${TONE[mode]};`}>
```

That is the same `css` tag the day-job code already imports and writes. What is lost is
`tw` inside the array — which the PRD deliberately gave up anyway.

## Decisions

| | | |
|---|---|---|
| Utilities | `tailwindcss` 4 via `@tailwindcss/vite` | No PostCSS config, no content globs |
| CSS text | `@emotion/react` `css` prop via `jsxImportSource` | Above |
| Conditional classes | `clsx` | 239 B, no deps, what any React developer expects |
| Palette | Tailwind `@theme` in its own CSS file | One name serves both routes |
| Preflight | **Not imported** | Below |
| Shared styling | Small components, not exported class strings | PRD requirement 11 |
| `tailwind-merge` | Not used | Below |

### Why no preflight

`@import "tailwindcss"` pulls in Tailwind's reset — the spike's output carries
`*,:after,:before`. The app already has its own small, deliberate reset, and
requirement 5 makes any visible change a defect. Two resets would mean a list
of diffs to chase for no gain, so the entry sheet imports the layers it wants:

```css
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
```

Reversible. If preflight turns out to be wanted later it is a one-line change
and a round of screenshot diffing.

### Why no tailwind-merge

It exists to make a later class win over an earlier conflicting one, which
matters when a shared component takes a `className` override. This design does
not allow that: a shared component owns its classes and exposes a prop for each
variation that has a real caller. A caller that wants to override `bg-*` is
telling us the component needs a prop, not a merge. Saves ~7 kB gzipped and a
class of order-dependent bugs.

## File layout

```
src/
  palette.css     the palette, both themes, nothing else   (requirement 12)
  index.css       tailwind layers, the custom variant, body, canvas globals
  ui/kit.tsx      the shared components extracted below
```

`palette.css` is imported by `index.css`, which `main.tsx` imports as it does
today.

### palette.css

```css
@theme {
  --color-fg:     #f0f0f0;
  --color-bg:     #121212;
  --color-muted:  #a0a0a0;
  --color-accent: #8ab4f8;
  --color-error:  #f2b8b5;
  --color-btn:    #2a2f36;
}

/* Not colours, so not in the theme namespace, but they belong with it: both
   are theme-dependent and --dim is read by the canvas. */
:root { --dim: 0.6; --gap: 12px; --col: clamp(300px, 34vw, 460px); }

/* The light theme, twice — device preference and explicit choice. Kept
   together with the dark values above so the pair can be read side by side:
   --error and --dim are not inversions, and the comments saying why move here
   with them. */
@media (prefers-color-scheme: light) { :root[data-theme='system'] { … } }
:root[data-theme='light'] { … }
```

Two things this buys at once. `--color-accent` is usable from a `css` block as
`var(--color-accent)`; `bg-accent` and `text-accent` are generated from the
same declaration, so there is one name, not two (requirement 13). And because
`@theme` emits real custom properties on `:root`, `usePalette`'s
`getComputedStyle` read keeps working (requirement 7) — it only needs its four
property names updated.

The PRD's open question about `@theme inline` resolves to *not* inline: the
utilities must reference `var(--color-x)` so the `data-theme` override reaches
them. The spike confirms they do.

## The three routes, and when each is right

1. **A utility class.** Anything Tailwind already names: layout, spacing,
   sizing, type, and the palette colours. This is the default.
2. **The `css` prop.** Real CSS that utilities cannot say: a nested selector, a
   media query with two conditions, `color-mix()`, a computed value, an
   `::backdrop`. Plain CSS text — the thing the PRD asked for.
3. **A shared component in `ui/kit.tsx`.** When the same styling means the same
   thing in more than one place.

The rule between 1 and 2: **utilities never appear inside a `css` block, and
`css` never restates something a utility says.** That split is what keeps the
`css` block readable as CSS.

## Logical properties

Requirement 8. Tailwind's `w-`/`h-` emit `width`/`height`, not the logical
properties the stylesheet uses in 23 places for the Urdu build. The mapping
that keeps mirroring:

| Today | Utility |
|---|---|
| `padding-inline` | `px-*` (already logical in Tailwind) |
| `margin-inline` | `mx-*` (likewise) |
| `inline-size` | `w-*` is **not** logical — use `[inline-size:…]` or leave it in the `css` prop |
| `block-size` | same, `h-*` is physical |

`px-*` and `mx-*` are safe: Tailwind emits `padding-inline` and `margin-inline`.
Sizes are not, and the eleven `inline-size` uses are mostly on the canvas and
the sheet, which are `css`-prop cases anyway. Tasks stage handles them one by
one; the acceptance check is the Urdu build, not the grep.

## Where each rule goes

69 rules, 57 `className` sites. The whole map:

| Today | Becomes |
|---|---|
| `.screen`, `.area-*`, the two layout media queries | `css` prop on `InputScreen`'s `<main>` — named grid areas and a two-condition media query are exactly what the `css` prop is for |
| `.btn` ×6, `.btn-icon` ×2, `.btn-rec` ×1 | `<Button>` in `ui/kit.tsx`, props `icon` and `tone` — both have real callers |
| `.link` ×3 | `<LinkButton>` in `ui/kit.tsx` |
| `.mono` ×3, `.muted` ×3, `.error` ×2, `.dot` | single utilities (`tabular-nums`, `text-muted`, `text-error`) at each site — one declaration is not a "style statement written twice" |
| `.status` ×3 | utilities; it is two declarations on one element |
| `.wave`, `.wave canvas`, `.wave-block`, `.wave-overview`, `.wave-detail` | `css` prop in `WaveformBlock` / `WaveformCanvas`; the descendant rule becomes a nested `canvas { … }` |
| `.player`, `.player .btn`, `.player .mono` | utilities in `Player`; the descendant rules disappear because the children are styled where they are written |
| `.range*`, `.result*`, `.rpm*`, `.readout`, `.miccheck pre` | utilities and `css` in their single owning component |
| `.sheet`, `.sheet::backdrop`, `.sheet h2`, `.sheet-body`, `.field*`, `.themes*`, `.samples*` | `css` prop in `Settings` / `LanguagePicker`; `::backdrop` has no utility |
| `.row` | `flex flex-wrap gap-3` at its two sites |

What survives in `index.css`: the Tailwind imports, `@custom-variant split`,
`body`, and the `:root` font and `color-scheme`.

### The split variant

```css
@custom-variant split (@media (min-width: 600px) and (orientation: landscape));
```

Verified by the spike. Used for utilities that change at the split; the grid
template itself stays in the `css` prop, where the media query reads as CSS.

## Performance

`InputScreen` re-renders at up to 20 Hz during playback —
`useAudioInput.ts:155` pushes `positionS` on a `POSITION_STEP_S` of 0.05 s, and
the waveform subtree renders with it.

Emotion hashes and caches a serialized block, so a static `css` template costs
a map lookup per render. What is not free is interpolating a value that changes
every frame: that is a new hash, a new class and a new inserted rule each time.

**Rule: no per-frame value is ever interpolated into a `css` block.** The app
does not need to break it — the playhead, the crop window and the combustion
marks are all drawn on the canvas already, and nothing in the DOM moves per
frame. This is written down so it stays true, not because it is currently at
risk.

## Browser floor

Tailwind 4 needs Chrome 111 / Safari 16.4 for `@property` and `color-mix()`.
`index.css:186` already uses `color-mix()` on the waveform canvas background,
so the app's floor is already there and this raises nothing. `minSdkVersion` is
24, but Android's WebView updates through the Play Store independently of the
OS, so the floor is the WebView, not the Android version. Checked on the two
test phones during implementation.

## Order of work

Sketched here; `tasks.md` is the next stage.

1. Toolchain and palette, app untouched, everything still passing.
2. `ui/kit.tsx` and the components that use it.
3. The leaf components, one per commit, each diffed against its phase 8
   screenshot.
4. `InputScreen`'s layout last — the grid is the one piece where a mistake is
   visible everywhere.
5. Delete what is left of `index.css`.

Each step leaves the app building and installable, because a half-converted app
is the one state the PRD says must not survive the feature.

## Risks

| Risk | Handling |
|---|---|
| The `css` prop's JSX factory swap affects every `.tsx` | It is a compiler setting, not a runtime one; the spike type-checked and built with it. Vitest is unaffected — the tests are node-environment DSP tests with no JSX. |
| Pixel drift while converting 69 rules | Convert one component per commit and diff against `store/screenshot1..7.png`. The acceptance criteria name three widths and both themes. |
| RTL regressions from physical sizing utilities | The logical-property table above; verified in the Urdu build, not by grep. |
| Emotion adds 7.1 kB | Inside the 15 kB budget, measured, not estimated. |
| A future Tailwind major | The palette is plain custom properties with a `@theme` wrapper; utilities are the part that would churn, and they are the part that is easy to read and change. |

## Open questions

None. The PRD's four are answered: Emotion over styled-components (spike),
`@theme` for the palette (spike), the per-frame interpolation rule (above), and
`clsx` earns its 239 bytes.
