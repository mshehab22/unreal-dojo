# Unreal Dojo

A desktop app (Windows and macOS) for learning Unreal Engine C++ by practicing: concept cards you can hover, spaced recall drills, breakdown quests where you plan a mechanic before coding, build quests compiled and tested by the real engine, and bosses. With a game layer that keeps you coming back.

Status: planned and researched; not yet built. Everything a build team needs is in this folder.

## Start here (Claude Code)

Open this folder in Claude Code and run:

```
/project-lead
```

Then paste:

```
Read CLAUDE.md, then docs/plan.md, docs/decisions.md, docs/problems.md, docs/product.md, and every file in docs/systems/. Start milestone M0 now: open one builder session per system that has M0 work, spawn reviewers and a tester, and keep the board in docs/plan.md current. Do not wait for me on anything except spending money or publishing; decide, log it under "Awaiting Mohammad's review" in docs/decisions.md, and continue. The Unreal engine on this machine is at <path> (leave blank if not installed here; log pipeline tasks as unverified and keep going).
```

## What is in here

- `CLAUDE.md`: how the project is run, commands, machines, code rules.
- `docs/product.md`: vision, learning model, curriculum, game design.
- `docs/plan.md`: milestones ordered by dependency, systems and owners, the board.
- `docs/decisions.md`: every decision, with the ones awaiting review at the top.
- `docs/problems.md`, `docs/iterations.md`: open problems; builder entries.
- `docs/systems/`: one spec per system.
- `research/`: the studies this plan rests on (GameDev.tv exercise design, Nystrom's patterns, gamified learning platforms, tooling and stack, Unreal concepts inventory, glossary seed).

## Opening the unsigned Mac build

Builds are not signed or notarized yet, so macOS Gatekeeper blocks the app the first time. Right-click Unreal Dojo in Applications and choose Open, then Open again. On Windows, SmartScreen shows "unknown publisher"; choose More info, then Run anyway.
