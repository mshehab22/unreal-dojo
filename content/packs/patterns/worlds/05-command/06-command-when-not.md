---
id: p5-command-when-not
title: When a plain call should stay a call
order: 6
kind: concept
difficulty: 2
patterns: [command]
skills: [command, architecture]
terms: [tweakobjectptr, gas, input-action, tarray]
prerequisites: [p5-referee-refactor]
xp: 25
estimatedMinutes: 6
concepts:
  - If nothing about what, who, or when needs to vary, a direct call is clearer
  - Undo is all or nothing, so any change made around the history breaks it
  - A new command after an undo must end the old future, or redo resurrects abandoned edits
  - Abilities and input already have engine forms; do not build a second system beside them
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a door in the arena opens when its own lever is pulled, and nothing else will ever open it, delay it, record it, or undo it. A teammate wraps the open in a command object pushed into a queue that runs next frame. What did that buy?"
choices:
  - Rebinding, replay, and undo for free
  - Nothing that is needed, at the cost of a class, a queue, and a frame of delay
  - Faster door opening
  - Thread safety
answerIndex: 1
explanation: Command earns its cost when something about what, who, or when has to vary. Here nothing does, so the plain call is clearer and immediate.
```

# Card

A command is a layer between asking and doing, and lesson zero's rule applies: it has to earn its place.

**Nothing varies.** If the same code always does the same thing to the same target at the moment it is asked, a function call says it directly and shows up in "find references". Wrapping it in a command class adds a type to read and, if queued, a delay.

**Undo is all or nothing.** An undo history only knows about changes that went through it. One shortcut that edits the state directly (a randomize button, a script, a cheat) and undo starts restoring the wrong things. If you cannot route every change through commands, do not promise undo.

**A new command ends the old future.** After an undo, the commands that were taken back can be redone, but only until something new happens. A new command must cut them off; otherwise redo brings back edits from a line of history the player abandoned.

**Snapshots have their place.** When a change is too tangled to describe as a small value, saving a whole copy and restoring it is simpler and safer, as long as nothing outside the history touches that state in between.

**The engine already has one.** Player input is already separated from keys by Input Actions; player and AI abilities with costs, cooldowns, prediction, and replication are the Gameplay Ability System's job; editor undo is the transaction system. Build your own commands for what those do not cover, not a second copy of them.

**Continuous input is not a stream of objects.** Creating a new command every frame for a held stick wastes allocations; pass the axis value directly, or reuse one command that reads it.

# Example

```cpp
// Plain and right: one lever, one door, nothing to queue, record, or undo.
void ADojoArenaLever::Pull()
{
	bPulled = true;

	if (IsValid(Door)) Door->Open();
}
```

# Questions

```yaml
- id: when-not-fixed
  type: multiple-choice
  prompt: "Which of these needs Command least?"
  choices:
    - A build phase where the player can take back every placement before the wave starts
    - A replay system that re-runs a match from recorded inputs
    - A gate that always opens when its own pressure plate is stepped on, and nothing else ever opens it
    - An AI and the player driving the same set of moves
  answerIndex: 2
  explanation: The gate's what, who, and when never vary, so a direct call is all it needs. The others need actions as values to undo, replay, or swap the source.
- id: when-not-gas
  type: multiple-choice
  prompt: "Your game already uses the Gameplay Ability System for player and AI abilities, with costs and cooldowns. A teammate proposes a separate command queue for the same abilities. What is the better call?"
  choices:
    - Build the queue; two systems are safer than one
    - Use the ability system's own activation and cancel, and build commands only for what it does not cover
    - Replace the ability system with the queue
    - Run both and compare results each frame
  answerIndex: 1
  explanation: Abilities are already requests the engine can activate, check, replicate, and cancel. A second system beside them doubles the code and the bugs.
- id: spot-redo-tail
  type: spot-the-bug
  prompt: This history should let a new edit after an undo end the edits that were taken back. Which line leaves them in place?
  code: |
    void ADojoArenaPlanner::Perform(const FDojoArenaEdit& Edit)
    {
    	History.Insert(Edit, AppliedCount);
    	AppliedCount++;
    	Apply(Edit);
    }
  bugLine: 3
  fix: Cut the history back to AppliedCount first, then add the new edit at the end.
  explanation: Inserting keeps the taken-back edits after the new one, so a later redo would apply an edit from a line the player abandoned.
- id: when-not-held-stick
  type: multiple-choice
  prompt: "A held thumbstick moves a camera every frame. Someone creates a new move command object each frame and queues it. What is the better shape?"
  choices:
    - Keep it; one object per frame is cheap
    - Read the axis value and move the camera directly each frame, or reuse one command that reads the value
    - Queue the commands and run them all at the end of the match
    - Make each command a UObject so the garbage collector handles them
  answerIndex: 1
  explanation: A continuous value read every frame needs no history; making a new object per frame only adds allocation.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when a direct call is better than a command.
  modelAnswer: When nothing about what happens, to whom, or when needs to change, and nothing will be queued, recorded, sent, or undone, a direct call is simpler and immediate.
  rubric:
    - Names the fixed what, who, or when, or the absence of queuing, replay, or undo
    - Mentions the cost avoided, such as extra types, indirection, or delay
  explanation: The command layer is a bet that one of those will need to vary.
```
