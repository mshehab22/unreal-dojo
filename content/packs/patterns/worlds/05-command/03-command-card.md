---
id: p5-command-card
title: The request as a thing
order: 3
kind: concept
difficulty: 2
patterns: [command]
skills: [command]
terms: [ustruct, tweakobjectptr, input-action, gas, scoped-transaction]
prerequisites: [p5-drill-orders]
xp: 25
estimatedMinutes: 8
concepts:
  - Command turns a request into an object or value that can be stored, passed on, delayed, repeated, or undone
  - The command can name its target, or the target can be handed to it when it runs
  - Undo needs each command to remember what it changed, and every change to go through commands
  - Unreal's forms include Input Actions, Gameplay Abilities, and editor transactions
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the drill sergeant's orders each name a dummy. The arena wants a mirror mode where a second dummy copies every order the first one gets, on the same beat. What is the smallest change?"
choices:
  - Rewrite the dummy class to watch the other dummy
  - When an order is given, queue a second order with the same move for the mirror dummy
  - Add a mirror flag to every move function
  - It cannot be done without changing the queue
answerIndex: 1
explanation: An order is a value naming a move and a target, so copying it with another target is all it takes. The dummies and the queue do not change.
```

# Card

What you built for the drill sergeant is the **Command** pattern. A request (step left, block, place a hurdle) becomes a thing in its own right: a value or object that holds what to do and what it needs to do it. Code that produces requests and code that performs them no longer have to meet at the same moment.

**What it buys.** Commands can wait in a queue for their beat. They can be listed, saved, sent across the network, or recorded and run again for a replay. They can be performed by whichever piece of code receives them. And if each command remembers what it changed, it can be taken back.

**Whose target?** A command can name its target, as the drill orders do: then it is one specific event, which is what queues, logs, and undo need. Or the target can be handed to the command when it runs, so one command (say, "dash forward") can drive the player's character, an AI-controlled rival, or a tutorial ghost alike.

**Undo has two rules.** Each undoable command records just what it changed (the slot, what was there, what it put there) so it can put things back. And every change that should be undoable must go through a command; a change made around the history is invisible to undo. A history list with a count of applied commands gives many levels of undo and redo.

**Value or object.** A small `USTRUCT` with an enum and parameters is easy to store, copy, and inspect. A class hierarchy of command objects (`UObject` subclasses with an `Execute` function) lets each command carry its own logic and lets designers make new ones without touching a switch. A lambda (`TFunction`) is the lightest form, but it cannot be listed, saved, or shown to anyone.

**The Unreal forms.** **Input Actions** separate the player's intent from the key. **Gameplay Abilities** (the Gameplay Ability System) are requests that can be activated, checked against costs and cooldowns, replicated, and cancelled. The editor's undo is built from transactions (`FScopedTransaction` with `Modify()` on each object changed).

# Example

```cpp
// The target handed in when it runs: one command class, many performers.
UCLASS(Abstract)
class UDojoArenaMoveCommand : public UObject
{
	GENERATED_BODY()

public:
	virtual void Execute(ACharacter* Performer) const PURE_VIRTUAL(UDojoArenaMoveCommand::Execute, );
};

UCLASS()
class UDojoArenaDashCommand : public UDojoArenaMoveCommand
{
	GENERATED_BODY()

public:
	virtual void Execute(ACharacter* Performer) const override
	{
		if (IsValid(Performer)) Performer->LaunchCharacter(Performer->GetActorForwardVector() * DashSpeed, true, false);
	}

	UPROPERTY(EditAnywhere, Category = "Dash")
	float DashSpeed = 1200.f;
};
```

# Questions

```yaml
- id: plan-and-rewind
  type: which-pattern
  prompt: "In an arena trap designer, every placement, rotation, and removal must be undoable, and a playtest recording must be able to rebuild the layout step by step. Which pattern?"
  choices: [command, observer, prototype, state]
  answer: command
  distractorNotes:
    - choice: observer
      why: Announcing each change lets others react, but the changes still vanish once made; nothing can take them back.
    - choice: prototype
      why: Cloning a template trap helps create traps, not record and reverse the edits that placed them.
    - choice: state
      why: The tool may have modes, but the need here is to keep each edit as something that can be reversed and replayed.
  explanation: Each edit becomes a value with enough information to apply it again and take it back.
- id: same-moves-any-body
  type: which-pattern
  prompt: "A tutorial ghost, the player, and a sparring AI should all be able to perform the same set of moves, chosen by different sources. Which pattern lets one set of moves serve all three?"
  choices: [state, command, singleton, update-method]
  answer: command
  distractorNotes:
    - choice: state
      why: State changes how one object reacts in different modes; here the question is who produces the moves, not how a body reacts.
    - choice: singleton
      why: A global move manager would still need to know each performer; it does not make moves into transferable values.
    - choice: update-method
      why: Each body will tick, but ticking does not decide what produces the moves or let them be swapped.
  explanation: Moves as command objects with the performer handed in let any source drive any body.
- id: spot-undo-bypass
  type: spot-the-bug
  prompt: This course planner keeps a history so designers can undo. Which line makes a change undo can never see?
  code: |
    void ADojoArenaPlanner::RandomizeSlot(int32 Slot)
    {
    	const EDojoArenaObstacle Pick = PickRandomObstacle();
    	Slots[Slot] = Pick;
    	RefreshLabel();
    }
  bugLine: 4
  fix: Build an edit with the slot's before and after and send it through the planner's Perform, like every other change.
  explanation: Undo only knows about changes recorded in the history; writing the slot directly skips it.
- id: fill-before
  type: fill-blank
  prompt: "To be taken back, an edit that changes one slot records what stood in the slot ___ the edit, as well as what it put there."
  acceptedAnswers: [before]
  explanation: Undo puts the recorded before back; redo puts the recorded after back. Nothing else about the course needs saving.
- id: explain-command
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Command pattern.
  modelAnswer: It turns a request into a value or object holding what to do and what it needs, so the request can be stored, passed to another performer, run later, repeated, or undone.
  rubric:
    - Says the request becomes an object or value
    - Names at least one thing that enables, such as queuing, replay, or undo
  explanation: The request stops being a moment and becomes a thing.
```
