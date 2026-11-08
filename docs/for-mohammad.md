# For Mohammad: what is left that needs you

Written by the Lead on 2026-11-08, when all the work that does not need you was finished. Main is at the commit that adds this file. All 4 packs, 43 worlds, and 343 quests are merged, and every check passes on main: typecheck, 1382 unit tests, the content verifier, the build, and 50 e2e tests. Nothing here is urgent and nothing is blocked on it. Answer any of it in any order.

Each item is one decision. Where the Lead already chose, the app works that way now, and you only need to answer if you want it changed.

## 1. About the project

1. **Why are you building Unreal Dojo?** The project brief left this as "ask me". Your answer goes at the top of `docs/product.md` and guides future choices.
2. **What does "finished" mean for this project?** The Lead assumed the finish line is the public GitHub release (M5.3). Say if it is something else.

## 2. Waiting for you: money, publishing, your machine

3. **Install the Windows installer and launch it?** Sessions never launch the app (A77), so the installed app has not been opened. Steps: in `C:\Projects\unreal-dojo` run `npm run package`, then run `dist\Unreal Dojo Setup 0.1.0.exe`, start Unreal Dojo from the Start menu, and check the Title screen appears. This closes M5.2.
4. **Make the GitHub release public (M5.3)?** Publishing waits for you. The repository stays private until you say so.
5. **Buy a Windows code-signing certificate?** It costs money, so it waits for you. Without one, Windows SmartScreen warns on first install; the install guide explains "More info" then "Run anyway".
6. **Keep naming real commercial games in the course?** Eight quest files name the game a boss is inspired by (Resident Evil 4, Duck Hunt, Overwatch, Minecraft, Skyrim, Thief, Animal Crossing). The Lead kept them because they help a learner picture the mechanic. The alternative is to describe the mechanic without the game's name before the public release. Find them with `grep -rl "Resident Evil\|Duck Hunt\|Overwatch\|Minecraft\|Skyrim\|Thief\|Animal Crossing" content`.
7. **Give the app its own icon before release?** It uses Electron's default icon now (A1184). The files would be `build/icon.ico` and `build/icon.icns`.
8. **Delete `C:\dp10-proof`?** It is a leftover proof folder from an early engine run. The safety check stopped the Lead from deleting it, so delete it yourself if you agree.
9. **Clean up the old worktrees and sessions?** There are 29 worktrees under `.claude\worktrees` and 16 finished builder sessions. All their work is merged. The Lead removes them only on your yes.

## 3. Decisions the Lead made that you may want to change

Ordered by how much changing it would change what the learner sees, most first. All 1039 decisions are in `docs/decisions.md` under "Awaiting Mohammad's review"; the rest are engineering, measurements, or wording fixes for one quest.

