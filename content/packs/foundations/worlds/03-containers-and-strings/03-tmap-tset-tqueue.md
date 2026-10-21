---
id: f3-tmap-tset-tqueue
title: TMap, TSet, and TQueue for lookups and waiting lines
order: 3
kind: concept
difficulty: 2
patterns: []
skills: [containers]
terms: [tmap, tset, tqueue, tarray]
prerequisites: [f3-score-board]
xp: 25
estimatedMinutes: 7
concepts:
  - TMap finds a value by its key without searching every entry
  - TSet keeps each value once
  - TQueue hands items out first in, first out, and is not a UPROPERTY
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: `TMap<FName, int32> Best;` holds nothing for the key Dee. What happens on `int32 Score = Best[TEXT(\"Dee\")];`?"
choices:
  - Score is 0
  - Score is whatever was in memory
  - The engine asserts, because the key is not in the map
  - A new entry for Dee is added with 0
answerIndex: 2
explanation: The square brackets assume the key exists and assert when it does not; Find is the safe way to ask.
```

# Card

A `TArray` answers "what is at position 3". When the question is "what belongs to this key", search time matters, and a map is the tool.

`TMap<Key, Value>` stores pairs and finds a value from its key in about the same time however many entries it holds.

- `Add(Key, Value)` sets the value for a key, replacing an old one.
- `Find(Key)` returns a pointer to the value, or nullptr when the key is missing. It is the safe read.
- `FindOrAdd(Key)` returns a reference, adding a default value first when the key is missing.
- `Map[Key]` asserts when the key is missing; use it only when you know the key is there.
- `Contains(Key)`, `Remove(Key)`, and `Num()` do what they say. A ranged for loop gives `TPair` entries with `.Key` and `.Value`.

`TSet<T>` keeps each value once: adding a value that is already there changes nothing. Use it for "has this happened" questions, such as which targets a player has already broken.

`TQueue<T>` is a waiting line: `Enqueue` at the back, `Dequeue` from the front. It is safe to use from two threads and cannot be a `UPROPERTY`, so it must never hold UObject pointers that need to stay alive. For UObjects in a line, use a `UPROPERTY` TArray and take from the front.

Maps and sets do not keep a meaningful order. When you need "the highest" or "sorted by name", loop and compare, or copy into an array and sort it.

# Example

```cpp
// How many times each lane's target has been hit, by lane name.
UPROPERTY(VisibleInstanceOnly, Category = "Lanes")
TMap<FName, int32> HitsPerLane;

// Lanes that have been cleared at least once; adding twice changes nothing.
UPROPERTY(VisibleInstanceOnly, Category = "Lanes")
TSet<FName> ClearedLanes;

void ADojoF3LaneTally::CountHit(FName Lane)
{
	int32& Hits = HitsPerLane.FindOrAdd(Lane);
	Hits++;

	if (Hits >= HitsToClear) ClearedLanes.Add(Lane);
}

int32 ADojoF3LaneTally::GetHits(FName Lane) const
{
	const int32* Hits = HitsPerLane.Find(Lane);
	return Hits ? *Hits : 0;
}
```

# Questions

```yaml
- id: pick-container
  type: multiple-choice
  prompt: "A quest log must answer quickly whether an item id has ever been picked up, and the same id may be reported many times. Which container fits?"
  choices: [TArray, TSet, TQueue, TMap from id to id]
  answerIndex: 1
  explanation: A set keeps each id once and answers Contains without walking every entry.
- id: fill-find
  type: fill-blank
  prompt: "To read a TMap value safely when the key may be missing, call ___ and check the pointer it returns."
  acceptedAnswers: [Find, Find(), Map.Find]
  explanation: Find returns nullptr for a missing key instead of asserting.
- id: spot-bracket-read
  type: spot-the-bug
  prompt: This asserts the first time a new lane name is reported. Which line is wrong?
  code: |
    int32 ADojoF3LaneTally::GetHits(FName Lane) const
    {
    	return HitsPerLane[Lane];
    }
  bugLine: 3
  fix: Use Find, and return 0 when it gives back nullptr.
  explanation: The square brackets assume the key exists.
- id: queue-uobjects
  type: multiple-choice
  prompt: "Why should a TQueue not hold the arrows a bow is waiting to fire?"
  choices:
    - TQueue cannot hold pointers at all
    - A TQueue cannot be a UPROPERTY, so the garbage collector never sees the arrows it holds
    - TQueue only works on a background thread
  answerIndex: 1
  explanation: Without reflection, the references are invisible; a UPROPERTY TArray used front first is the safe line for UObjects.
- id: explain-map-speed
  type: explain-in-one-sentence
  prompt: In one sentence, say when a TMap beats a TArray of pairs.
  modelAnswer: When you look values up by key often, because a map finds a key without walking every entry while an array must be searched one element at a time.
  rubric:
    - Mentions looking up by key
    - Contrasts it with searching every element of an array
  explanation: For a handful of entries either is fine; the difference grows with size and with how often you ask.
```
