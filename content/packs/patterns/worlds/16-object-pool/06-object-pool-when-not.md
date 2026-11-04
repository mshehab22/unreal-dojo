---
id: p16-object-pool-when-not
title: When keeping actors costs more than spawning them
order: 6
kind: concept
difficulty: 3
patterns: [object-pool]
skills: [object-pool, performance]
terms: [object-pool, timer-manager, beginplay, garbage-collection, profiling, niagara-component-pool]
prerequisites: [p16-ripple-refactor]
xp: 25
estimatedMinutes: 10
concepts:
  - Destroy did clean-up for free that a pooled actor has to do by hand, timers and bound delegates among it
  - BeginPlay and EndPlay run once per actor, not once per use, so per-use setup belongs in the pool's wake and rest
  - Resting actors stay in memory, keep alive whatever they still point at, and are visited by every garbage collection
  - Something made a few times a level, or too complex to reset with certainty, is cheaper to spawn
  - Measure first, use Niagara's own pooling for effects, and give every pool a limit
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the harbor's boss, a sea serpent, is spawned once at the start of each level and destroyed at its end. A teammate wants to pool it to save the spawn. What is the best answer?"
choices:
  - Pool it; pooling is always faster
  - Pool it with room for ten, to be safe
  - Spawn it; one spawn per level costs almost nothing, and a serpent with health, phases, an AI controller, and attacks in flight is hard to reset with certainty
  - Make the serpent a Singleton instead
answerIndex: 2
explanation: A pool pays off for things made and removed many times a second. Once a level, the spawn is invisible, and every field the reset might miss is a bug that only shows on the second level.
```

# Card

A pool is a trade: memory held all the time, and a reset you must get right, in exchange for no spawning during play. Most of the time in a game, the trade is not worth it.

**What Destroy did for you.** Destroying an actor ends it for good, and that quietly took care of things you never wrote. A timer bound to an actor holds it weakly, so once the actor is destroyed its pending timers never fire. A pooled actor is alive while it rests, so a timer it started in its last use still fires, at rest or in its next use. That is why the shells' rest had to clear the fuse. The same goes for anything a use connected to the actor: a delegate a borrower bound to its burst event is still bound when the next borrower gets it, and both hear about the next burst. Rest must undo every connection a use made, not only the three switches.

**BeginPlay runs once, not once per use.** An actor begins play when it is spawned and ends play when it is destroyed. A pooled actor does both exactly once, however many times it is lent. Setup that must happen on every use, such as picking a random color, goes in the wake; clean-up that must happen after every use goes in the rest. Code left in `BeginPlay` or `EndPlay` runs on the first use only, or after the last.

**Resting actors are not free.** Every resting actor stays in memory with all its components. Whatever it still points at through a `UPROPERTY` stays alive with it: an object made with `NewObject`, such as the shot record its last borrower handed it, is never collected while a resting rocket points at it, until the rest clears the pointer. Destroyed actors are the exception, because the collector clears references to them. And each garbage collection works through the live objects to find what is still reachable, so a pool of five hundred resting actors adds five hundred actors and their components to every collection, whether or not the show ever uses them.

**When to spawn instead.**

- *It is made rarely.* A boss once a level, a door that opens twice: the spawn costs less than the pool's memory and reset.
- *It is hard to reset with certainty.* A character with an AI controller, an ability system, attached weapons, and timers in flight has dozens of things a reset could miss, and each miss is a bug that only shows on the second use.
- *The numbers do not show it.* If `stat game` and Unreal Insights do not show spawning as the cost, a pool adds risk and saves nothing.
- *The engine already pools it.* Niagara effects spawned with the `AutoRelease` pooling method are reused by the engine; a hand-written pool around them repeats its work.

**When you do pool, give it a limit.** A pool that grows whenever it is empty and never shrinks ends a long fight holding the most it ever needed, forever, and every growth was a spawn during play. Size it for the common case, choose what happens at the limit, and log when the limit is reached, so a designer can see when the size is wrong.

# Example

```cpp
// Rest undoes everything a use connected, not only the switches.
void ADojoShell::RestInPool()
{
	GetWorldTimerManager().ClearAllTimersForObject(this);
	OnBurst.Clear();
	Target = nullptr;

	SetActorHiddenInGame(true);
	SetActorEnableCollision(false);
	SetActorTickEnabled(false);
}
```

# Questions

```yaml
- id: timer-after-destroy
  type: multiple-choice
  prompt: "A rocket starts a 2 second timer and is destroyed after 1 second. Another rocket is sent to rest in a pool after 1 second of its own 2 second timer. What happens at 2 seconds?"
  choices:
    - Both timers fire
    - Neither fires
    - The destroyed rocket's timer does not fire, because the timer held it weakly; the resting rocket is alive, so its timer fires
    - Only the destroyed rocket's timer fires
  answerIndex: 2
  explanation: Destroy gave the first rocket a clean end for free. A pooled rocket keeps living, so its rest has to clear its own timers.
