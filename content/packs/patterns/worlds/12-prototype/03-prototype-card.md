---
id: p12-prototype-card
title: Start from one that is already right
order: 3
kind: concept
difficulty: 2
patterns: [prototype]
skills: [prototype]
terms: [cdo, spawn-template, duplicate-object, blueprint-class, data-table]
prerequisites: [p12-blade-copies]
xp: 25
estimatedMinutes: 9
concepts:
  - Prototype makes new things by copying an example that is already set up, so a variant is a small change
  - Unreal's own forms are the class default object, spawn templates, DuplicateObject, and Blueprint children
  - The data form lets a record name a parent and set only what differs
  - Copies are snapshots, and deep versus shallow copying is a decision for every reference
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: BP_HeavyBlade is a Blueprint child of BP_Blade, and its designer changed only the Swing Speed in its Class Defaults. Later someone raises Damage in BP_Blade's Class Defaults from 10 to 20. What is Damage on BP_HeavyBlade?"
choices:
  - 10, frozen when the child was made
  - 20, because the child never set its own Damage and follows its parent
  - 0, because the child must set every value itself
  - Undefined until the child is recompiled
answerIndex: 1
explanation: A Blueprint child stores only what it changed. Everything else is read from the parent's defaults, so the new Damage reaches it.
```

# Card

What you built for the blades and the trials is the **Prototype** pattern. A new thing starts as a copy of an example that is already tuned, or borrows what it does not set from one, so a variant is a small change instead of a new class. It comes in two forms.

**Copying an example.** The prototype is a live actor or object. A new one is made by copying its state, not by building from bare defaults. In Unreal the engine already does this for you:

- The class default object is every class's own prototype: `NewObject` and `SpawnActor` start from it.
- `FActorSpawnParameters::Template` starts a spawned actor from any actor of the same class. `DuplicateObject` copies a non-actor object.
- A Blueprint child class keeps the parent's defaults and stores only the values it changed, and a Material Instance does the same with its parent material's parameters.

**Borrowing from a record.** In the data form a record names another record as its parent and sets only the fields that differ. Anything it leaves unset comes from the parent. The trial book was this. Keep the parent a trial players can actually run, so designers can test the parent as well as its children.

**Decisions you make each time.**

- **Deep or shallow?** A copy of an object that owns other objects can copy them too or share them. `DuplicateObject` copies what the source owns and shares what it only points at; a spawn template gives the copy its own constructor-made components but copies other object references as the same pointer. Decide for each reference which you want.
- **Keep the example out of play.** A template actor in the world is a real actor. Park it, and remember the copy takes everything it had, parked state included.
- **Snapshot or live?** A copy is a snapshot: later edits to the example do not reach copies made before. A record that looks its parent up each time stays live, and a record that copies the parent's numbers down once is fast to read but stale after an edit.
- **Do not hand-write the copy.** A `Clone` that lists every field falls behind the first time a field is added.

**Close relatives.** Type Object points many objects at one shared kind record that they read; Prototype copies, and the copy is free to change on its own. Flyweight shares for memory. A factory decides which class to make, and Prototype decides what state it starts in. Often one design uses two of them.

# Example

```cpp
// Object form: start a new blade from a tuned one.
FActorSpawnParameters Parameters;
Parameters.Template = TunedBlade;
World->SpawnActor<ADojoBlade>(TunedBlade->GetClass(), Where, FRotator::ZeroRotator, Parameters);

// Data form: a row sets what differs and names the row it borrows the rest from.
// Swift = { Parent = Basic, SwingSpeed = 150 }   Swift's blade count comes from Basic.
```

# Questions

```yaml
- id: class-prototype
  type: multiple-choice
  prompt: "Which object is a class's own prototype, the one every plain NewObject and SpawnActor starts from?"
  choices:
    - The first instance that was created
    - The class default object
    - The game mode
    - The world
  answerIndex: 1
  explanation: The engine builds one class default object per class, and new instances copy their starting values from it.
- id: fill-parent
  type: fill-blank
  prompt: "In the data form, a row that leaves a number unset takes it from its ___ row."
  acceptedAnswers: [parent]
  explanation: The row names a parent and sets only what differs; the rest comes from the parent.
- id: deep-shallow
  type: multiple-choice
  prompt: "A kit owns a charm it made and points at a favor that belongs to someone else. After DuplicateObject on the kit, what does the copy have?"
  choices:
    - Its own copy of the charm and a pointer to the same favor
    - Its own copy of both
    - A pointer to the same charm and its own copy of the favor
    - A pointer to the same charm and the same favor
  answerIndex: 0
  explanation: The objects the source owns are duplicated; objects it only points at stay shared.
- id: prototype-or-type-object
  type: multiple-choice
  prompt: "Which sentence best tells copying an example from a shared kind record?"
  choices:
    - Both are the same idea, and the only difference between them is what each one is called
    - The copy goes back to the example every single time it needs to read one of its numbers
    - A copy starts from the example's state and changes alone; kind-record objects share one record
    - A shared kind record can only ever hold text, never a number or a reference to an object
  answerIndex: 2
  explanation: A copy is a snapshot that becomes independent. Objects that point at a kind record keep reading it, so an edit to the record reaches all of them.
- id: spot-wrong-class
  type: spot-the-bug
  prompt: A blade is laid from a tuned template. Which line makes the spawn fail when the template is a Blueprint child of the blade class?
  code: |
    ADojoBlade* ADojoBladeLayer::LayBlade(const FVector& Where)
    {
    	FActorSpawnParameters Parameters;
    	Parameters.Template = TunedBlade;
    	return GetWorld()->SpawnActor<ADojoBlade>(BladeClass, Where, FRotator::ZeroRotator, Parameters);
    }
  bugLine: 5
  fix: Spawn the tuned blade's own class, TunedBlade->GetClass(), because a template must be exactly the class being spawned.
  explanation: SpawnActor fails when the template's class is not the class it is asked to spawn, and a Blueprint child is a different class from its C++ parent.
- id: explain-prototype
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Prototype pattern.
  modelAnswer: New things are made by copying an example that is already tuned, or by borrowing unset values from a parent record, so a variant is a small change and not a new class.
  rubric:
    - Says new objects start from a copy of an existing example, or borrow from a parent record
    - Says a variant needs only the difference, not a new class or a full rebuild
  explanation: Start from one that is already right and change only what differs.
```
