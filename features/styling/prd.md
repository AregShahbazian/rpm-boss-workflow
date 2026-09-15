---
id: rb-styling
feature: styling
branch: feat/styling
status: draft
created: 2026-09-13
depends_on: [8-ui-overhaul]
---

# PRD — Styling the app by hand

## Goal

The maintainer can change how the app looks without leaving the component he
is looking at, in the syntax he already writes every working day.

## Why

The app's appearance lives in one 242-line stylesheet: 69 rules, a grid of
named areas, and a set of custom properties that carry the two themes. It was
written by the agent and it is read by the agent. Changing a gap means finding
the rule that owns it, and the rule is named after a layout region rather than
after the thing on screen.

That is the wrong shape for what comes next. The MVP is shipped and in closed
testing; what remains is a long tail of small visual changes, and those are the
ones the maintainer wants to make himself, quickly, without a stage-gated
round trip.

The maintainer already does exactly that in the day-job frontend, in Tailwind utilities
plus a `css` prop. Two vocabularies for one skill is the tax this feature
removes.

### Why not simply copy the day-job stack

The day-job app styles with `twin.macro`, and that package is the part that cannot come
along:

| | |
|---|---|
| `twin.macro` latest | 3.4.1, published 2024-01-19 |
| Its peer range | `tailwindcss >=3.3.1` — Tailwind 3 only |
| `tailwindcss` latest | 4.3.3 |
| `babel-plugin-macros`, which it requires | 3.1.0, published 2023-04-29 |

Adopting it would pin a brand-new app to a Tailwind major that is already
superseded, and would add a Babel macro pass to a Vite build that has no other
reason to run one. That stack is pinned there today; there is no sense in
importing the same block on day one.

`styled-components` itself is *not* the stale part — 6.5.3 was published
2026-09-08. Its `css` prop, however, needs `babel-plugin-styled-components`,
and the design-stage spike found that unusable on this toolchain: Vite 8's
React plugin no longer runs Babel at all, and the plugin refuses Babel 8 and
throws on it when forced. See `design.md`. So the `css` prop comes from
`@emotion/react`, which needs no Babel — the syntax below is written as it
actually compiles.

## User stories

1. As the maintainer, I change a button's padding by editing the button, not by
   finding a rule in a shared stylesheet.
2. As the maintainer, I write utility classes with the same names and the same
   arbitrary-value syntax I use day to day, without looking anything up.
3. As the maintainer, when a utility cannot express something — a computed
   height, a gradient, a filter — I write real CSS in place, as CSS text, not
   as a JavaScript object.
4. As the maintainer, I make either of those conditional on props or state.
5. As a user, nothing about the app looks or behaves differently afterwards.
6. As an Urdu reader, the layout still mirrors.

## The syntax, as it should end up

Utilities go in `className`, real CSS goes in `css`, and the two never mix:

```jsx
import { css } from '@emotion/react'

<button
  className="min-h-12 flex-1 inline-flex items-center justify-center gap-2 rounded-[10px] px-5"
  css={css`
    background: var(--color-btn);
    color: var(--color-fg);
  `}
>
```

Both sides take conditions:

```jsx
<button
  className={clsx(
    'min-h-12 inline-flex items-center justify-center gap-2 rounded-[10px]',
    recording ? 'bg-error text-white' : 'bg-btn',
    iconOnly ? 'w-12 flex-none p-0' : 'flex-1 px-5',
  )}
  disabled={busy}
  css={css`
    ${busy ? 'opacity: 0.5; cursor: default;' : 'cursor: pointer;'}
  `}
>
```

For comparison, the same element today — `src/index.css:156`, reached from
`RecordButton.tsx` through three class names:

```css
.btn {
  min-height: 48px; padding: 0 20px; font-size: 1rem; border: 0; border-radius: 10px;
  background: var(--btn); color: var(--fg); cursor: pointer; flex: 1 1 auto;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
}
.btn:disabled { opacity: 0.5; cursor: default; }
.btn-rec { background: var(--error); color: #fff; }
.btn-icon { flex: 0 0 auto; inline-size: 48px; padding: 0; }
```

And the shape this feature explicitly does **not** want, which is what a
Tailwind-only answer would force:

```jsx
// Rejected: CSS as a JavaScript object.
<div style={{ height: `${h}px`, borderLeft: `2px solid ${tone}` }}>
```

## Requirements

### Must

1. **Utility classes in `className`**, with Tailwind's vocabulary and its
   arbitrary-value syntax (`h-[100px]`, `bg-[var(--btn)]`).
2. **A `css` prop taking CSS text**, as a template literal, with interpolation.
   Not a style object, and not a JS-object-shaped API wearing a `css` name. A
   `css` tag on the template is acceptable — the day-job code imports and
   writes one — as long as what sits inside it is CSS.
3. **Both conditional** on props and state, in ordinary JavaScript.
4. **No Babel macro**, and no dependency pinned to a superseded major of
   anything.
5. **The app looks the same when it is done.** This is a refactor. Any visible
   change is a defect, not an improvement, and is judged against the phase 8
   screenshots in `~/git/rpm-boss/store/`.
6. **Both themes keep working**, including the `data-theme` attribute that
   `theme.ts` stamps and the `prefers-color-scheme` rules behind it.
