---
id: p8-many-kinds-one-toolbox
title: Twenty traps, twenty copies of the same code
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [subclass-sandbox, object-model]
terms: [uclass, abstract-specifier, tactoriterator, ufunction]
prerequisites: [p6-later-not-now]
xp: 25
estimatedMinutes: 7
concepts:
  - Many small subclasses that each reach into the same systems copy the same code and drift apart
  - A base class can own the shared rules and offer protected tools, leaving each subclass one function to write
  - Every link to other systems then lives in one class, the base
  - An abstract base cannot be placed or spawned by itself
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the arena has twenty kinds of trap, each written as its own actor class that searches for fighters, applies damage, plays a cue, and runs its own cooldown timer. The combat team changes how damage is applied. How many classes do they have to open?"
choices:
  - One, the damage system
  - All twenty traps, plus the damage system
  - Only the traps that deal the most damage
  - None, damage changes never reach traps
answerIndex: 1
explanation: Every trap calls the damage code itself, so every trap depends on it. When the way damage works changes, all twenty have to be read and changed.
```

# Card

Games are full of families: traps, chests, hazards, card effects, enemy attacks. Each member does something a little different, so each gets its own subclass. Left alone, each subclass also does all the plumbing itself: it searches the world for targets, hurts them, plays a cue, sets a timer, and checks a cooldown. Twenty subclasses mean twenty copies of that plumbing. Every one of them depends on the damage system, the cue system, and the timer manager. Change any of those and all twenty need attention. The copies also drift: one trap forgets its cooldown check, another applies damage to downed fighters.

**Give the family a toolbox.** Put the plumbing in a base class, once. The base offers a small set of **protected** functions: hurt fighters in a radius, push them back, play a cue. Subclasses can call these, outside code cannot, and since they are not virtual, subclasses cannot change how they work. The base also owns the rules every member must follow, in a public, non-virtual entry point: refuse during the cooldown, call the subclass's own step, start the cooldown.

**Leave one function to write.** Each subclass overrides exactly one protected function, the step that makes it different, and builds that step from the toolbox. A new trap is a dozen lines and needs no headers beyond the base's.

**Mark the base abstract.** `UCLASS(Abstract)` tells the engine the base is not a thing on its own: the editor will not place it and spawning it fails. Only concrete members of the family exist in a level.

**Coupling moves to one place.** The base includes the fighter, the timer manager, and whatever else the tools touch. Each trap's own files mention nothing but the trap base. When damage changes, one class changes.

# Example

```cpp
// Before: every trap does its own plumbing.
void ADojoArenaSawTrap::Spring()
{
	if (bCoolingDown) return;

	for (TActorIterator<ADojoArenaFighter> It(GetWorld()); It; ++It)
	{
		if (FVector::Dist(It->GetActorLocation(), GetActorLocation()) < SawRadius) It->TakeHit(SawDamage);
	}

	bCoolingDown = true;
	GetWorldTimerManager().SetTimer(CooldownTimer, this, &ADojoArenaSawTrap::EndCooldown, CooldownSeconds, false);
}

// After: the base owns the rule and the tools; the saw writes only what makes it a saw.
void ADojoArenaSawTrap::Trigger()
{
	PlayCue(TEXT("SawWhirr"));
	DamageFightersInRadius(SawRadius, SawDamage);
}
```

# Questions

```yaml
- id: where-coupling-goes
  type: multiple-choice
  prompt: "After the traps share a base class that owns the tools, which classes include the fighter's header?"
  choices:
    - Every trap
    - Only the base class
    - None of them
    - Only the trap that does the most damage
  answerIndex: 1
  explanation: The base's tools are the only code that touches fighters, so the base is the only class that needs their header.
- id: fill-protected
  type: fill-blank
  prompt: "Tools a base class offers only to its subclasses are declared ___, so outside code cannot call them."
  acceptedAnswers: [protected]
  explanation: Protected members are visible to subclasses and hidden from everyone else.
- id: spot-copied-plumbing
  type: spot-the-bug
  prompt: This trap derives from the trap base, which offers DamageFightersInRadius. Which line goes around the toolbox?
  code: |
    void ADojoArenaSawTrap::Trigger()
    {
    	PlayCue(TEXT("SawWhirr"));
    	for (TActorIterator<ADojoArenaFighter> It(GetWorld()); It; ++It) It->TakeHit(SawDamage);
    }
  bugLine: 4
  fix: Call DamageFightersInRadius(SawRadius, SawDamage) from the base instead of searching and hurting fighters directly.
  explanation: The loop hurts every fighter in the world, ignores range and downed fighters, and ties the saw to the fighter class again.
- id: abstract-meaning
  type: multiple-choice
  prompt: "What does UCLASS(Abstract) on the trap base do?"
  choices:
    - Makes all of its functions virtual
    - Stops the base itself from being placed or spawned, so only its subclasses exist in levels
    - Hides it from Blueprint
    - Makes its properties read-only
  answerIndex: 1
  explanation: Abstract marks the class as a parent only; the editor will not place it and spawning it fails.
- id: explain-toolbox
  type: explain-in-one-sentence
  prompt: In one sentence, say what a family of subclasses gains when the base class offers protected tools and owns the shared rules.
  modelAnswer: Each subclass writes only the one step that makes it different using the base's tools, so the shared plumbing exists once, the rules cannot be forgotten, and only the base depends on the systems behind the tools.
  rubric:
    - Says subclasses write one step from the base's tools
    - Names a benefit such as less duplication, rules enforced, or coupling in one place
  explanation: The family stays wide and shallow, and every change to the plumbing is one change.
```
