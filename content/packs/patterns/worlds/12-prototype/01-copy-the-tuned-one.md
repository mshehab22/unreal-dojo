---
id: p12-copy-the-tuned-one
title: Ten more like the one I tuned
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [prototype, object-model]
terms: [cdo, spawnactor, blueprint-class, spawn-template, duplicate-object]
prerequisites: [p11-flyweight-when-not]
xp: 25
estimatedMinutes: 8
concepts:
  - A new actor starts from its class defaults, kept in the class default object, not from any placed actor of that class
  - A designer's hand-tuned blade holds its numbers only in that one actor
  - Giving SpawnActor an existing actor as its template starts the new actor from that actor's property values
  - A template placed in the world is a real actor, so it must be kept out of play, and a copy takes everything it had
  - DuplicateObject makes a separate copy of a non-actor object, including the objects it owns
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: in the trial hall a designer places one swinging blade and tunes it by hand to Damage 40 and an orange glow. The class defaults are Damage 10 and a white glow. A script then calls SpawnActor with the blade class ten times. What do the ten new blades have?"
choices:
  - Damage 40 and the orange glow, copied from the placed blade
  - Damage 10 and the white glow, the class defaults
  - Damage 25, halfway between the two
  - Nothing; SpawnActor refuses because a blade already exists
answerIndex: 1
explanation: SpawnActor knows the class, not any placed actor of it. The tuning lives only in the one placed blade, so new blades start from the class defaults.
```

# Card

A hall full of blades, trials, and challenger kits is mostly copies with small changes. The designer tunes one blade until it feels right, and the next ten should feel the same.

**A class has one set of defaults.** When the engine loads a class it builds a hidden object from its constructor and any Blueprint defaults, the class default object. Every plain `SpawnActor` or `NewObject` of that class starts from it. A blade placed in the level and tuned by hand holds its new numbers in that one actor and nowhere else, so ten plain spawns give ten blades with the defaults, not the tuned look.

**Copy the tuned one.** `FActorSpawnParameters` has a `Template` field. Give it an existing actor of the very same class and the world starts the new actor from that actor's property values instead of the class defaults. No new class and no list of fields to copy: tune one blade, copy it as often as you like, and a different tuned blade makes a different variant.

**A template is a real actor.** Placed in the world, it is drawn, collides, and takes part like any other actor. The usual answer is to park it: hide it and turn its collision off, and keep it only as a source of numbers. The copy takes the template's property values, all of them, so a copy of a parked blade starts parked too and has to be woken. The copy's place needs care too: the root component's own place is one of the values it takes, so a template standing far from the origin can leave copies there instead of where you laid them. Set the copy's location yourself after it is spawned.

**What comes across.** Property values come across, the ones the engine saves. Components the class creates in its constructor come across with their settings. An object reference comes across as the same pointer, so the copy and the template then point at one thing. Anything held outside properties, or added to the template while it ran, does not come across.

**Leave the class defaults alone.** Writing to the class default object with `GetMutableDefault` to tune one variant changes every blade spawned afterwards, anywhere. Variants belong in templates, in Blueprint child classes, or in data.

**Objects that are not actors.** `DuplicateObject` makes a new object of the same class with the same property values. The objects the source owns, its subobjects, are duplicated along with it, so the copy is independent of them. Objects the source merely points at stay shared. Unreal already does this work; a hand-written copy function that lists every field falls behind the first time a field is added.

# Example

```cpp
// Plain: the new blade starts from the class defaults, whatever any placed blade was tuned to.
ADojoBlade* Plain = World->SpawnActor<ADojoBlade>(BladeClass, Where, FRotator::ZeroRotator);

// From a tuned blade: the new blade starts from that blade's property values.
FActorSpawnParameters Parameters;
Parameters.Template = TunedBlade;
ADojoBlade* Copy = World->SpawnActor<ADojoBlade>(TunedBlade->GetClass(), Where, FRotator::ZeroRotator, Parameters);
```

# Questions

```yaml
- id: which-copies-tuning
  type: multiple-choice
  prompt: "A tuned blade is placed in the level. Which call gives a new blade its numbers?"
  choices:
    - SpawnActor of the blade class with nothing else
    - GetDefault of the blade class
    - NewObject of the blade class
    - SpawnActor with the tuned blade as the spawn template
  answerIndex: 3
  explanation: The template is the only way to hand the spawn an existing actor to start from; the other three start from the class defaults.
- id: fill-template
  type: fill-blank
  prompt: "To start a spawned actor from an existing one, set the ___ field of FActorSpawnParameters to that actor."
  acceptedAnswers: [Template]
  explanation: The world then initializes the new actor from the template's property values instead of the class default object.
- id: spot-class-write
  type: spot-the-bug
  prompt: A designer wants one heavy blade laid at Where. Which line hurts every blade spawned afterwards?
  code: |
    void ADojoBladeLayer::LayHeavyBlade(const FVector& Where)
    {
    	GetMutableDefault<ADojoBlade>()->Damage = 80.f;
    	GetWorld()->SpawnActor<ADojoBlade>(BladeClass, Where, FRotator::ZeroRotator);
    }
  bugLine: 3
  fix: Tune the one blade after spawning it, or spawn it from a tuned template, and leave the class defaults alone.
  explanation: The class default object is where every later spawn starts, so every blade made after this call, anywhere, starts at 80.
- id: live-template
  type: multiple-choice
  prompt: "A tuned blade is placed in the level and used as a spawn template, and nobody hides it. What does it do?"
  choices:
    - It plays like any other blade, drawn and colliding
    - It disappears the first time it is copied
    - It becomes the class default
    - Nothing; template actors are never drawn
  answerIndex: 0
  explanation: Using an actor as a template does not take it out of play. Hide it and turn its collision off, then wake each copy.
- id: duplicate-what
  type: multiple-choice
  prompt: "Which function makes a separate copy of a non-actor object, including the objects it owns?"
  choices:
    - SpawnActor
    - GetDefault
    - FindObject
    - DuplicateObject
  answerIndex: 3
  explanation: DuplicateObject copies the object and the subobjects it owns; objects it only points at stay shared.
- id: explain-copy
  type: explain-in-one-sentence
  prompt: In one sentence, say why a spawned blade does not get the tuning of a blade placed in the level, and how to give it that tuning.
  modelAnswer: A plain spawn starts from the class defaults, and the tuning lives only in the placed blade, so you pass that blade as the spawn template and the new blade starts from its property values.
  rubric:
    - Says a plain spawn uses the class defaults, not a placed actor
    - Says to pass the tuned actor as the spawn template, or to copy its property values
  explanation: The class knows its defaults; only an actor you hand over knows its tuning.
```
