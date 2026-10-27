---
id: p9-one-prop-too-many-jobs
title: A crate, a statue, and a chest that cannot share a parent
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [component, object-model]
terms: [actor-component, scene-component, findcomponentbyclass, newobject, register-component, blueprint-function-library]
prerequisites: [p8-subclass-sandbox-when-not]
xp: 25
estimatedMinutes: 7
concepts:
  - One class that holds every ability an object might need grows without end, and its abilities tangle together
  - Inheritance cannot share abilities that objects need in overlapping mixes
  - Each ability can live in its own small object that any actor carries, so a kind of object becomes a mix of parts
  - An actor finds a part it carries with FindComponentByClass, and parts added at runtime are created with NewObject and registered
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the arena has crates that break and drop loot, statues that break and drop nothing, and chests that drop loot when opened but never break. The team writes ABreakableProp and ALootProp as two parent classes. What does the crate derive from?"
choices:
  - ABreakableProp, and the loot code is copied into it
  - ALootProp, and the breaking code is copied into it
  - Both, through a second parent class
  - None of these is clean; the crate needs both abilities and a class has one line of parents
answerIndex: 3
explanation: Unreal classes have one parent class. Whichever parent the crate picks, the other ability has to be copied in or pushed up into a shared base that statues and chests then carry too.
```

# Card

Arena props start simple. Then a crate needs to break, a statue needs to break, a chest needs to drop loot, a crate needs to drop loot too, and a banner just stands there. Two common answers both go wrong.

**One class that does everything.** `ADojoArenaProp` gets health, loot, an open flag, and a dozen booleans to switch each part off. Every prop carries every field. The health code checks whether this prop drops loot, the loot code checks whether this prop can break, and a change to one ability means reading all of them. The class only grows.

**A tree of parent classes.** `ABreakableProp` and `ALootProp` are each clean, until a kind needs both. A class has one line of parents, so the crate gets one ability by inheritance and the other by copying, or both move up into a shared base and every statue carries loot code it never uses. Each new mix makes the tree worse.

**Split by ability instead.** Put health in one small object and loot in another, each a `UActorComponent`. A component is an object an actor owns and carries; it knows its owner (`GetOwner()`) but nothing about which kind of actor that is. A crate is then any actor carrying a health part and a loot part; a statue carries only health; a chest only loot. No class per mix, and each ability's code lives in one place.

**Finding a part.** Code that has an actor and wants its health calls `Actor->FindComponentByClass<UDojoArenaHealth>()`, which returns the first component of that class the actor carries, or `nullptr`. The caller does not care whether the actor is a crate, a statue, or a gladiator.

**Adding a part at runtime.** A part made while the game runs is created with `NewObject<UDojoArenaHealth>(Actor)`, which makes the actor its owner at once, and switched on with `RegisterComponent`. Calling `AddInstanceComponent` as well lists it on the actor so the editor's Details panel and saving can see it. A small `UBlueprintFunctionLibrary` of static functions, one per kind of prop, can do that assembly and also be called from Blueprint.

A `USceneComponent` is the kind of component that also has a place in the world and can have other components attached; health and loot need neither, so they are plain `UActorComponent`s.

# Example

```cpp
// Before: one class carries every ability, switched on and off by flags.
UCLASS()
class ADojoArenaProp : public AActor
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere) bool bCanBreak = true;
	UPROPERTY(EditAnywhere) float Health = 100.f;
	UPROPERTY(EditAnywhere) bool bDropsLoot = false;
	UPROPERTY(EditAnywhere) FName LootItem;
	UPROPERTY(EditAnywhere) bool bCanOpen = false;
};

// After: an actor is a mix of small parts, and code asks for the part it needs.
if (UDojoArenaHealth* Health = Prop->FindComponentByClass<UDojoArenaHealth>()) Health->ApplyDamage(25.f);
```

# Questions

```yaml
- id: why-not-parents
  type: multiple-choice
  prompt: "Why can't a crate that breaks and drops loot simply derive from both ABreakableProp and ALootProp?"
  choices:
    - Unreal classes have a single parent class, so one of the two abilities would be copied or pushed into a shared base
    - Crates are not allowed to be actors
    - Two parents would make the crate tick twice
    - The editor hides classes with two parents
  answerIndex: 0
  explanation: An Unreal class derives from one parent class. Abilities that objects need in overlapping mixes do not fit a single line of parents.
- id: fill-find
  type: fill-blank
  prompt: "To get the health part an actor carries, call Actor->___<UDojoArenaHealth>(), which returns nullptr if there is none."
  acceptedAnswers: [FindComponentByClass, GetComponentByClass]
  explanation: FindComponentByClass returns the first component of that class on the actor; GetComponentByClass does the same.
- id: spot-flag-tangle
  type: spot-the-bug
  prompt: This one-class prop has its abilities tangled. Which line makes the health code depend on the loot ability?
  code: |
    void ADojoArenaProp::ApplyDamage(float Amount)
    {
    	if (!bCanBreak) return;
    	Health = FMath::Max(0.f, Health - Amount);
    	if (Health <= 0.f && bDropsLoot) DropLoot();
    }
  bugLine: 5
  fix: Let the health part only announce that it ran out, and let a separate loot part listen and drop; health then knows nothing about loot.
  explanation: Once health checks the loot flag, the two abilities cannot change or move apart.
- id: runtime-part
  type: multiple-choice
  prompt: "A prop is assembled while the game runs. What turns a part made with NewObject into a working part of the actor?"
  choices:
    - Nothing; NewObject is enough
    - RegisterComponent, which switches it on
    - Calling the part's constructor again
    - SpawnActor with the part's class
  answerIndex: 1
  explanation: A component made at runtime with the actor as its outer is owned by the actor already, but it does nothing until it is registered; AddInstanceComponent is only for the editor and saving to see it.
- id: explain-parts
  type: explain-in-one-sentence
  prompt: In one sentence, say why a crate, a statue, and a chest are easier to build from parts than from a tree of parent classes.
  modelAnswer: Each ability lives once in its own component, so each kind of prop is just the mix of parts it carries, with no class per mix and no ability copied or forced on props that do not need it.
  rubric:
    - Says each ability is written once as a part an actor carries
    - Names a problem with the parent classes, such as copying, one parent only, or unused code pushed into a base
  explanation: Kinds of objects become mixes of parts rather than branches of a tree.
```
