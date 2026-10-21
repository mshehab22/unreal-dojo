---
id: p4-double-buffer-when-not
title: When one copy is enough
order: 6
kind: concept
difficulty: 2
patterns: [double-buffer]
skills: [double-buffer, architecture]
terms: [tarray, tick, multicast-delegate]
prerequisites: [p4-standings-refactor]
xp: 25
estimatedMinutes: 6
concepts:
  - When nothing reads mid-change and no rule reads other entries, one copy is enough
  - When later entries are supposed to see earlier changes, in-place updates are the behavior you want
  - A swapped-in copy holds old data and must be fully overwritten or emptied before reuse
  - A second copy doubles the memory of the state, and a swap that costs more than the writes it protects helps nobody
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: in the arena's relay race, each runner starts the moment the runner before them crosses the line, and all of this is resolved in one pass over the runners in order. Should that pass read a finished copy of last step's positions?"
choices:
  - Yes, every simulation should be double buffered
  - No; each runner is meant to see the change the runner before made in the same pass
  - Yes, because the relay is visible on screen
  - No, because TArray cannot be swapped
answerIndex: 1
explanation: Here the order is the rule. A finished copy would make every runner wait an extra step for a handover that should be instant.
```

# Card

A second copy is a bet like any other layer. It pays when readers would otherwise see half a change, or when rules read other entries and the walk order would leak into the result. Otherwise it is extra memory and one more thing to keep in step.

**Nobody reads mid-change, and no rule reads its neighbors.** A list of timers that each count down on their own needs one copy. Each entry's new value depends only on its own old value, so order cannot leak in.

**The order is the point.** A relay handover, a chain reaction meant to sweep through a row in one go, a queue of moves resolved one after another so two units cannot step into the same square: in these, later entries are supposed to see earlier changes. A finished copy would turn an instant chain into a slow crawl.

**Readers need the change right away.** Code that writes a value and expects the next line, or another system later in the same frame, to see it will read the old copy until the swap. Buffer only state whose readers are happy to see it one handover late.

**The copy you get back is stale.** After a swap, the copy you will write into next holds the state you handed over the time before. A step that overwrites every entry never notices; anything that adds to its entries (counts, totals, lists) must empty it first, or old values return.

**The state is huge, or the swap is costly.** Two copies of a very large grid double its memory. And if handing over means copying element by element every frame, the copy can cost more than the writes it protects; swap storage, or buffer only the part that is read mid-change.

# Example

```cpp
// One copy is right here: each cooldown depends only on its own old value, and nothing reads mid-update.
void ADojoArenaCooldowns::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	for (float& SecondsLeft : CooldownSeconds)
	{
		SecondsLeft = FMath::Max(0.f, SecondsLeft - DeltaSeconds);
	}
}
```

# Questions

```yaml
- id: when-not-independent
  type: multiple-choice
  prompt: "Which of these needs a second copy least?"
  choices:
    - A heat grid where each tile cools toward the average of its neighbors
    - A worker thread building a navigation map the game thread reads every frame
    - A list of ability cooldowns that each count down on their own
    - A crowd where each fan's excitement copies the fans next to them
  answerIndex: 2
  explanation: Each cooldown reads only itself, so nothing can see a neighbor's new value and nobody reads mid-update. The other three read neighbors or are read while being written.
- id: when-not-chain
  type: multiple-choice
  prompt: "A row of arena torches should all light in a single frame when the first one is lit, like a fuse. What does double buffering the torch states do to that?"
  choices:
    - Nothing, the row still lights at once
    - It turns the instant fuse into a wave that moves one torch per step
    - It lights the row in reverse
    - It stops the first torch from lighting
  answerIndex: 1
  explanation: With a finished copy, each torch only sees its neighbor lit after a handover, so the chain takes one step per torch. When the instant chain is the design, the in-place pass is right.
- id: spot-stale-totals
  type: spot-the-bug
  prompt: Damage numbers pile up in a back copy during the frame and are swapped to the front for the floating text. Which line lets damage from two frames ago come back?
  code: |
    void ADojoArenaDamageText::BeginFrame()
    {
    	Swap(ShownDamage, IncomingDamage);
    	ShownCount = ShownDamage.Num();
    	IncomingDamage.Append(PendingEcho);
    }
  bugLine: 5
  fix: Empty IncomingDamage right after the swap, then add any pending entries to the empty array.
  explanation: After the swap, IncomingDamage holds the list shown the frame before; appending to it keeps those old numbers in the next frame's list.
- id: when-not-immediate
  type: multiple-choice
  prompt: "A pickup writes the player's new ammo count, and the weapon fires later in the same frame using that count. The ammo is double buffered with a swap at frame start. What happens?"
  choices:
    - The weapon sees the new ammo
    - The weapon sees the old ammo until the next frame's swap
    - The engine swaps automatically after each write
    - The write is lost
  answerIndex: 1
  explanation: Readers see the current copy until the swap, so state that must be read right after it is written should not be buffered.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when a second copy is not worth it.
  modelAnswer: When no rule reads other entries and nothing reads the state mid-change, or when later entries are meant to see earlier changes, one copy is simpler and cheaper.
  rubric:
    - Names independent updates, nobody reading mid-change, or order being the intended behavior
    - Mentions the cost avoided, such as memory or the extra copy to manage
  explanation: "The lens from lesson zero again: a layer earns its place only when the problem it solves is really there."
```
