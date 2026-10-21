---
id: p4-double-buffer-card
title: Two copies and one handover
order: 3
kind: concept
difficulty: 2
patterns: [double-buffer]
skills: [double-buffer]
terms: [tarray, render-thread, tick]
prerequisites: [p4-straw-fire]
xp: 25
estimatedMinutes: 8
concepts:
  - Double Buffer keeps a finished copy for readers and a second copy for writers, and swaps them in one move
  - All reads go to the finished copy, all writes to the other, and the swap happens at one chosen point
  - A swap trades storage, not contents, so it costs the same however big the state is
  - It costs a second copy of the state and only pays when partial changes or walk order really hurt
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the straw floor is 12 by 8 squares. A designer makes it 120 by 80. How much longer does the Swap at the end of each step take?"
choices:
  - About a hundred times longer, one square at a time
  - About ten times longer
  - No longer; the two arrays trade their storage, not their squares
  - It depends on how many squares are burning
answerIndex: 2
explanation: Swapping two TArrays exchanges what each one points at, so it takes the same tiny time whatever the size. The walk that builds the next floor is what grows with the floor.
```

# Card

What you built on the straw floor is the **Double Buffer** pattern. State that is changed piece by piece gets two copies. Readers, and every rule that looks at neighbors, use the **current** copy, which stays finished and still. Writers fill the **next** copy. When the next copy is complete, one **swap** makes it current, and the old current becomes the copy the following round writes into.

**Why it pays.** Readers never see half a change: they see the old state or the new one, never a blend. And a step whose rules read other entries stops depending on the order it visits them, because nothing it reads changes until the step is over.

**Swap or copy.** Exchanging the two arrays (`Swap` on `TArray`, or swapping two pointers) takes the same tiny time however big the state is; nobody may keep a reference into either array across the swap. Copying the current state into the next instead lets a step start from the latest state and change only a few entries, at the cost of time that grows with the size of the state.

**One swap point.** The handover happens at one moment you choose: the end of a step, the start of a frame. Swapping wherever a writer happens to finish brings the half-done reads back.

**Where the copies live.** One big buffer (a grid, a table) swaps in one call. State spread over many objects needs every object visited to swap, which costs a walk.

**The Unreal form.** The renderer draws from render-side copies of each component while the game thread builds the next frame. Gameplay reads physics results from the last finished physics step. In your own code: two `TArray` copies, read from one, write to the other, `Swap` at a fixed point.

# Example

```cpp
// A crowd's mood spreads to neighbors: every agent reads Moods, every write goes to NextMoods.
void ADojoArenaCrowdMood::Step()
{
	NextMoods.SetNum(Moods.Num());

	for (int32 Seat = 0; Seat < Moods.Num(); ++Seat)
	{
		const float Left = Moods.IsValidIndex(Seat - 1) ? Moods[Seat - 1] : Moods[Seat];
		const float Right = Moods.IsValidIndex(Seat + 1) ? Moods[Seat + 1] : Moods[Seat];
		NextMoods[Seat] = FMath::Lerp(Moods[Seat], (Left + Right) * 0.5f, Spread);
	}

	// One handover, after every seat has been decided.
	Swap(Moods, NextMoods);
}
```

# Questions

```yaml
- id: rumor-spread
  type: which-pattern
  prompt: "In a market town, rumors pass between neighboring stalls each simulation step. Testers notice rumors race to the east edge in a single step but crawl west one stall at a time, depending on how the stall loop runs. Which pattern fixes the cause?"
  choices: [double-buffer, update-method, observer, dirty-flag]
  answer: double-buffer
  distractorNotes:
    - choice: update-method
      why: Each stall may well update itself, but the bug is that later stalls read changes made earlier in the same step.
    - choice: observer
      why: Announcing the rumor through a delegate still delivers it mid-step, so the order problem stays.
    - choice: dirty-flag
      why: A dirty flag skips recomputing unchanged values; it does not stop a step from reading its own half-finished work.
  explanation: Reading every stall from a finished copy and writing a second one makes the spread the same in every direction.
- id: worker-map
  type: which-pattern
  prompt: "A worker thread rebuilds a danger map of the arena floor, and the game thread reads it every tick. Sometimes guards read a map that is half old and half new. Which pattern fits?"
  choices: [service-locator, double-buffer, event-queue, object-pool]
  answer: double-buffer
  distractorNotes:
    - choice: service-locator
      why: Finding the map through a locator does not stop it being read while it is written.
    - choice: event-queue
      why: Queuing the worker's messages delays them but still leaves the question of which complete map the guards read.
    - choice: object-pool
      why: Reusing map objects saves allocation, not torn reads.
  explanation: The worker fills a back map, then swaps it in at a safe point (with a lock or an atomic exchange across threads), so guards always read a whole map.
- id: spot-held-reference
  type: spot-the-bug
  prompt: This crowd step keeps a reference to one seat's mood to read after the swap. Which line reads the wrong data?
  code: |
    void ADojoArenaCrowdMood::Step()
    {
    	const float& WatchedMood = Moods[WatchedSeat];
    	BuildNextMoods();
    	Swap(Moods, NextMoods);
    	LogMood(WatchedMood);
    }
  bugLine: 6
  fix: Read Moods[WatchedSeat] again after the swap instead of using a reference taken before it.
  explanation: The reference points into the storage that is now NextMoods, so after the swap it shows the old mood, not the current one.
- id: fill-current
  type: fill-blank
  prompt: "In Double Buffer, every read and every rule uses the finished ___ copy, while writes go to the next one."
  acceptedAnswers: [current, front, finished]
  explanation: Readers stay on the current copy until the swap hands them the next one complete.
- id: explain-double-buffer
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Double Buffer pattern.
  modelAnswer: Keep two copies of a piece of state, let all reads use the finished one while writes build the other, and swap them in one move so nobody ever sees a half-made change.
  rubric:
    - Mentions two copies with reads on one and writes on the other
    - Mentions a single swap or handover when the writing is done
  explanation: The swap is what turns many small writes into one visible change.
```
