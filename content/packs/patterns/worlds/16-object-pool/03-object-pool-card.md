---
id: p16-object-pool-card
title: A fixed set, lent out and taken back
order: 3
kind: concept
difficulty: 3
patterns: [object-pool]
skills: [object-pool, performance]
terms: [object-pool, free-list, niagara-component-pool, tarray, world-subsystem, spawnactor]
prerequisites: [p16-rocket-rack]
xp: 25
estimatedMinutes: 10
concepts:
  - Object Pool makes a fixed set of objects up front and reuses them, instead of creating and destroying one for every use
  - Every pool answers four questions, which ones are free, how one goes into use, how it comes back, and what happens when none is free
  - Whatever a use changed, the next use must not see, so the pool has one clear reset that every loan goes through
  - A pool that is full refuses, recycles the oldest, or grows within a limit, and each choice shows in the game
  - In Unreal the cost a pool saves is mostly spawning and destroying actors, and Niagara can pool its own components when you ask it to
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the rack holds 4 rockets and all 4 are in the air when the music calls for a fifth. Which of these could a rack reasonably do?"
choices:
  - Only crash, because a fixed set of rockets can never be used beyond its size
  - Spawn a brand new rocket for this beat and destroy it again right away
  - Wait inside Acquire until one of the rockets comes back from its flight
  - Skip the shot, recycle the oldest rocket in the air, or grow within a limit
answerIndex: 3
explanation: Every fixed set reaches its limit sometime. Skipping, recycling the oldest, and growing a little are all fair answers with different costs, so the rack's designer picks one on purpose. Waiting inside a function would freeze the game.
```

# Card

The rocket rack from the last quest is the **Object Pool** pattern: make a fixed set of objects once, lend one out when it is needed, and take it back when it is done, instead of creating and destroying one for every use. The objects are the same ones all show long; only who is using them changes.

**Four questions every pool answers.**

- *Which ones are free?* The rack keeps two lists, resting and lent, and the free ones are the resting list.
- *How does one go into use?* Take a free one, reset it, and bring it into play.
- *How does it come back?* Take it out of play and mark it free, once. A second return of the same object would let two users share it.
- *What happens when none is free?* Decided on purpose, below.

**Finding a free one fast.** Searching every slot for a free one gets slower as the pool grows. A **free list** chains the free slots together so the next one is always at hand: each free slot remembers the next free slot, and the pool remembers the first. The rack's resting array, used from its end with `Pop` and `Add`, does the same job for a handful of actors.

**The reset is the whole contract.** A reused object is the same object as last time, so every field its last use changed is still changed. A pool has one reset that every loan goes through, and the reset covers everything a use can change: its position, its speed, whether it already burst. Forgetting one field gives a quiet bug, such as a rocket lent with its last burst still marked, so the show counts a burst nobody saw.

**When the pool is full.** When the music calls for a fifth rocket and all four are in the air, the rack has three honest answers, and its designer picks one on purpose. A pool sized well enough for the common case only has to choose for the rare peak.

- Recycle the oldest: take back the one that has been out longest and use it now. Good when a rocket cut short is less jarring than a beat of the music with no rocket at all.
- Grow, within a limit: spawn one more and keep it. Without a limit, a long fight grows the pool forever and brings back the spawning it was meant to avoid.
- Refuse: no rocket this beat. Fine for things nobody misses, like one spark in a shower.

**In Unreal.** The work a pool saves is mostly spawning and destroying actors, so pools of actors are the common case: projectiles, impact effects, pickups, enemies in waves. Hold the pool in a manager actor or a `UWorldSubsystem`, so it belongs to the world it serves, and keep its actors in `UPROPERTY` arrays, so the garbage collector can see them. Niagara can pool the components of its effects: spawn them with an `ENCPoolMethod` of `AutoRelease` and the engine reuses their components for you, while the default of `None` makes a fresh one every time.

**Not a Flyweight.** Flyweight shares one piece of data among many objects that exist at the same time. A pool reuses whole objects one after another over time. Five hundred rockets on screen at once that share one look are a Flyweight question; three hundred rockets fired one after another from eight actors are a pool.

# Example

```cpp
// A pool that refuses when full: the caller decides what a missing rocket means.
ADojoRocket* UDojoRocketPool::Acquire(const FVector& Where)
{
	if (Resting.Num() == 0) return nullptr;

	ADojoRocket* Rocket = Resting.Pop();
	Lent.Add(Rocket);
	Rocket->ResetForLaunch(); // Every loan goes through the one reset.
	Rocket->SetActorLocation(Where);
	Rocket->SetActorHiddenInGame(false);
	Rocket->SetActorEnableCollision(true);
	Rocket->SetActorTickEnabled(true);
	return Rocket;
}
```

# Questions

```yaml
- id: pool-intent
  type: multiple-choice
  prompt: "What does the Object Pool pattern do?"
  choices:
    - Makes a fixed set of objects up front and reuses them each time
    - Shares one copy of the same data among many objects alive at once
    - Makes sure that only one object of a class can ever exist in the game
    - Delays creating a value until the moment the first caller needs it
  answerIndex: 0
  explanation: A pool trades memory held up front for no creation and destruction during play.
