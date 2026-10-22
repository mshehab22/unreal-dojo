---
id: p7-state-card
title: The mode decides
order: 3
kind: concept
difficulty: 2
patterns: [state]
skills: [state]
terms: [finite-state-machine, uenum, uobject, state-tree, behavior-tree, animation-blueprint, createdefaultsubobject]
prerequisites: [p7-prize-kiosk]
xp: 25
estimatedMinutes: 8
concepts:
  - State gives an object one current mode that decides how it answers every input
  - An enum with a switch per input is the light form; mode objects are the form for modes with their own data
  - Changing mode runs the old mode's exit and the new mode's entry
  - Unreal offers enum modes, UObject mode classes, and StateTree for data-driven hierarchical machines
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the prize kiosk gains a fifth mode, Maintenance, in which every input is ignored except Restock. With the enum and switch shape, what changes?"
choices:
  - Only a new enum value; inputs with no rule for it fall to default and are ignored, and Restock gets one new case
  - Every input needs a new boolean
  - The whole kiosk must be rewritten as classes
  - Nothing can be added without breaking the other modes
answerIndex: 0
explanation: A new mode is a new value. Inputs that should do nothing in it already do nothing through their default case; only the inputs that act in it get a case.
```

# Card

What the prize kiosk does is the **State** pattern. An object has one current mode, and that mode decides how the object answers every input. Inputs a mode has no rule for are ignored. Changing mode is changing one value, and work that belongs to arriving in or leaving a mode lives with that mode.

**Two Unreal forms.**

- **An enum and a switch.** One `UENUM` value per mode, and every input starts with a `switch` on it. Light, easy to read top to bottom, and visible in the Details panel. Right while modes carry no data of their own and each rule is short.
- **Mode objects.** One `UObject` subclass per mode, with a function per input, deriving from an abstract base whose defaults ignore everything. The owner keeps the current mode in one pointer and hands every input to it. Each mode keeps its own data (how far an aim has come, how long a reload has left) in its own class. Right when modes carry data or grow many rules. The mode objects can be made once with `CreateDefaultSubobject` and reused, or created anew on each change.

**Entry and exit.** Every change of mode goes through one function that runs the old mode's exit, switches, and runs the new mode's entry. Then no input can forget the timer, the reset, or the sound that belongs to a mode.

**Beyond one flat machine.** Two independent concerns (what a guard is doing, and whether it is carrying a torch) are two small machines, not one machine with every combination. A temporary mode that must return to whatever came before (stunned, then back to patrolling or chasing) can keep the previous mode on a small stack. Modes that share rules can sit under a parent mode that handles the shared ones.

**What the engine gives.** The character movement component keeps one movement mode and reports changes. An **Animation Blueprint** has its own state machines for poses, which drive animation, not gameplay rules. **StateTree** is an engine plugin for data-driven, hierarchical state machines: states arranged in a tree, each with tasks to run and transitions with conditions, edited as an asset and run by a StateTree component. A **Behavior Tree** is the other engine tool for AI decisions, built around picking tasks by priority rather than holding one current mode.

# Example

```cpp
// The mode-object form: the owner forwards, the current mode decides.
void ADojoArenaLift::CallLift()
{
	if (IsValid(CurrentMode)) CurrentMode->OnCalled(this);
}

void ADojoArenaLift::ChangeMode(UDojoArenaLiftMode* NewMode)
{
	if (!IsValid(NewMode) || NewMode == CurrentMode) return;

	if (IsValid(CurrentMode)) CurrentMode->Exit(this);
	CurrentMode = NewMode;
	CurrentMode->Enter(this);
}
```

# Questions

```yaml
- id: lift-modes
  type: which-pattern
  prompt: "A cargo lift in the arena can be Waiting, Closing, Travelling, or Opening. The call button means something different in each, and is ignored while travelling. Which pattern?"
  choices: [state, command, observer, update-method]
  answer: state
  distractorNotes:
    - choice: command
      why: The button press could be a command object, but it does not decide which presses count in which mode.
    - choice: observer
      why: The lift may announce when it arrives, but deciding what an input means in each mode is the problem here.
    - choice: update-method
      why: Travelling needs a per-frame update, but the core need is one current mode that decides every answer.
  explanation: One current mode decides what every input means, and inputs without a rule in that mode do nothing.
- id: two-concerns
  type: which-pattern
  prompt: "An arena guard can be patrolling, chasing, or searching, and separately can be carrying a torch or not. Writing six modes for every pairing is getting out of hand. Which pattern, applied twice, fits?"
  choices: [type-object, state, singleton, flyweight]
  answer: state
  distractorNotes:
    - choice: type-object
      why: A data asset could describe kinds of guard, but not the guard's current activity or what it holds right now.
    - choice: singleton
      why: A global guard manager does not split one guard's two independent concerns.
    - choice: flyweight
      why: Sharing data between guards saves memory; it does not untangle one guard's modes.
  explanation: Two small machines, one for the activity and one for the torch, replace one machine with every combination.
- id: spot-skip-enter
  type: spot-the-bug
  prompt: This lift changes mode when a passenger steps in. Which line skips the work the new mode does on entry?
  code: |
    void UDojoArenaLiftWaiting::OnPassengerEntered(ADojoArenaLift* Lift)
    {
    	Lift->PlayChime();
    	Lift->CurrentMode = Lift->ClosingMode;
    }
  bugLine: 4
  fix: Change mode through the lift's ChangeMode so Waiting's exit and Closing's entry both run.
  explanation: Setting the pointer directly means Closing never starts its door timer and Waiting never cleans up.
- id: fill-default
  type: fill-blank
  prompt: "In the enum form, an input that has no rule in the current mode falls to the switch's ___ case and does nothing."
  acceptedAnswers: [default]
  explanation: Ignoring inputs without a rule is part of the pattern, not an accident.
- id: explain-state
  type: explain-in-one-sentence
  prompt: In one sentence, describe the State pattern.
  modelAnswer: An object keeps one current mode that decides how it answers every input, changing mode by switching that one value or object and running the modes' entry and exit work.
  rubric:
    - Says there is one current mode that decides the response to inputs
    - Mentions changing mode, with entry or exit work, or inputs without a rule being ignored
  explanation: The object's behavior changes because its mode changed, not because a pile of flags lined up.
```