7. **The CSS custom properties survive as the single source of colour.**
   `usePalette` reads `--muted`, `--bg`, `--accent`, `--dim` off the root
   element to paint the waveform canvases; the canvas has no class names and
   cannot be styled by utilities. Whatever the tokens are declared in, that
   read must keep working.
8. **Right-to-left still mirrors.** The stylesheet uses logical properties in
   23 places (`inline-size` 11, `block-size` 8, `margin-inline` 4,
   `padding-inline` 1, `padding-block` 2) precisely so the Urdu build lays out
   without a second stylesheet. Whatever replaces them must be logical too.
9. **The Android build still builds and installs**, and the web bundle does not
   grow by more than 15 kB gzipped. Today it is 85 kB.
10. **The existing app is converted, not just enabled for new work.** Every
    component moves to the new syntax; the layout-region and component classes
    in `index.css` go away with it. A half-converted app would leave two
    vocabularies instead of removing one, which is the problem this feature
    exists to solve.
11. **No style statement is written twice.** A class used in several places
    today — `.btn` across five components, `.mono`, `.muted`, `.wave` — is
    correct as it stands: it says "these are the same thing". Spraying the same
    utility string across five call sites would lose that and make the next
    change a search-and-replace. Where styling is genuinely shared it is
    extracted, the way the day-job app does it: a styled component, a wrapper, or a
    small shared component that owns the styling and is used by name. Which of
    those, per case, is a design-stage call.

12. **The palette lives in one file of its own**, separate from any component
    and from the global stylesheet. It holds the colours that are *shared* —
    the ones that carry a meaning across the app and that a theme switch has to
    change together. Both themes are defined there together, so the pair can be
    read side by side; that is how the light theme's `--error` and `--dim` got
    their values, and they are not inversions of the dark ones.

    A one-off colour used in one place is written in place, in whatever form
    suits — hex, `#rrggbbaa`, `rgb()`, `rgba()`, `color-mix()`. It does not
    have to earn a name in the palette first. The palette is for what is
    shared, not a gate on the colour picker.
13. **Palette values are usable from both styling routes, by name.** In the
    `css` block and in a utility class, without importing anything into the
    component and without a second name for the same colour:

    ```jsx
    <span
      className="text-muted"
      css={css`
        border-left: 2px solid var(--color-accent);
      `}
    />
    ```

    They must also remain readable at runtime off the root element, because
    that is how the canvas gets them (requirement 7). A palette that only
    exists at build time, as JavaScript constants, fails this.

### Should

14. The utility names should match the day-job app's where Tailwind offers a choice, so
    that muscle memory carries over.
15. Where a rule in `index.css` carries a comment explaining *why* a number is
    what it is — the `--col` clamp, the two `--dim` values, the 48 px hit
    target — that reasoning moves with it rather than being dropped. Those
    comments are the most valuable thing in the file.

### Won't

- **Not a redesign.** No new colours and no new spacing scale. New components
  only where requirement 11 calls for one.
- **Not a design system.** Components are extracted where they remove real
  duplication (requirement 11), never speculatively: no variant API invented
  for a single caller, no Storybook, no component library. The app has fourteen
  components and does not need one.
- **Not a `tw` prop.** Utilities live in `className`; the split between the two
  props is deliberate and is what makes the `css` block plain CSS.
- **Not the live POC.** `poc/live-rpm` keeps its own styles and is converted
  only if it becomes a feature.
- **No change to the analysis, the audio path, i18n, or the Capacitor shell.**

## Acceptance criteria

1. `src/index.css` holds only what genuinely belongs in a global sheet —
   `body`, and anything the canvas needs. The theme tokens have moved to the
   palette file; every rule that styles a component has moved into that
   component.
2. Every colour that more than one component uses, or that changes with the
   theme, is named in the palette file and used from there — no component
   repeats its literal value.
3. All 57 existing `className` sites are either utilities or gone; no component
   references a layout-region class such as `.area-wave` that is defined
   somewhere else.
4. No utility string that describes a shared thing appears at more than one
   call site. Grep for the button, the monospace figures and the waveform box:
   each is written once, in one place, and used by name.
5. `npm run build`, `npm run lint` and the 324 tests pass unchanged.
6. Side by side with the phase 8 screenshots, at 360×640, 390×844 and in
   landscape, the app is pixel-equivalent in both themes.
7. The Urdu build still mirrors, checked on the same three sizes.
8. The waveform, the crop window and the combustion marks still draw in the
   right colours after a theme switch, with no reload.
9. A release APK installs and runs on the phone.
10. The maintainer changes one visible thing — a colour, a gap, a radius —
   without opening a stylesheet, and without asking the agent.

## Open questions for the design stage

All four are answered in `design.md`, three of them by a built spike rather
than by argument:

- **Which `css` prop** — `@emotion/react`. `styled-components` was the
  expectation here and lost on evidence: its `css` prop needs a Babel plugin
  that refuses Babel 8, in a build that no longer runs Babel.
- **The palette's form** — Tailwind 4 `@theme` in its own file. One declaration
  yields both `var(--color-accent)` for a `css` block and `bg-accent` as a
  utility, and the `data-theme` override reaches both.
- **Runtime cost on the waveform screen** — acceptable, with one rule: no
  per-frame value is ever interpolated into a `css` block. Nothing in the app
  currently needs to.
- **`clsx` or a local helper** — `clsx`, at 239 bytes.

Measured cost of the whole change: **+7.1 kB gzipped**, against the 15 kB
budget in requirement 9.
