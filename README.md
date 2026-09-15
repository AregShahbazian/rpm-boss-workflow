# rpm-boss - workflow docs

*Part of [how I build software with LLMs](index.md).*

The complete, real workflow documentation behind [rpm-boss](https://github.com/AregShahbazian/rpm-boss)
(engine RPM from sound - [live demo](https://areg.nl/rpm-boss/)): every PRD,
design doc, task list, review checklist and decision discussion, per feature,
as they were written during development. Published as-is, lightly scrubbed of
private details. One snapshot commit; the living copy is private.

- [mvp.md](mvp.md) - leading document: scope, UI, stack, done-criteria.
- [workflow.md](workflow.md) - stage-gated execution, layout, commit rules.
- [backlog.md](backlog.md) - post-MVP ideas.
- `mvp/<N>-<feature>/` - per-feature prd / design / tasks / review.
- `discussions/` - dated decision notes: [2026-09-10 audio-input scope](discussions/2026-09-10-audio-input-scope.md), [2026-09-10 Android microphone capture](discussions/2026-09-10-android-microphone-capture.md), [2026-09-10 i18n languages and markets](discussions/2026-09-10-i18n-language-and-markets.md), [2026-09-14 realtime-tacho requirements](discussions/2026-09-14-realtime-tacho-requirements.md), [2026-09-14 tacho layout and viz libs](discussions/2026-09-14-realtime-tacho-layout-and-viz-libs.md), [2026-09-14 tacho range and detection limits](discussions/2026-09-14-tacho-range-and-detection-limits.md).

## How to read this

New here? Take one feature end to end:

1. [workflow.md](workflow.md) - the stages and gates every feature passes through.
2. [mvp/3-waveform-crop/](mvp/3-waveform-crop/) - a full run: [prd](mvp/3-waveform-crop/prd.md) (what and why), [design](mvp/3-waveform-crop/design.md) (how), [tasks](mvp/3-waveform-crop/tasks.md) (ordered steps), [review](mvp/3-waveform-crop/review.md) (verification checklist and findings).
3. [discussions/2026-09-10-audio-input-scope.md](discussions/2026-09-10-audio-input-scope.md) - how scope decisions get made before a PRD exists.

## Status
| Feature | State |
|---|---|
| 1-bare-app | done |
| [2-audio-input](mvp/2-audio-input/) | done - review closed 2026-09-10 |
| [3-waveform-crop](mvp/3-waveform-crop/) | done - review closed 2026-09-10, merged 84c2ed6 |
| [4-analysis](mvp/4-analysis/) | done - review closed 2026-09-10, merged e917e1c |
| [5-result-view](mvp/5-result-view/) | done - review closed 2026-09-10, merged 62cd62a |
| [6-android](mvp/6-android/) | done - review closed 2026-09-10, merged ace9e6c |
| [7-i18n](mvp/7-i18n/) | done - review closed 2026-09-10, merged a276d43 |
| [8-ui-overhaul](mvp/8-ui-overhaul/) | done - merged 1b7377b. No review.md: the maintainer overrode the workflow and had the code review fixes applied and the merge done in one pass. Also carries the sample picker from `main`. |

Post-MVP features (`features/<slug>/`, same stages):

| Feature | State |
|---|---|
| [styling](features/styling/) | done - review closed 2026-09-13 |
| [realtime-tacho](features/realtime-tacho/) | done - review closed 2026-09-15 |
| [demo-mock](features/demo-mock/) | done - review closed 2026-09-15, merged 3cda514 |
