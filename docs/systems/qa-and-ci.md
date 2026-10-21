# System: qa-and-ci

Owner: tester. Folders: `e2e/`, `.github/workflows/`, `docs/iterations/` (screenshots). Research: `research/tooling-and-stack.md` sections 7 and 8.

## Responsibilities

- GitHub Actions matrix (windows-latest, macos-latest): install, typecheck, unit tests, parse-only verifier, build, Playwright smoke with screenshots uploaded as artifacts, package installers on tags.
- Playwright `_electron` flows: first run (dialogs stubbed), the vertical-slice learner flow, every screen screenshot at two sizes, keyboard shortcuts.
- Engine runs: the verifier with `--engine` and the pipeline integration tests run on the Windows desktop (self-hosted or manual) and results pasted into `docs/iterations.md`; CI runners have no engine.
- Content spot checks after each world merge: a fresh reviewer agent samples 8 quests for copied wording, solution leaks in starters or hints, UE API accuracy, fade ladder, and glossary coverage.
- Performance checks: content load time with 300 quests, editor responsiveness during a build, memory after an hour of use.

## Done criteria

- Green matrix on main after every merge.
- Every UI task has screenshots in `docs/iterations/`.
- A failing verifier or e2e run blocks merge; the Lead sends it back.
