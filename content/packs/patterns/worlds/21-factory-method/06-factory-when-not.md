---
id: p21-factory-when-not
title: When a plain spawn is enough
order: 6
kind: concept
difficulty: 3
patterns: [factory-method]
skills: [factory-method, architecture]
terms: [spawnactor, tsubclassof, blueprint-class, abstract-specifier]
prerequisites: [p21-turret-refactor]
xp: 25
estimatedMinutes: 8
concepts:
  - One class made from one place needs no maker, and a direct spawn is clearer
  - A TSubclassOf property already lets a designer choose the class, so a hierarchy of factories on top of it adds nothing
  - A maker that only forwards to SpawnActor and adds nothing is a layer to read through
  - A hierarchy of creators that mirrors a hierarchy of products doubles the classes to keep in step
  - A pool is a different tool for a different problem, and a maker is only the place the pool plugs in
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: one door class is spawned from exactly one place, the level start code, and nobody has asked for a second kind of door. A teammate proposes a DoorFactory base class with a virtual CreateDoor, a WoodenDoorFactory, and a manager to hold the factory. Is that the right tool?"
choices:
  - Yes, since every spawn in a project ought to go through a factory class
  - No; with one class and one call site, a direct SpawnActor is clearer
  - Yes, as long as the factory class is made a singleton first
  - No; doors can never be spawned from code at all, only placed
answerIndex: 1
explanation: A maker earns its cost when the class, the setup, or how things are made can change, or when many places make them. One class from one place has none of those, and the factory is three classes of reading for no gain.
```

# Card

A maker is one of the lightest patterns in this course, which is exactly why it gets overused. Leave it out in these cases.

**One class, one call site.** If a door is spawned from one place and nothing suggests a second kind or a second place, `SpawnActor<ADoor>` is the whole story. When a second place or a second kind arrives, extract the function then; moving a spawn into a function is a small, safe refactor, as the turret quest showed.

**A property already does it.** In Unreal the class is usually data: a `TSubclassOf` property a designer picks in the Details panel, or a Blueprint child of your base. A designer who can pick the class does not need a creator subclass per class, and a table of classes does not need a hierarchy of factories above it. Reach for a virtual maker only when making a thing takes more than choosing a class.

**A maker that only forwards.** A function `MakeDoor` that does nothing but call `SpawnActor` adds a name to read and a place to look. A maker should do something a bare call does not: choose the class, prepare the new thing before it begins play, count, limit, or pool. If you cannot name what it adds, delete it.

**Parallel hierarchies.** A launcher subclass for every bolt, and a factory subclass for every launcher, doubles the classes and means every new product needs two or three new files kept in step. The wave spawner avoided this by putting the class in a row of data. A creator hierarchy is worth its weight when each creator really does different work.

**The real problem is lifetime.** Spawning ten thousand short-lived bolts is a question of allocation, not of who names the class. A pool is the answer, and a maker is only the place the pool plugs in so callers do not notice. A factory built with no pool behind it does not fix the allocation.

# Example

```cpp
// Right-sized: one door, one place, nothing to hide.
ADoor* Door = GetWorld()->SpawnActor<ADoor>(DoorClass, Where);

// Worth a function: three weapons now share the same bolt setup and a pool is coming.
virtual ADojoP21Bolt* MakeBolt(TSubclassOf<ADojoP21Bolt> BoltClass, const FTransform& Muzzle);
```

# Questions

```yaml
- id: when-not-one
  type: multiple-choice
  prompt: "Which job is the poorest fit for a factory method?"
  choices:
    - Forty weapons that each spawn bolts and must soon use a pool
    - A wave spawner that reads its enemy classes from a table
    - A door spawned once, from one place, with no second kind in sight
    - A launcher family where each kind fires bolts in a different pattern
  answerIndex: 2
  explanation: One class from one call site has nothing for a maker to hide or change. Extract one when a second place or kind shows up.
- id: when-not-property
  type: multiple-choice
  prompt: "Designers need to choose which enemy class a spawn point makes. What is the simplest thing that works?"
  choices:
    - A factory class per enemy, chosen by a switch
    - A new C++ file for every choice
    - A singleton that decides for everyone
    - A TSubclassOf property on the spawn point
  answerIndex: 3
  explanation: TSubclassOf gives the designer a filtered picker, and one SpawnActor call serves every class they pick.
- id: when-not-forward
  type: multiple-choice
  prompt: "A function MakeDoor does nothing except return SpawnActor<ADoor>(Where). What should happen to it?"
  choices:
    - Delete it unless it will choose, prepare, count, limit or pool
    - Keep it, because a thin wrapper is always good for readability
    - Make it virtual so that it looks like the pattern in a book
    - Move it into a subsystem and call it from there instead of here
  answerIndex: 0
  explanation: A maker has to do something a bare spawn does not, or it is a layer without a purpose.
- id: spot-parallel
  type: spot-the-bug
  prompt: A project has a bolt class, a launcher subclass per bolt, and the creator below, one per launcher. Which line shows the hierarchy copying itself for no gain?
  code: |
    UCLASS()
    class AEmberLauncherFactory : public ALauncherFactory
    {
    	GENERATED_BODY()
    	virtual ALauncher* CreateLauncher() override { return GetWorld()->SpawnActor<AEmberLauncher>(); }
    };
  bugLine: 2
  fix: Drop the factory subclass and pick the launcher class in data with a TSubclassOf property on whatever places launchers.
  explanation: One factory class per launcher class doubles the files and says nothing a class picker does not.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when a plain spawn is better than a factory method.
  modelAnswer: When there is one class made from one place, or a TSubclassOf property already lets a designer choose the class, a direct SpawnActor is clearer, and a wrapper that adds nothing or a hierarchy of factories is only more to read.
  rubric:
    - Names a case such as one class and one call site, or a TSubclassOf already doing the job
    - Says the maker or the hierarchy would add reading and classes for no gain
  explanation: A maker is for a decision, a setup, or a way of making that can change; without one it is a layer.
```
