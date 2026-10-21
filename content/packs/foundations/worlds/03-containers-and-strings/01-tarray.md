---
id: f3-tarray
title: TArray, the container you will use most
order: 1
kind: concept
difficulty: 1
patterns: []
skills: [containers]
terms: [tarray, uproperty, tobjectptr]
prerequisites: [f2-target-rack]
xp: 20
estimatedMinutes: 6
concepts:
  - TArray is an ordered, growable list stored in one block of memory
  - Adding at the end is cheap; removing from the front shifts everything after it
  - A ranged for loop must not add to or remove from the array it walks
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: `TArray<int32> Scores = { 10, 20, 30 };` then `Scores.RemoveAt(0);`. What is `Scores[0]` now?"
choices:
  - "10, because RemoveAt only marks the slot as empty"
  - "20, because everything after the removed element moves down one place"
  - "30, because the last element fills the hole"
  - "It crashes, because index 0 no longer exists"
answerIndex: 1
explanation: RemoveAt keeps the order by shifting every later element down, so the old second element is now first.
```

# Card

`TArray<T>` is Unreal's list: elements in order, in one block of memory, growing as you add. You have already used it for targets on a keeper and dummies on a spawner.

- `Add(Value)` appends at the end and is cheap. `Insert(Value, Index)` puts it anywhere, moving later elements up.
- `Num()` is the count; `Scores[Index]` reads one element, and an index outside 0 to `Num() - 1` stops the program with an assert, so check with `IsValidIndex(Index)` when unsure.
- `RemoveAt(Index)` keeps the order and shifts everything after it down. That is cheap for the last element and costly for the first of a long array. `RemoveAtSwap(Index)` moves the last element into the hole instead: fast, but the order changes.
- `Remove(Value)` removes every element equal to Value; `Contains(Value)` and `Find(Value)` search from the front, one element at a time.
- `Empty()` clears it; `Reset()` clears it but keeps the memory for reuse.

Walk an array with a ranged for loop: `for (const int32 Score : Scores)`. Inside that loop, never add to or remove from the same array: the engine reports it with an ensure ("Array has changed during ranged-for iteration!"), play goes on, and the loop quietly skips the element that moved into the removed one's place. To remove while walking, loop over indexes backward, or use `RemoveAll` with a condition.

As a `UPROPERTY`, an array of UObject pointers is followed by the garbage collector entry by entry, and an array of plain values shows up in the Details panel with add and remove buttons.

# Example

```cpp
// Keeps the last few lap times, oldest first.
void ADojoF3LapClock::AddLap(float Seconds)
{
	LapTimes.Add(Seconds);

	if (LapTimes.Num() > MaxLaps)
	{
		LapTimes.RemoveAt(0);
	}
}

// Drops every lap slower than the limit, walking backward so removals never skip an element.
void ADojoF3LapClock::DropSlowLaps(float Limit)
{
	for (int32 Index = LapTimes.Num() - 1; Index >= 0; --Index)
	{
		if (LapTimes[Index] > Limit) LapTimes.RemoveAt(Index);
	}
}
```

# Questions

```yaml
- id: swap-or-shift
  type: multiple-choice
  prompt: "A list of 500 active bullets is checked every frame and their order does not matter. Which removal fits best when one expires?"
  choices: [RemoveAt, RemoveAtSwap, Empty, Remove with the bullet's value]
  answerIndex: 1
  explanation: RemoveAtSwap fills the hole with the last element, so nothing else moves; the order is lost, which is fine here.
- id: fill-count
  type: fill-blank
  prompt: "To get how many elements a TArray named Scores holds, call Scores.___()."
  acceptedAnswers: [Num]
  explanation: Num returns the count; the last valid index is Num minus 1.
- id: spot-remove-in-loop
  type: spot-the-bug
  prompt: This logs an ensure about the array changing as soon as a broken target is found, and a second broken target right after it is never removed. Which line is wrong?
  code: |
    for (ADojoF1PopupTarget* Target : Targets)
    {
    	if (Target->GetState() == EDojoF1TargetState::ETS_Broken)
    	{
    		Targets.Remove(Target);
    	}
    }
  bugLine: 5
  fix: Remove broken targets after the loop, or walk the indexes backward and use RemoveAt, or use RemoveAll with a condition.
  explanation: A ranged for loop may not change the array it is walking; the engine flags it with an ensure, and the element that slides into the removed slot is skipped.
- id: index-check
  type: multiple-choice
  prompt: "Keys 1 to 6 hit Targets[Key - 1], but a designer only filled four entries. What keeps key 6 from asserting?"
  choices:
    - "Checking Targets.IsValidIndex(5) before reading Targets[5]"
    - "Checking Targets[5] != nullptr"
    - "Using RemoveAtSwap instead of RemoveAt"
  answerIndex: 0
  explanation: Reading an index past the end asserts before any null check could run; IsValidIndex asks first.
- id: explain-removeat-cost
  type: explain-in-one-sentence
  prompt: In one sentence, say why removing the first element of a long TArray costs more than removing the last.
  modelAnswer: The elements live in one block in order, so removing the first one means moving every later element down a place, while removing the last moves nothing.
  rubric:
    - Mentions that later elements shift or move
    - Contrasts the first and the last element
  explanation: That is also why RemoveAtSwap exists for lists whose order does not matter.
```
