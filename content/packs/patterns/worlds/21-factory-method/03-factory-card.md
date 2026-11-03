---
id: p21-factory-card
title: Ask for the result
order: 3
kind: concept
difficulty: 3
patterns: [factory-method]
skills: [factory-method]
terms: [spawn-actor-deferred, tsubclassof, spawnactor, newobject, createdefaultsubobject, abstract-specifier]
prerequisites: [p21-launchers]
xp: 25
estimatedMinutes: 10
concepts:
  - Factory Method puts the making of a thing in one function that callers ask, and the function decides which class to build and how to start it
  - In Unreal the class is often data, a TSubclassOf a designer picks, and the function is a spawner or a static helper; a virtual function suits makers that do real work
  - A maker built on a deferred spawn prepares the new thing before it begins play
  - Because creation passes through one function, a pool, a counter, or a different class can be swapped in without touching the callers
  - It differs from Prototype, which copies an instance, and from Type Object, which keeps kinds as data on one class
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the range's turrets all call one function, MakeBolt, to get a bolt. A teammate wants every bolt to come from a pool instead of a fresh spawn. Where does the change go?"
choices:
  - Into each of the turrets, one by one
  - Into MakeBolt, once, because every turret already asks it
  - Into the bolt class, which must now delete itself
  - Nowhere; pools and spawning cannot be combined
answerIndex: 1
explanation: The turrets ask for a result and do not care how it is made. Swapping the body of the one function that makes it changes every turret at once.
```

# Card

What you built for the launchers and the wave is the **Factory Method** pattern. Making a thing goes through one function that callers ask for a result, and that function decides which class to build and how to start it. Callers never write the class name and never repeat the setup.

**Pieces.**

- **The product.** The thing being made, here a bolt or a critter, usually through a base class the callers know.
- **The creator.** The class whose job includes making products, here a launcher or a spawner. Its callers deal only in the product base.
- **The factory method.** The function that makes the product: `CreateBolt`, `Create`, or a static helper. It may be virtual, so a subclass of the creator chooses the product class, or it may read a class from data.

**Unreal's own makers.** `SpawnActor`, `NewObject`, and `CreateDefaultSubobject` are makers you call every day, and each takes the class as a value. `UGameplayStatics::BeginDeferredActorSpawnFromClass` and `FinishSpawningActor` are the Blueprint side of a deferred spawn. A `GameMode` names its default pawn class as data and the engine makes the pawn from it, which is the same idea at game scale.

**Two ways to choose the class.**

- **A virtual function in a subclass.** The base creator calls `CreateBolt`; the ember launcher overrides it and spawns an ember bolt. The choice is code, one subclass per product. It is the right shape when making the product takes more than naming a class, such as a spread of three bolts or a bolt taken from a pool. A base creator that only declares the function is marked `Abstract` so nobody can place one.
- **A class in data.** A `TSubclassOf<ABase>` property, shown as a list of the base's children in the Details panel, passed to `SpawnActor`. One maker serves every product, including Blueprint classes created later. Reach for this first when only the class differs.

**Prepare before it lives.** A maker that has something to give the new actor, such as a shooter or a level, spawns it deferred, sets what it needs, then calls `FinishSpawning`, so the actor's `BeginPlay` already sees its values. This is why a maker earns its keep even when it is three lines long: the order of those lines is written once.

**A place to change how things are made.** Because every caller goes through the maker, a pool, a counter for the profiler, a limit on how many exist, or a different class for a game mode is a change to the one function. The turret refactor in this world does exactly that.

**Not its neighbours.** Prototype copies an existing, tuned instance and carries its state, so one class comes out in many variants. Type Object keeps the kind of a thing as data on one class, so there is no class per kind at all. Factory Method starts from a class and makes a new thing; it may well read a type object's data to decide which class or how to prepare it. An object pool recycles things; a maker is the natural place to ask the pool for one. Abstract Factory, which makes whole families of related products, rarely appears in Unreal: a data table of classes does the job without a hierarchy of factories.

# Example

```cpp
// The maker, with the class chosen in data and the preparation done once.
ADojoP21Critter* ADojoP21Spawner::Create(const FDojoP21SpawnEntry& Entry, const FTransform& Where)
{
	if (Entry.CritterClass.Get() == nullptr) return nullptr;

	ADojoP21Critter* Critter = GetWorld()->SpawnActorDeferred<ADojoP21Critter>(Entry.CritterClass, Where);
	if (Critter == nullptr) return nullptr;

	Critter->Level = FMath::Max(1, Entry.Level);
	Critter->FinishSpawning(Where);
	return Critter;
}
```

# Questions

```yaml
- id: three-pieces
  type: multiple-choice
  prompt: "In the launchers, which part is the creator and which is the product?"
  choices:
    - The launcher is the product and the bolt is the creator
    - Both are creators
    - The launcher is the creator and the bolt is the product
    - Neither; Factory Method has no creator
  answerIndex: 2
  explanation: The launcher makes things and the bolt is what it makes. Callers deal in the bolt base and never in a launcher's choice of class.