10. **Should the Patterns pack teach one pattern per world?** Lead chose one world per pattern, 23 worlds. Alternative: about 8 themed worlds with several patterns each, as `docs/product.md` first planned. (A491)
11. **Should every Patterns world end in a boss?** Lead chose no: Worlds 1 to 8 and 10 to 12 have none, and bosses run from World 13 on (plus World 9). Alternative: add a boss to each. (A380, A470, A490, A541, A551, A652, A761, A781, A901, A922, A1092)
12. **Should the course teach Strategy, Factory Method, and Facade?** Lead chose yes, as Patterns Worlds 20 to 22, after the book's patterns. Alternative: leave them out. (A69)
13. **Should the Patterns pack open right after Foundations World 1?** Lead chose yes, and its World 1 teaches delegates itself. Alternative: lock it until Foundations World 5, where delegates are taught. (A381)
14. **Should the exercise ideas left "for a later pass" be added?** Lead chose to leave them out for now: seven Input exercises (for example Double-Tap Dodge and Rebind At Runtime), four delegate topics, and six pattern combos. Alternative: schedule them as new quests. (A1110, A870, A1805, A1806)
15. **Should the paid API also review a submit whose tests failed?** Lead chose no: the paid API reviews only fully passing submits, and Claude Code on your subscription reviews any submit that compiled. Alternative: the paid API reviews every compiled submit, at a cost per call. (A70)
16. **Should only the first Submit of a quest count toward the spree?** Lead chose yes: retries and repeats neither add to it nor break it. Alternative: every pass adds to the spree. The armor numbers are in `docs/systems/progress-and-rules.md`. (A125, A1396)
17. **Should a pass after paying XP to see the solution pay 0 XP?** Lead chose yes, with a rematch 3 days later paying 50 percent, and a Seer Stone keeping full XP. Alternative: a smaller XP cut. (A121, A1392)
18. **Keep the forgiving streak?** Lead chose yes: it survives 3 days with no activity, freezes add 3 more days each, and the wording never guilt-trips. Alternative: a strict daily streak. (A126, A1395)
19. **Should practice drills with nothing due pay nothing?** Lead chose yes: no XP, no streak credit, no daily chest. Alternative: a small payout. (A320, A1393)
20. **Should a learner be able to skip a world's builds by passing its test-out drill?** Lead chose yes, once every term in the world is proficient; bosses are never skipped. Alternative: no skipping. (A313)
21. **Should effort XP for a failed attempt be paid only on code quests?** Lead chose yes: build, refactor, and boss pay it; concept and breakdown do not. Alternative: every quest kind pays it. (A139)
22. **Are placeholder chest cosmetics fine for the first release?** Lead chose eight placeholder cosmetics that change nothing you can see yet. Alternative: design real ones before release, or take them out of the chest. (A132, A1398)
23. **Do the boss themes suit you?** Lead chose settings like a clay range, an attaché case expedition, a sparring ring, a modded vault, a village gate, a night shift, and harbor fireworks. Alternative: themes closer to your own games. (A337, A1154, A1356, A1376, A1505, A1565, A1656, A1716)
24. **Should quest code use your game-dev-rules naming instead of Epic's coding standard?** Lead chose your rules (for example, enum values carry the enum's initials). Alternative: Epic's standard, which learners see in the engine. Changing it means renaming across quests, tests, and solutions. (A66)
25. **Remove "This one fails on purpose the first time for most people" from 22 quests?** No ruling yet; the line is still there. The spot-checks keep finding that giving away the failure weakens it. Alternative: keep the line. (A1623, A1636)
26. **Should a pattern stay unnamed until its card quest?** Lead chose yes, so the learner meets the problem before the name. Alternative: name it in the brief. (A64, A373)
27. **Keep the dark "ink and warm paper" look with one accent color per pack?** Lead chose amber, violet, cyan, and green accents on near-black, with Bricolage Grotesque, Instrument Sans, and JetBrains Mono. Alternative: a lighter or more game-like look. (A93, A92)
28. **Should failures caused by the setup be headed "Not your code"?** Lead chose yes. Alternative: plain error wording that makes no claim about fault. (A1213)
29. **Sign the macOS build ad hoc, which is free?** Lead left it unsigned, with the install guide explaining Open Anyway. Ad hoc signing gives fewer "damaged" warnings. (A1186)

## 4. Playtest when you like

On this PC, from a clean start, so no sample data or earlier progress gets in the way. In PowerShell:

```
cd C:\Projects\unreal-dojo
npm run build
npx electron . --user-data-dir="$env:USERPROFILE\DojoPlaytestData"
```

Then follow "The first world on the real engine, start to finish" under "Ready to playtest" in `docs/plan.md`. Pick UE 5.8.4 as the engine and an empty folder like `C:\DojoPlaytestSandbox` as the sandbox. The steps there were written on the Mac, so ignore the Metal toolchain note. Look for: does each world feel like it teaches one clear thing, do the deliberate failures surprise you in a useful way, and does the reward loop make you want the next quest.

## 5. Not needed now

- The macOS items in `docs/problems.md` (Metal toolchain download, `gh auth login`, the Cmd+Q check) wait until the Mac matters again.
- The originality check of Patterns Worlds 10 and later against Nystrom's book (D13) is owed because the PDF is no longer on the Mac. The Lead can run it against the book's free web edition; nothing needs you for that.
