---
id: p16-spawn-cost
title: What one rocket costs
order: 1
kind: concept
difficulty: 3
patterns: []
skills: [object-pool, performance]
terms: [spawnactor, destroy, garbage-collection, profiling, set-actor-hidden-in-game, set-actor-enable-collision]
prerequisites: [p13-bytecode-when-not]
xp: 25
estimatedMinutes: 10
concepts:
  - Spawning an actor builds it from its class, registers every component with rendering and physics, and runs BeginPlay, every single time
  - Destroying an actor ends its play and unregisters its components, and its memory waits for a later garbage collection
  - The cost lands in the busiest moments, when the most things are being made and removed at once
  - Measure before changing anything, with stat game or Unreal Insights
  - An actor can stay alive out of play instead, hidden, not colliding, and not ticking, and each of those is its own switch
  - An actor that comes back into play still holds whatever its last use left in it
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the harbor launcher spawns a rocket actor for every shot and destroys it when it bursts. The finale fires 300 rockets in 20 seconds, and the frame rate dips exactly during the finale. Where does most of the extra time go?"
choices:
  - Drawing the bursts, because rockets are bright
  - Spawning and destroying the actors, because every spawn builds and registers a whole actor and every destroy takes one apart
  - Nowhere; spawning is free in Unreal because the engine collects garbage for you
  - The rockets' Tick, because each rocket ticks for its whole flight
answerIndex: 1
explanation: Each spawn builds an actor from its class, registers its components with rendering and physics, and runs BeginPlay; each destroy runs EndPlay and unregisters them again, and leaves the memory for a later garbage collection. Three hundred of each in twenty seconds is the extra work.
```

# Card

The harbor festival ends with a finale: the launcher on the pier fires a rocket on every beat of the music, three hundred in twenty seconds. The first version is the obvious one. Each shot calls `SpawnActor`, and each rocket calls `Destroy` on itself when it bursts. It plays perfectly in a test with five rockets. In the finale the frame rate dips, exactly when the sky is fullest.

**A spawn is a lot of work.** `SpawnActor` does far more than reserve memory. It makes the actor from its class, copying the class's defaults. It creates the actor's components and registers each one, which gives every visible or colliding component its own state in the renderer and in the physics scene. It runs its construction step (`OnConstruction`, and a Blueprint's construction script), initializes the components, and finally calls `BeginPlay`. All of that happens again for the next rocket, a beat later.

**A destroy is work too, and some of it comes later.** `Destroy` runs `EndPlay`, unregisters the components so the renderer and the physics scene forget them, and takes the actor out of its level. The memory is not freed then. The actor waits until a later garbage collection finds that nothing points at it any more. A busy minute leaves hundreds of dead rockets for the collector to find.

**The bill arrives at the worst time.** The work is small for one rocket and large for three hundred, and the three hundred all come in the moment the player is watching most closely. A cost spread evenly over a level is easy to hide; a cost packed into the finale is a hitch.

**Measure before you change it.** Type `stat game` in the console during play: one of its lines is the time spent in `SpawnActor` this frame. **Unreal Insights** records a trace you can scrub through afterwards to see which frames spent their time where. If spawning is not what the numbers show, the rest of this world does not help.

**An actor can leave play without being destroyed.** `SetActorHiddenInGame(true)` stops drawing it. `SetActorEnableCollision(false)` stops it colliding with anything. `SetActorTickEnabled(false)` stops its `Tick`. These are three separate switches: a hidden rocket still collides and still ticks, and a rocket that does not tick can still block a shot. An actor with all three off is alive, in memory, and out of play, and turning them back on brings it back with no spawn at all.

**It comes back with its old life in it.** An actor brought back into play is the same object it was. Its speed, its fuse, and the fact that it already burst are all still in its fields until something sets them again. A fresh spawn starts from the class defaults; a reused actor starts from wherever its last use stopped.

# Example

```cpp
// Out of play, still alive: three separate switches.
Rocket->SetActorHiddenInGame(true);
Rocket->SetActorEnableCollision(false);
Rocket->SetActorTickEnabled(false);

// Back in play later, with no SpawnActor at all.
Rocket->SetActorHiddenInGame(false);
Rocket->SetActorEnableCollision(true);
Rocket->SetActorTickEnabled(true);
```

# Questions

```yaml
- id: spawn-work
  type: multiple-choice
  prompt: "Which of these does SpawnActor do for every actor it spawns?"
  choices:
    - Only reserves memory for the actor's fields
    - Registers the actor's components with rendering and physics and calls BeginPlay
    - Loads the level the actor belongs to
    - Nothing until the actor's first Tick
  answerIndex: 1
  explanation: A spawn builds the actor from its class, registers its components, runs its construction step, initializes components, and calls BeginPlay, all before SpawnActor returns.
- id: destroy-memory
  type: multiple-choice
  prompt: "A rocket calls Destroy on itself. When is its memory freed?"
  choices:
    - At once, inside Destroy
    - At the end of the frame, always
    - In a later garbage collection, once nothing points at it any more
    - Never, while the level is loaded
  answerIndex: 2
  explanation: Destroy takes the actor out of play and out of its level, but the object's memory is reclaimed by a later garbage collection.
- id: fill-collision
  type: fill-blank
  prompt: "A hidden rocket still blocks shots until you call ___(false) on it."
  acceptedAnswers: [SetActorEnableCollision, "SetActorEnableCollision()"]
  explanation: Hiding only stops drawing. Collision has its own switch on the actor.
- id: spot-still-ticking
  type: spot-the-bug
  prompt: A rocket is taken out of play to be used again later. Which line leaves the hidden rocket flying and burning its fuse?
  code: |
    void ADojoLauncher::PutAway(ADojoRocket* Rocket)
    {
    	Rocket->SetActorHiddenInGame(true);
    	Rocket->SetActorEnableCollision(false);
    	Rocket->SetActorTickEnabled(true);
    	Resting.Add(Rocket);
    }
  bugLine: 5
  fix: Turn ticking off with Rocket->SetActorTickEnabled(false); so the resting rocket stops moving and its fuse stops counting.
  explanation: Hidden and not colliding is not the same as not ticking; Tick keeps moving the rocket and counting its fuse down while nobody can see it.
- id: measure-first
  type: multiple-choice
  prompt: "Before changing how the launcher gets its rockets, what should you do?"
  choices:
    - Rewrite it, because spawning is always the problem
    - Measure, for example with stat game or Unreal Insights, to see whether spawning is where the time goes
    - Lower the rocket count until the dip is gone
    - Move the rockets' code to Blueprint
  answerIndex: 1
  explanation: Keeping actors around costs memory and care. It only pays when the numbers show spawning and destroying are the cost.
- id: explain-old-life
  type: explain-in-one-sentence
  prompt: In one sentence, say how a rocket brought back into play differs from a freshly spawned one.
  modelAnswer: It is the same object as before, so its fields still hold whatever its last flight left, such as its speed, fuse, and burst state, until something sets them again, while a fresh spawn starts from the class defaults.
  rubric:
    - Says the reused rocket keeps the values its last use left
    - Contrasts it with a fresh spawn starting from the defaults
  explanation: Bringing an actor back saves the spawn, and in exchange its last use is still in it.
```
