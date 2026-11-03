---
id: p17-dirty-flag-when-not
title: When a flag costs more than the sum
order: 6
kind: concept
difficulty: 2
patterns: [dirty-flag]
skills: [dirty-flag, architecture]
terms: [mutable-member, render-state-dirty, tick]
prerequisites: [p17-ladder-refactor]
xp: 25
estimatedMinutes: 8
concepts:
  - When each change can be applied to the answer directly, a running total beats a flag
  - A cheap value costs less to work out than a flag costs to keep right
  - A value built on another remembered value goes stale unless everything built on a changed piece is marked
  - Each path that changes the data has to set the flag, and a flag set on every frame defeats it
  - Deferring the work costs a pause at the read, stale reads from other threads, and unsaved state
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a supply cart's item count goes up by one whenever a crate is loaded and down by one whenever one is unloaded. A teammate proposes a dirty flag so the count is recounted only when it is read. Is that the right tool?"
choices:
  - Yes, any number that is read should have a flag
  - Yes, but only if the count is stored in a TMap
  - No; keep a running count that each load and unload adds to or subtracts from
  - No; recount every frame instead
answerIndex: 2
explanation: Each change can be applied to the answer directly, so there is nothing to refresh later. A running count has no flag to forget.
```

# Card

A flag is a way to avoid recomputing, and it has a price. Leave it out in these cases.

**When a running total is easy.** If each change can be applied to the answer directly, such as adding a crate to a count or a weight to a total, do that. It is cheaper than a flag, it is always right, and there is no path that can forget to set anything. The flag earns its keep when a change cannot be applied that way, like the best three of a list, where removing a score means searching again.

**When the value is cheap.** Adding two numbers costs less than keeping a stored copy, a flag, and every function that sets it. A flag also adds a bug path. Measure before caching something that takes a few instructions.

**A value built on another remembered value.** If a joint's position is remembered, and a child's position is built from it, then a flag on the joint that moved is not enough: the child's remembered position is old too, and so is everything built on the child. Mark everything that depends on a changed piece, or have the read check the piece it is built on. A flag for each piece, set only on the piece that changed, leaves everything above it quietly out of date.

**A path that forgets.** Each function that changes the data has to set the flag. One direct write to a field, or a second way to change it such as a timer that expires a buff, leaves a stale answer. Keep the data private and change it only through a few functions that set the flag.

**A flag set on every frame.** A flag that is set on every tick, for example marking a component's render state dirty although nothing changed, does the recompute every frame anyway and adds the flag on top. Mark only when something really changed.

**A flag that is never cleared.** If the recompute forgets to clear the flag, every read recomputes. The counter you built in this world shows it at once.

**When deferring costs too much.** The read after a change pays for the work, which can be a visible hitch if the work is heavy and the moment is bad. Another thread that reads the remembered value while the game thread refreshes it can see half an update. And when the flag stands for unsaved work, as a dirty package does, a crash before the refresh loses it.

**When memory is the scarcer thing.** The remembered answer takes room. If the answer is large and the time is cheap, work it out again.

# Example

```cpp
// Right-sized: each load or unload adds to the answer directly, so there is nothing to refresh later.
void ADojoCart::Load(int32 Crates)
{
	CrateCount += Crates;
}
```

# Questions

```yaml
- id: when-not-running-total
  type: multiple-choice
  prompt: "Which of these is the best fit for a running total instead of a flag?"
  choices:
    - The number of crates on a cart, changed one at a time
    - The sum of the best three bout scores
    - A joint's position in a tower of joints
    - The shortest path across a changing map
  answerIndex: 0
  explanation: Each load or unload can be added to or taken from the count directly. The other three are results that must be worked out again from the data after a change.
- id: when-not-tree
  type: multiple-choice
  prompt: "Each joint of a tower keeps its position, with a flag for each joint. The base moves. Which joints must be marked out of date?"
  choices:
    - Only the base
    - The base and every joint that hangs from it
    - Only the joint that is read next
    - Every joint in the world
  answerIndex: 1
  explanation: A joint's kept position is built from its parent's, so everything beneath the base is old once the base moves. Marking only the base leaves its children reporting the old place.
- id: spot-flag-every-update
  type: spot-the-bug
  prompt: A screen shows the guard rating each frame. Which line defeats the flag?
  code: |
    void UDojoGuardScreen::Update()
    {
    	Guard->MarkOutOfDate();
    	ShowNumber(Guard->GetGuard());
    }
  bugLine: 3
  fix: Mark the guard out of date only in the functions that change its parts, never on every update.
  explanation: Marking it on every update makes every read recompute, which is the work the flag was there to avoid.
- id: when-not-thread
  type: multiple-choice
  prompt: "Another thread reads a remembered value while the game thread is refreshing it. What can go wrong?"
  choices:
    - Nothing; reads are always safe
    - The value is refreshed twice
    - The flag is cleared early on purpose
    - The reader can see a half-updated value or a flag that disagrees with it
  answerIndex: 3
  explanation: The refresh writes the value and the flag in two steps, so a reader in between sees them out of step unless access is protected.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when a dirty flag is the wrong choice.
  modelAnswer: When each change can be applied to the answer directly with a running total, when the value is cheap to work out, or when the flag cannot be kept right, because a change path forgets it or a value built on the changed piece is left old.
  rubric:
    - Names a case such as a running total being easy, a cheap value, or a flag that cannot be kept right
    - Says what to do instead or why the flag fails, such as a running total or marking everything built on a changed piece
  explanation: Use a flag for results that cannot be updated in place, and only when every change is certain to set it.
```