- id: full-policy
  type: multiple-choice
  prompt: "Hit sparks come from a pool of 20. In a big fight a 21st spark is needed. Which choice usually suits sparks best?"
  choices:
    - Grow the pool without any limit until every request has its spark
    - Stop the whole game until one of the sparks comes back to the pool
    - Refuse the spark or recycle the oldest, since one spark goes unnoticed
    - Destroy the whole pool and make a bigger one in the middle of the fight
  answerIndex: 2
  explanation: Sparks are many and brief, so losing or recycling one is invisible. Growing without a limit brings back the spawning the pool exists to avoid.
- id: fill-free-list
  type: fill-blank
  prompt: "A ___ chains the free slots of a pool together, so taking a free one never needs a search."
  acceptedAnswers: [free list, free-list]
  explanation: Each free slot holds the next free slot, and the pool keeps the first one, so taking and returning both take one step.
- id: spot-double-return
  type: spot-the-bug
  prompt: A pool takes rockets back. Which line lets the same rocket be lent to two users at once?
  code: |
    void UDojoRocketPool::Release(ADojoRocket* Rocket)
    {
    	if (!IsValid(Rocket)) return;
    	Lent.Remove(Rocket);
    	Rocket->SetActorHiddenInGame(true);
    	Rocket->SetActorEnableCollision(false);
    	Rocket->SetActorTickEnabled(false);
    	Resting.Add(Rocket);
    }
  bugLine: 3
  fix: Refuse any rocket that is not on the lent list, with if (!Lent.Contains(Rocket)) return; so a second return of the same rocket changes nothing.
  explanation: Checking only that the rocket is valid lets a rocket that already came back be added to the resting list again, so the pool hands it out twice.
- id: not-flyweight
  type: multiple-choice
  prompt: "Ten thousand floor tiles exist at the same time and share a few tile definitions. Is that an Object Pool?"
  choices:
    - Yes, because there are many small objects and they are all of one kind
    - "No, it is a Flyweight: the tiles exist together and share their data"
    - Yes, because the tiles never move, so they can be lent out and returned
    - No, it is a Singleton, because there is only one definition for each kind
  answerIndex: 1
  explanation: Sharing at one moment is Flyweight. Reusing one after another is a pool.
- id: explain-niagara
  type: explain-in-one-sentence
  prompt: In one sentence, say why you would not write your own pool for a Niagara hit effect.
  modelAnswer: Niagara can pool its own components, so spawning the effect with the AutoRelease pooling method reuses components from the engine's pool and gives them back when the effect finishes.
  rubric:
    - Says Niagara can pool its own components
    - Names the pooling method, such as AutoRelease, or says the engine returns the component itself
  explanation: Use the engine's pool where it offers one, and write your own for actors the engine does not pool.
```
