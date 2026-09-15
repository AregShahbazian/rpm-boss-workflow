# How I build software with LLMs

An LLM writes production-quality software when a human does the specifying
and the gating. Not "prompt until it looks right". 
The method below is the one I've used daily, on an 8-year-old commercial codebase and on new projects
alike, and everything it produces ends up as a document I can go back to,
rather than a chat log.

This site publishes one whole project built that way, workflow documents and
all: **[the rpm-boss workflow documentation](README.md)**.

## Phases and stages

A **phase** groups features, and is a numbered directory on disk. 
A **stage** is a step of the workflow itself. 
A feature in phase 3 still passes through all seven stages.

## The seven stages

Any stage can be preceded by discussion and research. The first three produce
documents written by the agent. First in draft, so I can approve the
direction before we commit to one. Stages 4 and 5 produce code. A stage can
also be preceded by a deliberate choice of model and configuration. By default,
at most one stage runs per prompt, and I check, verify and correct its output
before the next one starts.


1. **PRD (Product Requirement Document)** - requirements only, with explicit non-requirements. No design
   choices, no implementation details. Every PRD carries a short stable id in
   its frontmatter. (`prd.md`)
2. **Design** - architecture, data flow, API usage, trade-offs argued in
   writing, and open questions split into those the agent can settle on its own
   and those it cannot. (`design.md`)
3. **Tasks** - file-by-file changes in order, each with its verification step.
   (`tasks.md`)
4. **Implementation** - code, on a branch of its own, every commit referencing
   the PRD id. The stage ends with the agent driving the running app itself,
   through Playwright in the browser or adb on the Android phone. It reports
   what it actually saw, not what it expects from reading the code.
5. **Code review** - I trigger it. Findings arrive as a numbered list with a
   recommendation for each. Nothing is fixed until I say which ones. Every
   accepted fix is re-verified in the running app.
6. **Review** - a checklist in lettered sections and numbered items, so any
   single item can be named in conversation. The agent records evidence per
   item and marks what it verified itself. The boxes stay mine to tick.
7. **Merge and deploy** - the branch merges only here. Whether that means a
   deployable `main`, or some other release flow, is per project.

## The rules that make it hold

- **Docs live outside the code repo.** A central tree keyed by repo name, so a
  shared codebase never carries one contributor's process. This also prevents gained 
  experiences and knowledge from being lost in one project's repo.
- **The id links the doc to the code.** Every PRD carries an id, every commit
  that implements it names that id, so the trail survives:

  ```
  $ git log --oneline --grep="rb-analysis"
  e917e1c Merge branch 'feat/4-analysis' into main [rb-analysis]
  481cac7 fix(audio): fail a blocked capture in 300 ms, with a message that helps [rb-analysis]
  5b8b7ee fix(audio): keep the capture graph connected, reject a silent take [rb-analysis]
  b51c108 fix(audio): capture through an audio worklet, all processors off [rb-analysis]
  ... 21 commits, against the four documents in mvp/4-analysis/
  ```

- **Agent-verified is not verified.** Anything the agent checked itself is
  labeled as such and still waits for me. Without that line the checklist would
  be worth nothing.
- **No fix before the cause is confirmed.** In debugging, the agent
  instruments and proves the cause first. A fix applied to an unconfirmed guess
  is how bugs multiply. The
  [microphone investigation](/rpm-boss/workflow/discussions/2026-09-10-android-microphone-capture.md)
  is the worked case: four plausible diagnoses, three of them wrong, settled by
  probing one variable at a time on the device.
- **Hard stops the agent never crosses alone:** pushing to a remote, writing to
  a connected device, and editing code during a review round.
- **The right model per stage, chosen deliberately.** Before a stage starts,
  the agent names the model best suited to it. That way thinking work and
  typing work do not run on the same budget.

## Why this matters beyond the project

The same skills carry straight over into training and testing AI models:

- **Specs an agent can build from.** A PRD written well enough that an agent
  needs no further explanation is the same thing as a good test task with a
  known right answer.
- **Scoring against a written standard.** Each check on the review list has its
  own evidence, and a person makes the final call.
- **Known-correct answers to measure against.** The test cases carry expected
  values worked out by hand, and how close a result has to be is agreed in
  writing before anything is built.
- **Findings argued one by one.** Every point raised in a review is either
  accepted or turned down in writing, with the reason.

## The worked example: rpm-boss

After theory, comes practice. Here is a full project created with my workflow,
with both the [source code](https://github.com/AregShahbazian/rpm-boss) and the
[workflow documents](https://github.com/AregShahbazian/rpm-boss-workflow)
published.

**rpm-boss** measures an engine's RPM from its sound. Record a motorcycle engine held at steady revs and get a
tachometer reading. Audio DSP, React and TypeScript, web and Android, and soon
on Google Play. Five days of effort, from empty directory to Play-store submission.
[Try it in the browser](https://areg.nl/rpm-boss/) with the bundled samples and
the simulated engine.

**[The complete workflow documentation](README.md)** - every PRD, design doc,
task list, review checklist and decision discussion, as written during
development, unpolished. Seven code-review rounds, 54 findings, each argued.
It also shows the workflow is not a dogma. One feature skipped its review
document altogether, because I judged the fixes and the merge are better done in
one pass, and the status table says so. Some findings get turned down rather
than fixed, with the reason written down either way.


## Background

Eight years as the primary frontend engineer of
[Altrady](https://www.altrady.com), a multi-exchange crypto trading platform.
BSc Artificial Intelligence, University of Amsterdam (2015).

[CV](https://areg.nl/cv/) -
[GitHub](https://github.com/AregShahbazian) -
[LinkedIn](https://www.linkedin.com/in/areg-shahbazian/)
