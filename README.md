# Unreal Dojo

Unreal Dojo is a desktop app for Windows and macOS that teaches Unreal Engine C++ by making you practice it. You do not watch lessons. You work through short quests in a studio that remembers how you are doing.

- **Concept cards** explain one idea at a time. Hover any highlighted term to see its definition and a link to Epic's docs.
- **Recall drills** bring old ideas back on a spaced schedule, so they stay.
- **Breakdown quests** ask you to plan a finished mechanic or system on a board before you write any code.
- **Build quests** give you a brief and a starter. You write real UE5 C++, and the app compiles it and runs its tests inside a sandbox Unreal project on your own computer.
- **Refactor quests and bosses** make you fix and combine what you learned.
- **A game layer** (your studio, XP, roles, pattern cards, a spree, a streak, loot) gives you a reason to come back tomorrow.

Everything runs on your machine. The sandbox project, the compiler, and your saves are all local. The only thing that can leave your computer is the code you send for AI review, and only if you turn that on.

## Get the app

This repository is private, so there is no public download yet. Every push to `main` builds an unsigned installer for each platform, and you can fetch it from the run that built it:

1. Sign in to GitHub with an account that can see this repository, and open its **Actions** tab.
2. Open the newest run of the **ci** workflow on `main` that has a green check. The package jobs at the end must have finished.
3. Scroll to **Artifacts** at the bottom of the run page. Download `installers-windows-latest` (Windows) or `installers-macos-latest` (macOS).
4. Unzip it. Windows gives you one `.exe`. macOS gives you two `.dmg` files: the one ending in `-arm64` is for Macs with Apple silicon (M1 and later), and the other is for Intel Macs.

Artifacts are kept for 7 days. If the newest run is older than that, open **Actions**, choose **ci**, press **Run workflow**, pick `main`, and wait for it to finish.

Public release: not yet. A download link will go here when the app is published.

The installers are not signed, because certificates cost money. Windows and macOS will both warn you the first time. The steps for getting past each warning are in the install guides:

- [Install on Windows](docs/install/windows.md)
- [Install on macOS](docs/install/macos.md)

The app has no custom icon yet, so you will see the default Electron icon in the taskbar, the Dock, and the installer.

## What you need

| | Windows | macOS |
| --- | --- | --- |
| Unreal Engine | 5.8 recommended. 5.4 to 5.7 also work. | Same. |
| C++ toolchain | Visual Studio 2022 17.14 or later (or Visual Studio 2026) with the **Game development with C++** workload | Full Xcode from the App Store, opened once, with its license accepted. On Xcode 26 and later, also the Metal toolchain. |
| Computer | 64-bit Windows 11 or 10 | A Mac with Apple silicon or an Intel chip |

About the engine versions:

- **UE 5.8** is the target. It has a built-in MCP server with automation test and Live Coding toolsets, which the app uses for a faster edit loop on Windows. Live Coding is not available on macOS, so a Mac always uses the slower loop below.
- **UE 5.4 to 5.7** work through the fallback loop. The app builds your code with Unreal Build Tool and runs the tests with a headless editor process. It is slower per run than the fast loop but gives the same results.
- You do not need to install Node.js or anything else to run the installed app.

The first run checks all of this for you. If something is missing, the app says what it is and what to do, in plain English.

## Where your saves live

The app keeps everything in one data folder. Two files matter:

- `progress.json`: your quests, attempts, XP, streak, drafts, and purchased hints. The app writes it in a way that survives a crash, and keeps the previous copy as `progress.json.bak`.
- `config.json`: your settings, such as the engine you picked, the loop mode, and the review provider. Your API key is in here too, but only as encrypted bytes.

| Platform | Data folder |
| --- | --- |
| Windows | `%APPDATA%\Unreal Dojo` (usually `C:\Users\<you>\AppData\Roaming\Unreal Dojo`) |
| macOS | `~/Library/Application Support/Unreal Dojo` |

The sandbox Unreal project is a separate folder. You choose it on the first-run screen, and it can be rebuilt from Settings at any time. Your saves do not live in it, so deleting it loses no progress. Keep its path short on Windows, because long paths break Unreal builds (the app warns you past 100 characters).

Uninstalling the app does not delete the data folder. To back up your progress, copy `progress.json`. To start over, quit the app and delete the data folder, or use **Reset progress** in Settings.

## Set up AI review

AI review is optional. Without it, the app still builds and tests your code and shows you the test results. With it, you also get written feedback on your code, your breakdown plans, and your one-sentence explanations. Open **Settings** and look at the **Code review** panel. There are three providers:

- **Claude Code**: uses your own Claude subscription through the `claude` command line tool.
  1. Install Claude Code from Anthropic's site and sign in once by running `claude` in a terminal.
  2. In the app, press **Test Claude Code**. It sends one tiny request and tells you whether Claude Code answered.
  3. The app finds `claude` on your PATH and in the usual install folders, so no path setting is needed.
- **API key**: uses your own Anthropic API key.
  1. Paste the key into **Anthropic API key** and press **Save**.
  2. The key is encrypted with your operating system's secure storage (Electron `safeStorage`: the Windows data protection API, or the macOS Keychain). The app never shows it again, never writes it to a log, and never keeps it in plain text. Press **Remove** to forget it.
  3. A key costs you money per review, so the app only uses it on a Submit where every test passed. A Submit with failing tests goes to Claude Code if you have it, and otherwise gets the tests-only result with a note saying why.
- **Tests only**: no AI at all. You get the test results and a checklist to review yourself.

Leave **Review provider** on **Auto** and the app picks the first one that works, in this order: Claude Code, then your API key, then tests only. If the provider you chose is not available, the app falls back to tests only and tells you the reason.

## Build from source

You only need this if you are working on the app itself. You need Node.js 24.

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app with hot reload |
| `npm run typecheck` | Type checks the main process, the preload script, and the renderer |
| `npm test` | Unit tests |
| `npm run test:e2e` | Playwright tests against the built app (run `npm run build` first) |
| `npx tsx tools/verify-content.ts` | Content checks. Add `--engine <path>` to compile and test every reference solution. |
| `npm run build` | Production build into `out/` |
| `npm run package` | Builds the installer into `dist/` (nsis on Windows, dmg on macOS), unsigned |

## What is in the repository

- `CLAUDE.md`: how the project is run, commands, machines, and code rules.
- `docs/product.md`: the vision, the learner model, the curriculum, and the game design.
- `docs/plan.md`: milestones and the task board.
- `docs/decisions.md`: every decision made, with the ones waiting for review at the top.
- `docs/problems.md` and `docs/iterations.md`: open problems and builder entries.
- `docs/systems/`: one spec per system.
- `docs/install/`: the Windows and macOS install guides.
- `research/`: the studies the plan rests on.
- `content/`: the packs, worlds, and quests. `tools/solutions/` holds a reference solution for every build quest.
