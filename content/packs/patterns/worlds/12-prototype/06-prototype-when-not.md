---
id: p12-prototype-when-not
title: When copying an example is the wrong move
order: 6
kind: concept
difficulty: 2
patterns: [prototype]
skills: [prototype, architecture]
terms: [data-asset, data-table, cdo, spawn-template]
prerequisites: [p12-kit-refactor]
xp: 25
estimatedMinutes: 7
concepts:
  - Kinds that are only numbers belong in data that designers edit side by side, not in hidden example actors
  - A copy is a snapshot, so it does not follow later edits to the example
  - Copying is unclear when it is not obvious which references are shared or duplicated
  - Writing to the class defaults at runtime or hand-writing a Clone are the usual misuses
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the designers want forty blade kinds that differ only in a few numbers, edited side by side in a spreadsheet view. A teammate proposes forty hidden template blades in the level to copy from. Is that the right tool?"
choices:
  - Yes, templates are the engine's way to make variants
  - Yes, as long as the templates tick
  - No; a Data Table or Data Asset per kind is easier to edit in bulk and costs no live actors
  - Only if each blade is a separate class
answerIndex: 2
explanation: Forty hidden actors are forty live objects edited one at a time. Kinds that are only numbers are cleaner as rows or assets.
```

# Card

Copying a tuned example is handy and easy to overuse. Leave it out in these cases.

**Kinds that are only data.** Forty blade kinds that differ in numbers are rows in a Data Table or assets of a data asset class. Designers see all forty at once, sort them, and add a new one without placing an actor. A template needs a live actor for each, parked and edited one at a time. Rows can still borrow from a parent row, as the trial book did, without any actor.

**When you want edits to reach everyone.** A copy is a snapshot. Raise the damage on the tuned blade and the blades already laid keep the old number. If every blade of a kind should follow one edit, point them at a shared record instead of copying a tuned one.

**When it is unclear what a copy should share.** A template that points at another actor in the level makes every copy point at that actor too. A template with state held outside its properties, such as a timer in progress or an object added while it ran, does not pass that state on. If you cannot say for each reference whether the copy shares it, duplicates it, or drops it, choose a clearer design.

**Misusing the class defaults.** Writing to the class default object with `GetMutableDefault` at runtime to tune one variant changes every actor spawned afterwards. Change class defaults in Blueprint child classes, in the editor, not in running game code.

**A hand-written Clone.** Unreal already copies actors through a spawn template and other objects through `DuplicateObject`. A function that lists each field repeats that work and falls behind when a field is added.

**When variants will not differ.** If every copy would be identical, a plain spawn of the class is enough.

# Example

```cpp
// Right-sized: forty kinds as rows of one table, with no hidden actors to copy.
UPROPERTY(EditAnywhere, Category = "Blades")
TObjectPtr<UDataTable> BladeKinds;
```

# Questions

```yaml
- id: when-not-bulk
  type: multiple-choice
  prompt: "Which job is the poorest fit for copying a hidden template actor?"
  choices:
    - Laying blades that start with a hand-tuned look
    - Keeping fifty kinds of blade that differ only in numbers
    - Starting a copy with a template's tuned components
    - Spawning one pre-equipped challenger
  answerIndex: 1
  explanation: Fifty kinds of pure numbers are rows or assets; a template for each is fifty actors to place and edit one at a time.
- id: when-not-snapshot
  type: multiple-choice
  prompt: "A blade was laid from a tuned template at Damage 40. The designer then raises the template to 60. What does the blade already laid have?"
  choices:
    - 40, because a copy is a snapshot
    - 60, because it follows its template
    - 10, the class default
    - 0 until it is woken
  answerIndex: 0
  explanation: A copy takes the template's values at the moment it is made and never looks back.
- id: spot-class-default
  type: spot-the-bug
  prompt: A layer wants every blade it lays from now on to have the tuned damage. Which line changes blades far outside the layer too?
  code: |
    void ADojoBladeLayer::BeginPlay()
    {
    	Super::BeginPlay();
    	GetMutableDefault<ADojoBlade>()->Damage = TunedBlade->Damage;
    }
  bugLine: 4
  fix: Spawn each blade with the tuned blade as its template, and leave the class default object alone.
  explanation: The class default object is where every spawn of the class starts, so this changes every plain blade anywhere in the game for the rest of the session.
- id: when-not-hand-clone
  type: multiple-choice
  prompt: "A teammate wants to hand-write a Clone function on a UObject subclass that copies each field. What is the main risk compared with DuplicateObject?"
  choices:
    - It can only copy integers
    - It cannot run during play
    - A field added later is silently left out of the copy
    - It makes the class abstract
  answerIndex: 2
  explanation: A field-by-field copy has to be updated with every new field, and nothing fails when someone forgets.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when copying an example is the wrong choice.
  modelAnswer: When the variants are only data that designers should edit side by side, when copies should follow later edits, or when it is unclear which references a copy should share, a table, a shared record, or a clearer design is better.
  rubric:
    - Names a case such as kinds that are only data, copies needing to follow edits, or unclear sharing
    - Names a better alternative, such as a table, asset, or shared record
  explanation: Copy a tuned example for state you want to start from; use data for kinds and shared records for edits that should spread.
```