- id: when-virtual
  type: multiple-choice
  prompt: "When is a virtual factory method in a creator subclass better than a TSubclassOf property?"
  choices:
    - Always; data is never enough
    - When designers must pick the class in the Details panel
    - Never; virtual functions cannot spawn actors
    - When making the product takes more than choosing a class, such as firing three bolts or taking one from a pool
  answerIndex: 3
  explanation: A class value can only say which class. When the making itself differs, the difference is code, and a virtual function holds it.
- id: fill-subclass
  type: fill-blank
  prompt: "A property of type TSubclassOf<ADojoP21Critter> shows a picker limited to the critter base and its ___."
  acceptedAnswers: [children, subclasses, child classes, derived classes]
  explanation: TSubclassOf narrows a class reference to a family, so a designer cannot pick an unrelated class.
- id: spot-hardcode
  type: spot-the-bug
  prompt: This maker should spawn the class the entry names. Which line ignores the designer's choice?
  code: |
    ADojoP21Critter* ADojoP21Spawner::Create(const FDojoP21SpawnEntry& Entry, const FTransform& Where)
    {
    	if (Entry.CritterClass.Get() == nullptr) return nullptr;
    	return GetWorld()->SpawnActor<ADojoP21Critter>(ADojoP21Critter::StaticClass(), Where);
    }
  bugLine: 4
  fix: Pass Entry.CritterClass to SpawnActor instead of the base class's StaticClass.
  explanation: Passing the base class always makes the base critter, so every row the designer fills in produces the same thing.
- id: pool-swap
  type: multiple-choice
  prompt: "Every turret asks MakeBolt for its bolt. What does that make easy?"
  choices:
    - Changing how bolts are made, for example taking them from a pool, in one place for every turret
    - Giving every turret a different pool by editing each one
    - Making bolts without any class
    - Removing the need for BeginPlay
  answerIndex: 0
  explanation: The turrets depend on the answer, not on how it is made, so the body of the one maker can change underneath them.
- id: pick-neighbour
  type: which-pattern
  prompt: "A spawner needs to choose between a slime class and an imp class and prepare the new critter before it begins play. Which pattern describes the function you write?"
  choices: [factory-method, observer, state, prototype]
  answer: factory-method
  distractorNotes:
    - choice: observer
      why: Telling listeners afterwards is too late for a thing that needs its values at the moment it begins play.
    - choice: state
      why: States describe what a thing is doing now, not how it is made.
    - choice: prototype
      why: Copying starts from an existing, tuned instance; this function starts from a class.
  explanation: A maker that chooses the class and prepares the product is Factory Method.
- id: explain-factory
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Factory Method pattern.
  modelAnswer: Callers ask one function for a result, and that function decides which class to build and prepares it, so no call site names a concrete class or repeats the setup.
  rubric:
    - Says callers ask one function for the thing instead of naming a class
    - Says that function chooses the class and prepares the new thing
  explanation: The decision about what to build and how to start it lives in one place.
```
