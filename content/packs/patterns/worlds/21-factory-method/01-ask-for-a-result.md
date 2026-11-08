---
id: p21-ask-for-a-result
title: Forty places that name a class
order: 1
kind: concept
difficulty: 3
patterns: []
skills: [factory-method, spawning]
terms: [spawnactor, newobject, createdefaultsubobject, tsubclassof, spawn-actor-deferred]
prerequisites: [p10-type-object-when-not, p12-prototype-when-not]
xp: 25
estimatedMinutes: 10
concepts:
  - SpawnActor, NewObject, and CreateDefaultSubobject are already functions that make things, and the class is the one thing they leave to the caller
  - A call site that names a concrete class, and sets the new thing up by hand, repeats that choice and that setup everywhere it appears
  - Putting the making in one function lets callers ask for a result and lets one place decide the class and prepare the new thing
  - The class can be decided by a virtual function in a subclass or by a class value a designer picks in data
  - A deferred spawn gives the maker a window to prepare an actor before it begins play
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: forty places in the range's code write SpawnActor<AEmberBolt> and then set the bolt's shooter on the next line. Next week a frost bolt joins the range and every bolt must come from a pool. What does that change cost?"
choices:
  - Forty edits, each one a chance to forget the shooter line
  - Nothing at all, because the compiler finds every place for you
  - One edit, since all forty spawns share a single bolt class
  - A new Blueprint for each of the forty places
answerIndex: 0
explanation: A class name written at every spawn site, with the setup repeated beside it, is a decision copied forty times. Changing the decision means finding every copy.
```

# Card

The range fires bolts. Every launcher, every trap, and every cutscene that wants a bolt writes the same two lines: spawn an ember bolt, then tell it who shot it. It works. It also means the word "ember" and the shooter line live in forty places, and the day the range needs frost bolts, or bolts from a pool, someone has to find all forty.

**You already use makers.** `SpawnActor` takes a class and returns an actor that is placed, registered, and begun. `NewObject` takes a class and returns a fresh object with its constructor run. `CreateDefaultSubobject` makes a component for a class during construction. None of them asks you to run constructors or reserve memory yourself, so they are the engine's own ways of making things. What they cannot decide for you is which class, and what to do to the thing before anyone uses it.

**Put the making in one place.** Give the range a function whose job is to make a bolt, and let every call site ask it for one: "give me a bolt at this muzzle". The call sites no longer name a class and no longer repeat the setup. The class choice and the setup, such as setting the shooter, sit in the one function, so changing from ember to frost, or from a plain spawn to a pool, is one edit.

**Two ways to decide the class.** A base launcher can ask a virtual function, `CreateBolt`, and each kind of launcher override it with its own class. That is the right shape when making a thing takes more than choosing its class: a bolt that needs extra setup, or one taken from a pool. When every kind is made the same way and only the class differs, the class can be data instead: a `TSubclassOf` property a designer picks from a list, passed to `SpawnActor`. One function then makes every kind, including ones that exist only as Blueprints.

**Prepare it before it lives.** A plain spawn builds an actor and runs its `BeginPlay` in one step. If the actor needs something from its maker at that moment, such as the shooter, setting it on the next line is too late. `SpawnActorDeferred` builds the actor and holds back its start, the maker sets what it needs, and `FinishSpawning` brings it to life. Blueprint's Spawn Actor from Class does the same for every pin marked `ExposeOnSpawn`. A function that makes things is the natural place for that step, because it is written once.

**Neighbours that look alike.** Copying a tuned actor (the prototype from the last worlds) starts from an instance and carries its state; a maker starts from a class. A table of kinds on one class (the type object) says what a thing is by data; a maker says which class to build and how to start it, and may read such a table to do it. The two often work together.

# Example

```cpp
// Before: every call site names the class and repeats the setup.
AEmberBolt* Bolt = GetWorld()->SpawnActor<AEmberBolt>(Where);
Bolt->Shooter = this;

// After: every call site asks, and one function decides the class and does the setup.
ABolt* Bolt = MakeBolt(Where);
```

# Questions

```yaml
- id: already-makers
  type: multiple-choice
  prompt: "Which of these is already a function that makes things for you, taking a class and returning a finished object?"
  choices:
    - UPROPERTY
    - GetOwner
    - BeginPlay
    - SpawnActor
  answerIndex: 3
  explanation: SpawnActor takes a class and returns a placed, registered actor. NewObject and CreateDefaultSubobject do the same for objects and components.
- id: one-place
  type: multiple-choice
  prompt: "What does moving 'spawn a bolt and set its shooter' out of forty call sites and into one function buy?"
  choices:
    - Faster spawning, since the engine runs fewer calls
    - Nothing, because the forty calls simply move to one file
    - One place to change the class, the setup, or the source
    - Bolts that no longer need any class of their own to exist
  answerIndex: 2
  explanation: The decision and the setup each live once, so a change to either is one edit instead of forty.
- id: fill-finish
  type: fill-blank
  prompt: "To give an actor its values before BeginPlay runs, spawn it with SpawnActorDeferred and then call ___ on it."
  acceptedAnswers: [FinishSpawning, FinishSpawning()]
  explanation: A deferred spawn builds the actor and waits; FinishSpawning is the call that brings it to life.
- id: spot-null
  type: spot-the-bug
  prompt: A dropper asks its maker function for a crate. Which line crashes the game when the maker made nothing?
  code: |
    ADojoExCrate* Crate = MakeCrate(DropSpot);
    Crate->SetActorScale3D(FVector(2.f));
    DropCount++;
  bugLine: 2
  fix: Stop before touching the crate when MakeCrate made nothing, so the dropper changes nothing and counts nothing.
  explanation: A function that makes things is allowed to fail, and its caller has to look at the answer before using it.
- id: virtual-or-data
  type: multiple-choice
  prompt: "Fifty enemy kinds are all made the same way and differ only in which class they are. Which way of choosing the class fits best?"
  choices:
    - A switch on the kind's name inside every call site
    - One giant class with a flag per kind and a branch for each
    - A launcher subclass per kind, each with its own virtual function
    - A TSubclassOf property in a table, handed to one maker function
  answerIndex: 3
  explanation: When only the class differs, the class is data. A virtual function per kind earns its place when making a kind takes real work.
- id: not-prototype
  type: multiple-choice
  prompt: "A spawner chooses a class and prepares the new actor before it begins play. How is that different from copying a tuned actor?"
  choices:
    - There is no difference, since both end in a new actor
    - A spawner starts from a class, a copy from an instance
    - Copying cannot make an actor, only a spawner can do that
    - The spawner cannot set any properties on the new actor
  answerIndex: 1
  explanation: A maker starts from a class. A copy starts from an instance, state included, so one class can come out in many tuned variants.
- id: explain-ask
  type: explain-in-one-sentence
  prompt: In one sentence, say why a spawn call site should ask a function for a bolt instead of naming the bolt's class itself.
  modelAnswer: Naming the class and repeating the setup at every call site copies one decision many times, while one making function holds the class choice and the preparation in a single place that is easy to change.
  rubric:
    - Says the class choice or setup would be repeated at every call site
    - Says one function keeps it in a single place so a change is one edit
  explanation: The call sites ask for a result, and the one function decides how it is made.
```
