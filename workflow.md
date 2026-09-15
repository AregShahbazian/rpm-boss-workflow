# rpm-boss — Repo Workflow Overrides

## Terminology

- **Phase** — a phase of the build: the numbered features under `mvp/`
  (`2-audio-input`, `4-analysis`).
- **Stage** — a step of the workflow: PRD, design, tasks, implement, code
  review, review, merge/deploy. Stages are gated; the maintainer says go
  between them.

Each phase runs through every stage.

Inherits the maintainer's general workflow preferences (private). This repo is the public showcase of the workflow,
so the docs are written to be read by strangers.

## Execution mode: stage-gated

One workflow stage per prompt, always waiting for the maintainer between stages:

1. **PRD** (`prd.md`) — what and why, acceptance criteria, out of scope.
2. **Design** (`design.md`) — how.
3. **Tasks** (`tasks.md`) — the ordered task list.
4. **Implementation** — commits on the feature branch, referencing the feature
   id. **Always ends with a Playwright pass**: Claude drives the app in the
   laptop browser (upload, drag, play, error paths) and reports what it saw.
   A task is not implemented until it has been exercised in a real browser,
   not only under `npm test`.
5. **Code review** — the maintainer triggers it (`/code-review` or equivalent).
   Claude presents the findings in the terminal session first, as a numbered
   list with a recommendation per item; nothing is fixed until the maintainer
   says which ones to fix. Approved fixes land on the feature branch, and **each round of
   fixes is re-tested with Playwright** before the review stage starts —
   especially the interactions the fixes touched.
6. **Review** (`review.md`) — numbered test checklist, findings; verified by
   Claude (agent-verified marks) and by the maintainer (their own ticks). No fixes in this
   stage unless asked; approved fixes go on the feature branch.
7. **Merge / deploy** — feature branch merged to `main`; the push to `main`
   deploys (see Code repo).

Never skip ahead. Never write the next stage's doc "while at it".

**Model recommendation before every stage.** Whenever a stage ends, Claude
states clearly, as the first line of its message, what comes next and which
model it should run on, e.g. "Next: 4-analysis, PRD stage. Recommended model:
Fable 5.1 (DSP port, fixture tolerances)." The maintainer switches before
saying go. Default guidance: Fable for judgment-heavy phases (analysis design
and implementation, debugging that stalls, anything touching the DSP); Opus for
docs, UI work, checklists, and routine fixes.

## Branching
- Every feature lives on its own branch, `feat/<N>-<feature>` (e.g.
  `feat/3-waveform-crop`), cut from `main` when the PRD stage starts.
- All stages of the phase happen on that branch: docs commits in the workflow
  repo reference it, code commits land on it.
- Merge to `main` only in stage 7, after review.md is closed. Fast-forward or
  merge commit, the maintainer's call at merge time. `main` is always deployable.

## Layout
- [`mvp.md`](mvp.md) — leading document. Scope, UI, stack, definition of done.
- [`backlog.md`](backlog.md) — post-MVP ideas.
- `mvp/<N>-<feature>/` — one dir per MVP feature, numbered in
  build order so they sort chronologically, with
  `prd.md`, `design.md`, `tasks.md`, `review.md`.
- `features/<slug>/` — one dir per post-MVP feature, same stage
  files as an MVP phase. Not numbered: these are taken off [`backlog.md`](backlog.md) in
  whatever order, so a number would claim an order that does not exist.
- `discussions/YYYY-MM-DD-<slug>.md` — decisions.
- Public copies for the website are made by hand later; nothing here is
  published automatically.

## Code repo
- The public code repo, MIT licensed. Cloned locally as `rpm-boss`.
- Git identity: whatever `git config` holds in the clone. Commit trailer
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Commit style: conventional, `feat(scope): ...`, `fix(scope): ...`,
  `test(scope): ...`, `docs: ...`, `chore: ...`. Feature id in brackets at the
  end of the subject, e.g. `feat(dsp): envelope + autocorrelation [rb-analysis]`.
- Never push unless told. Never install on the phone unless told.
- `npm test` and `npm run lint` must pass before a task is called done.
- Test fixtures: `audio/` (original AAC) and `test/fixtures/` (16 kHz mono WAV +
  `expected.json`), both committed.

## Feature order (MVP)
1. `1-bare-app` — Vite/React/TS scaffold, vitest, lint, README, fixtures. (done
   in one go, before the stage-gated loop starts)
2. `2-audio-input` — upload (audio only, 50 MB) + record (10 s hard stop),
   decode to 16 kHz mono, playback.
3. `3-waveform-crop` — canvas waveform, always-on crop, 10 s max window,
   overview + movable window for long files.
4. `4-analysis` — DSP port + tests against fixtures; preset; expected range.
   **Run this phase on Fable 5.1** (DSP port and fixture tolerances are the
   judgment-heavy part); Opus is fine for the other phases.
5. `5-result-view` — the number and the marked waveform.
6. `6-android` — Capacitor shell, signed build, install.
7. `7-i18n` — translation layer, then English, Tagalog, Bisaya. Deliberately
   late in the MVP: every user-facing string exists by then and can be
   extracted in one pass. Until then, keep strings out of deep component
   internals (the error messages in `audio/types.ts` are the pattern) so this
   stays extraction rather than archaeology.
8. `8-ui-overhaul` — a full visual redesign, not a list of fixes. Every MVP
   feature exists by then, so the whole screen can be judged at once instead of
   one phase at a time, which is why it is last. An agent takes the redesign:
   portrait and landscape, dark and light, and a better arrangement of the
   components rather than the single column they were added to.

   It also carries the UI work deferred out of earlier phases, at least:
   - the long-clip overview threshold, the constant `LONG_CLIP_S = 30` in
     `waveform/range.ts`, which assumes 360 px phone width (~12 px/s) and is
     wrong on both narrower screens and desktop. Derive it from the measured
     canvas width, which means lifting the width measurement out of
     `WaveformCanvas`.
   - the language picker from phase 7, placed properly rather than wherever was
     convenient.
   - right-to-left layout, if Urdu was held back from phase 7 for it.

## Who ticks the checklist

The checkboxes in `review.md` section B are the maintainer's, always. Claude
never marks one `[x]`, even after running the check itself and seeing it pass.
What Claude may do is record the evidence on the item, as
`(agent-verified: <what was observed>)`, and leave the box empty. A box is
ticked only after the maintainer says that item passed.

Rationale: an agent driving a headless browser is not the same as a person
using the app on a phone, and a checklist that ticks itself stops being a
record of what a human confirmed.

## review.md format
Lettered sections (A. Automated, B. Manual checklist, C. Findings, D. Open
questions, …) and one markdown list item per test or finding, each on a single
line, prefixed with the section letter and number in bold (**B3**, **C1**),
so any item can be referred to unambiguously in chat.
