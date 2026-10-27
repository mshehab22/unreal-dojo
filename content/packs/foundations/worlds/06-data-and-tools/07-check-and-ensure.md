---
id: f6-check-and-ensure
title: check and ensure
order: 7
kind: concept
difficulty: 2
patterns: []
skills: [debugging]
terms: [check-macro, ensure-macro]
prerequisites: [f6-curves]
xp: 25
estimatedMinutes: 7
concepts:
  - check stops the program when an assumption that must hold does not
  - ensure reports a broken assumption once, with a callstack, and lets the game go on
  - A missing designer setting deserves ensure or a warning, never check
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a designer forgets to assign a curve, and the code says check(Curve != nullptr). What happens when that code runs in the editor?"
choices:
  - A yellow warning and the game carries on
  - The editor stops on that line, as if it crashed
  - Nothing in the editor; check only runs in shipped games
  - The curve is filled in with a default
answerIndex: 1
explanation: A failed check halts the program and points at the line; that is far too harsh for a designer's missing setting.
```

# Card

Assertions write an assumption into the code and complain when it turns out false. Unreal has two families, and choosing between them is about how bad it is to carry on.

**`check(Condition)`** says: if this is false, the program is broken and continuing is pointless. A failed check stops the editor or game on the spot, like a crash, and the debugger lands on the line. `checkf(Condition, TEXT("format"), ...)` adds a message. Use it for programmer mistakes that make everything after them wrong, such as an index the code itself computed being out of range. Checks are compiled out of Shipping builds by default, so never put code with side effects inside one; `verify(Expression)` keeps its expression in every build.

**`ensure(Condition)`** says: this should not happen, but the game can survive it. A failed ensure logs an error with a callstack, breaks into the debugger if one is attached, and then returns false so the code can back out:

```cpp
if (!ensureMsgf(IsValid(Curve), TEXT("%s has no curve"), *GetName())) return 0;
```

It reports only the first time each ensure fails in a session, so a failure every frame does not flood the log. `ensureAlways` reports every time.

Rules of thumb:

- **Data a designer sets** (an unassigned asset, a misspelled row): `ensure` or a warning in your log category, then a safe fallback. The editor keeps running and the designer sees what to fix.
- **Something that cannot happen if the code is right**: `check`.
- **An expected situation** (the player shoots nothing, a target is already down): neither; it is a normal branch.

Automation tests treat an unexpected ensure as a failure, so a test that means to trigger one says so with `AddExpectedError`.

# Example

```cpp
void ADojoPlatform::Rise(float Fraction)
{
	// Designer data: report it and stand still.
	if (!ensureMsgf(IsValid(RiseCurve), TEXT("%s has no rise curve"), *GetName())) return;

	// The code sets CurrentStop itself, so a bad index means the code is wrong.
	check(Stops.IsValidIndex(CurrentStop));

	SetActorLocation(Stops[CurrentStop] + FVector(0.f, 0.f, RiseCurve->GetFloatValue(Fraction)));
}
```

# Questions

```yaml
- id: pick-designer
  type: multiple-choice
  prompt: "A level component's XP curve might be left unassigned by a designer. What should the code do?"
  choices:
    - check that it is set
    - ensure that it is set and return a safe value when it is not
    - Assume it is set
  answerIndex: 1
  explanation: A missing designer setting should be reported loudly and survived.
- id: fill-returns
  type: fill-blank
  prompt: "ensure can sit inside an if because it ___ the condition it checked."
  acceptedAnswers: [returns]
  explanation: ensure returns the condition, so if (!ensure(X)) return; reports and backs out in one line.
- id: spot-side-effect
  type: spot-the-bug
  prompt: A level loads its save in the editor, but in the Shipping build the save is never loaded. Which line is wrong?
  code: |
    void ADojoGameMode::BeginPlay()
    {
    	Super::BeginPlay();
    	check(LoadProgress());
    	StartRound();
    }
  bugLine: 4
  fix: Call LoadProgress outside the check, or use verify, which keeps its expression in every build.
  explanation: check is compiled out of Shipping builds, and the call inside it goes with it.
- id: once-only
  type: multiple-choice
  prompt: "An ensure inside Tick fails every frame. How many reports does it log in one session?"
  choices: [One per frame, One, None]
  answerIndex: 1
  explanation: A plain ensure reports only its first failure; ensureAlways reports every time.
- id: explain-choice
  type: explain-in-one-sentence
  prompt: In one sentence, say how to choose between check and ensure.
  modelAnswer: Use check when continuing would be pointless because the code itself is wrong, and ensure when the problem should be reported but the game can safely carry on.
  rubric:
    - Ties check to unrecoverable programmer errors
    - Ties ensure to reported but survivable problems
  explanation: The choice is about whether carrying on makes sense.
```