- id: begin-play-once
  type: multiple-choice
  prompt: "A pooled shell picks a random burst color in BeginPlay. What do players see?"
  choices:
    - A new color on every use
    - Every shell keeps the color it picked on its first use, because BeginPlay runs once per actor, not once per loan
    - No color at all
    - A crash on the second use
  answerIndex: 1
  explanation: A pooled actor begins play once, when it is spawned. Per-use setup belongs in its wake.
- id: fill-delegate
  type: fill-blank
  prompt: "A borrower bound a function to a pooled rocket's OnBurst delegate. On rest, ___ on the delegate stops the next borrower's bursts from reaching the old one."
  acceptedAnswers: [Clear, "Clear()", RemoveAll, "RemoveAll()"]
  explanation: A multicast delegate keeps its bindings until they are removed, and a pooled rocket is never destroyed to drop them.
- id: spot-held-target
  type: spot-the-bug
  prompt: A pooled rocket rests between uses. Record and LastRecord are UPROPERTY pointers to shot records that borrowers make with NewObject. Which line keeps the last borrower's record from ever being collected while the rocket rests?
  code: |
    void ADojoTrackedRocket::RestInPool()
    {
    	GetWorldTimerManager().ClearAllTimersForObject(this);
    	LastRecord = Record;
    	Record = nullptr;
    	Velocity = FVector::ZeroVector;
    	SetActorHiddenInGame(true);
    	SetActorEnableCollision(false);
    	SetActorTickEnabled(false);
    }
  bugLine: 4
  fix: Drop the line, or set LastRecord = nullptr; as well, so a resting rocket points at nothing.
  explanation: A UPROPERTY pointer is a reference the garbage collector follows, so the record kept in LastRecord stays reachable through the resting rocket long after its borrower has finished with it.
- id: when-spawn
  type: multiple-choice
  prompt: "Which of these is the best fit for a hand-written actor pool?"
  choices:
    - The level's one boss, spawned once
    - A Niagara spark effect spawned on every hit
    - Bullets fired twenty times a second, which stat game shows spawning as a cost
    - The player's character
  answerIndex: 2
  explanation: Frequent, simple, and measured is when a pool pays. The boss and the character are rare and complex, and Niagara already pools its effects.
- id: explain-limit
  type: explain-in-one-sentence
  prompt: In one sentence, say why a pool that grows whenever it is empty, with no limit, defeats its own purpose.
  modelAnswer: Every time it grows it spawns during play, which is the cost the pool was meant to avoid, and because it never shrinks it ends up holding the most it ever needed in memory for the rest of the game.
  rubric:
    - Says growing means spawning during play again
    - Names the memory it keeps holding, or that it never shrinks
  explanation: A pool needs a size, a limit, and a decision for when the limit is reached.
```
