---
id: p17-dirty-flag-card
title: Remember it, mark it old, refresh it when asked
order: 3
kind: concept
difficulty: 2
patterns: [dirty-flag]
skills: [dirty-flag, performance]
terms: [render-state-dirty, scene-component]
prerequisites: [p17-guard-rating]
xp: 25
estimatedMinutes: 9
concepts:
  - A dirty flag has primary data, a cached derived value, a flag that changes set, and a recompute that clears it
  - Each change to the source data has to raise the flag, which a few narrow functions can guarantee
  - The flag can be cleaned when the value is asked for, at a checkpoint, or on a timer, and each has a price
  - The flag can cover everything or each piece, trading memory and bookkeeping against wasted work
  - Unreal's own components, packages, widgets, and replication use dirty flags everywhere
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: five different pieces of code change a fighter's gear and buffs. Which design makes it hardest to forget to mark the guard rating out of date?"
choices:
  - Each piece of code that changes a part sets the flag itself afterwards
  - A comment beside the guard member saying that the flag must be set by hand
  - Private parts, changed only through a few functions that each set the flag
  - A timer that marks the rating out of date every few seconds, whatever changed
answerIndex: 2
explanation: If the only way to change a part is a function that also sets the flag, the flag cannot be forgotten. Setting it from outside depends on every caller remembering.
```

# Card

What you built for the guard rating is the **Dirty Flag** pattern. Some data is derived from other data by work that costs something. The derived value is kept next to a flag. Changing the data sets the flag, which means the kept value is out of date. Asking for the value checks the flag: if it is clear, the kept value is returned; if it is set, the value is worked out again, stored, and the flag cleared.

**Four parts.**

- **Primary data.** The base guard, the worn items, the buffs: what really changes.
- **Derived data.** The rating, worked out from them by something that costs work.
- **The flag.** Raised whenever the primary data is edited and lowered once the derived value has been refreshed.
- **A narrow way in.** The primary data is private, and a few functions are the only ones that change it, each setting the flag. This is what keeps the pattern safe: a single path that forgets the flag leaves an old answer that nothing marks.

**When the flag is cleaned.**

- **When the value is asked for.** Work is never done for a value nobody reads. The read that follows a change pays for the refresh, and a heavy refresh can be felt as a hitch.
- **At a checkpoint.** Refresh at a loading screen, between rounds, or when a menu opens. A moment the player already expects to wait covers the cost, but nothing promises one arrives before the next read.
- **On a timer, in the background.** You choose how often it runs, but it may refresh data that has hardly changed, and a change that lands in the middle of a refresh needs handling.

**How fine the flag is.** One flag for the whole value is cheap in memory and wasteful when a small part changes. One flag for each piece processes only what changed, at the price of more flags and more bookkeeping for each.

**Unreal's own flags.**

- A scene component keeps its component-to-world transform ready and recalculates it when something has changed: `bComponentToWorldUpdated` and `ConditionalUpdateComponentToWorld`.
- An actor component calls `MarkRenderStateDirty`, `MarkRenderTransformDirty`, or `MarkRenderDynamicDataDirty` to tell the engine what to resend to the renderer, which does the work later.
- An asset package carries a dirty bit, set by `MarkPackageDirty` and read by `IsDirty`, that decides what the editor offers to save.
- Slate widgets call `Invalidate` with a reason, and layout is redone once for the frame.
- Push-model replication lets a property that is set up as push based be marked dirty with the `MARK_PROPERTY_DIRTY` macros, and only the marked ones among those are checked for sending.

**What it is not for.** If each change can be applied to the answer directly, as adding an item's weight to a running total, keep the running total. It is simpler and has no flag to forget.

# Example

```cpp
void UDojoGuard::SetBaseGuard(int32 NewBase)
{
	if (NewBase == BaseGuard) return;

	BaseGuard = NewBase;
	bGuardDirty = true;
}

int32 UDojoGuard::GetGuard() const
{
	if (bGuardDirty)
	{
		CachedGuard = BaseGuard + SumOfGear() + SumOfBuffs();
		bGuardDirty = false;
	}
	return CachedGuard;
}
```

# Questions

```yaml
- id: four-parts
  type: multiple-choice
  prompt: "Which list names the parts of a dirty flag?"
  choices:
    - A producer, a consumer, a queue, and a lock to protect the queue
    - A base class, a component, a delegate, and a timer to drive all three
    - An interface, several providers, a locator, and a null object
    - Primary data, a derived value, a flag, and a narrow way in
  answerIndex: 3
  explanation: The flag links the two kinds of data. The narrow way in is what stops a change from slipping past it.
- id: fill-mark-dirty
  type: fill-blank
  prompt: "An actor component tells the engine its render state must be rebuilt with MarkRenderState___()."
  acceptedAnswers: [Dirty]
  explanation: MarkRenderStateDirty sets a flag on the component, and the renderer rebuilds its state later, once, instead of at every change.
- id: when-cleaned
  type: multiple-choice
  prompt: "Refreshing a dirty value during a loading screen has one weakness. What is it?"
  choices:
    - The refresh is wasted on data that nobody reads
    - A read can come before the loading screen does
    - Loading screens run on a different machine from the game
    - The flag cannot be set while a level is loading
  answerIndex: 1
  explanation: A checkpoint hides the work, but you cannot promise it will come before the next read, so something must still handle a stale value.
- id: fine-or-coarse
  type: multiple-choice
  prompt: "One flag covers the whole fog-of-war grid. What is the cost?"
  choices:
    - One changed cell makes the whole grid be reworked
    - Cells cannot be changed at all
    - The grid needs more memory than one flag for each cell
    - The flag cannot be cleared
  answerIndex: 0
  explanation: A coarse flag is small and simple, and any change reworks everything it covers. A flag for each cell works only on what changed and costs more flags.
- id: spot-missed-flag
  type: spot-the-bug
  prompt: The guard rating is remembered with a flag. Which line leaves a stale rating?
  code: |
    void UDojoGuard::SetBaseGuard(int32 NewBase)
    {
    	BaseGuard = NewBase;
    }
  bugLine: 3
  fix: Set the dirty flag here as well, so the next read works the rating out again.
  explanation: The part changed but nothing marked the rating old, so GetGuard keeps returning the answer from the old base.
- id: explain-dirty-flag
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Dirty Flag pattern.
  modelAnswer: A derived value is kept with a flag that every change to its source data sets, and the value is worked out again, and the flag cleared, only when it is asked for while the flag is set.
  rubric:
    - Says the derived value is kept or cached with a flag
    - Says changes set the flag and the value is recomputed only when asked and the flag is set
  explanation: Remember the answer, mark it old on a change, and refresh it on demand.
```
