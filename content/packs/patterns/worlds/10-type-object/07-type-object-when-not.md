---
id: p10-type-object-when-not
title: When a kind should be a class
order: 7
kind: concept
difficulty: 2
patterns: [type-object]
skills: [type-object, architecture]
terms: [primary-data-asset, data-table, blueprint-class, uclass]
prerequisites: [p10-breakdown-armory]
xp: 25
estimatedMinutes: 7
concepts:
  - Kinds that differ in behavior, not numbers, need code; data cannot hold new logic
  - A handful of kinds that never change are clearer as plain code
  - A flag on the kind that every caller checks is behavior sneaking into data
  - Every object must have a valid kind, which is a new thing to check and to load
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the armory adds a boomerang that flies back to its thrower and a net that tangles a fighter's legs. Both are weapon kinds. What do they need that a weapon kind asset cannot give them?"
choices:
  - Nothing; set their damage in the asset
  - Their own behavior, written as code, such as a subclass or a component the kind names
  - A bigger data table
  - A second kind asset each
answerIndex: 1
explanation: Flying back and tangling legs are new logic. Data can pick between behaviors that already exist in code, but it cannot write new ones.
```

# Card

Kinds as data pay when there are many kinds that differ in their numbers and designers want to make and tune them. Outside that, they add an indirection with nothing behind it.

**The kinds differ in behavior.** A boomerang that returns and a net that tangles are not numbers. Put behavior in code: a subclass per behavior, or a component the kind names with `TSubclassOf`, and keep the numbers in the kind. When most new kinds need new code, the kind asset is only a label.

**A flag that every caller checks.** `bIsBoomerang` on the weapon kind, checked in the throw code, the catch code, and the HUD, is a subclass written as an if statement. Once flags on a kind start choosing code paths across the game, give that behavior a class.

**Few kinds that never change.** Three kinds of arena gate, fixed by the arena's design, with no designer asking to tune them, are clearer as three constants or one enum. A kind class, assets, and a pointer on every gate earn nothing.

**Every object now needs a valid kind.** A weapon with no kind, or a row handle naming a deleted row, is a new way to break. Decide what an object without a kind does (refuse, or fall back to the class's defaults), and validate kinds in the editor so a typo in a row name is found before play.

**The numbers are truly per object.** If every placed lantern really needs its own fuel time, with no two alike, there is no kind to share; leave the number on the lantern.

# Example

```cpp
// Right-sized: the numbers live in the kind, and the one new behavior is a class the kind names.
UPROPERTY(EditDefaultsOnly, Category = "Weapon Kind")
float Damage = 10.f;

UPROPERTY(EditDefaultsOnly, Category = "Weapon Kind")
TSubclassOf<UDojoArenaThrowBehavior> ThrowBehavior;
```

# Questions

```yaml
- id: when-not-gates
  type: multiple-choice
  prompt: "Which of these needs kinds as data least?"
  choices:
    - Sixty kinds of gear that designers add every week
    - Three arena gates, fixed by the arena's layout, that nobody tunes
    - Forty lantern looks tuned in balance passes
    - Twelve quiver kinds edited side by side
  answerIndex: 1
  explanation: Three fixed gates have nothing for designers to add or tune; plain code is clearer.
- id: when-not-behavior
  type: multiple-choice
  prompt: "Half of the new weapon kinds need logic of their own: returning, tangling, splitting into three. What fits?"
  choices:
    - More fields on the weapon kind asset until every behavior is a setting
    - Keep the numbers in the kind, and put each behavior in code that the kind names, such as a subclass or a component class
    - One giant switch on the kind's name
    - Copying the weapon class per kind
  answerIndex: 1
  explanation: Data selects; code behaves. The kind can point at the behavior class, which keeps new kinds of existing behaviors as data.
- id: spot-flag
  type: spot-the-bug
  prompt: Behavior is sneaking into the kind. Which line shows it?
  code: |
    void ADojoArenaWeapon::Throw(const FVector& Direction)
    {
    	Launch(Direction * Kind->ThrowSpeed);
    	if (Kind->bReturnsToThrower) StartReturnFlight();
    	PlaySound(Kind->ThrowSound);
    }
  bugLine: 4
  fix: Make returning a behavior class the kind names, such as a return-flight component added when the weapon spawns, so the weapon's code does not grow an if per special kind.
  explanation: A flag that picks a code path is the start of a switch over kinds, the thing the pattern was meant to remove.
- id: when-not-validate
  type: multiple-choice
  prompt: "A quiver's row handle names Flaming, but the row was renamed FireArrow. What should the design already have decided?"
  choices:
    - Nothing; the game should crash so someone notices
    - What a quiver without a kind does, such as staying empty, and an editor check that reports handles naming missing rows
    - That rows can never be renamed
    - That quivers copy their row when placed
  answerIndex: 1
  explanation: Kinds as data add a link that can break; handle the missing kind safely and catch broken links before play.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when kinds as data are the wrong tool.
  modelAnswer: When what sets the kinds apart is logic rather than numbers, when there are only a few fixed kinds nobody tunes, or when the numbers really differ per object, since then the kind asset adds indirection without letting designers do anything new.
  rubric:
    - Names a case such as behavior differences, few fixed kinds, or truly per-object numbers
    - Names the better choice, such as code or subclasses for behavior, or plain values
  explanation: The pattern pays when many kinds differ in data that designers own.
```
