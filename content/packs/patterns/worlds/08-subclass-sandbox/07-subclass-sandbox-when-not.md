---
id: p8-subclass-sandbox-when-not
title: When a family does not need a base
order: 7
kind: concept
difficulty: 2
patterns: [subclass-sandbox]
skills: [subclass-sandbox, architecture]
terms: [abstract-specifier, actor-component, gas, uclass]
prerequisites: [p8-breakdown-attack-moves]
xp: 25
estimatedMinutes: 6
concepts:
  - Members that differ only in numbers are data, not subclasses
  - A base that keeps gaining tools only one member uses is turning into a dumping ground
  - Capabilities mixed freely across unrelated actors suit components better than one base class
  - When the Gameplay Ability System is already in the project, abilities belong there, not in a second base
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the arena has thirty kinds of training dummy. They differ only in health, size, and color, and none has any behavior of its own. A teammate proposes a dummy base class with thirty subclasses. What is the better shape?"
choices:
  - Thirty subclasses, each overriding a hook
  - One dummy class whose numbers come from data, such as a data asset per kind
  - A base class with thirty BlueprintProtected tools
  - Thirty unrelated actor classes
answerIndex: 1
explanation: Subclass Sandbox is for members with their own behavior. When only numbers differ, a class per kind is a compile per kind for nothing; data does it.
```

# Card

A sandbox base earns its place when many members each need their own logic and must all follow the same rules. Outside that, it is a layer to read through.

**Only the numbers differ.** If every member runs the same code with different health, speed, or damage, the members are data. Later in this pack a world builds that shape, with a data asset per kind; until then, editable properties on one class do it.

**The base becomes a dumping ground.** Each new member asks for one more tool, used only by itself, and the base grows a tool for everything. Every member then depends on all of it, and a change to the base risks all of them. When tools serve one member only, leave them in that member; when a group of tools hangs together, move it into a small helper object the base hands out.

**Capabilities cross families.** If a pillar is also a spike trap, a chest is also a hazard, and a lever is also a door, one base class cannot be the parent of all of them. Capabilities that mix freely across unrelated actors are components, which any actor can carry.

**Only one or two members.** A base for two subclasses, with no third in sight, is speculation. Write the two plainly and extract the base when the third arrives and the shared parts are clear.

**The engine already has one.** When a project uses the Gameplay Ability System, abilities go into `UGameplayAbility` subclasses, with its tags, costs, and cooldowns. A second hand-written ability base beside it duplicates that machinery and splits the team's abilities in two.

# Example

```cpp
// Right-sized: the dummies differ only in numbers, so one class with editable data covers all thirty.
UCLASS()
class ADojoArenaDummy : public AActor
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere, Category = "Dummy", meta = (ClampMin = "1"))
	float MaxHealth = 100.f;

	UPROPERTY(EditAnywhere, Category = "Dummy", meta = (ClampMin = "0.1"))
	float Scale = 1.f;
};
```

# Questions

```yaml
- id: when-not-numbers
  type: multiple-choice
  prompt: "Which family needs a sandbox base least?"
  choices:
    - Eighty card effects, each with its own small script
    - Forty enemy kinds that differ only in health, speed, and mesh
    - Twenty traps, each doing something different within the same cooldown rule
    - A dozen interactables that each react differently to a visitor
  answerIndex: 1
  explanation: Enemies that differ only in numbers are data; the other families each need their own logic inside shared rules.
- id: when-not-dumping-ground
  type: multiple-choice
  prompt: "The trap base now has thirty tools, and most are used by exactly one trap. What is the better move?"
  choices:
    - Keep adding tools; the base is the place for everything
    - Move single-use tools back into their traps, and group related tools into a helper object the base hands out
    - Make every tool public
    - Split each trap into its own unrelated class
  answerIndex: 1
  explanation: A tool belongs in the base when the family shares it; otherwise it is weight every trap carries.
- id: spot-special-case
  type: spot-the-bug
  prompt: This hazard base has started serving one particular hazard. Which line puts a single member's special case into the shared base?
  code: |
    void ADojoArenaHazardBase::Unleash()
    {
    	if (bCoolingDown) return;
    	if (IsA(ADojoArenaQuicksand::StaticClass())) SinkSpeed *= 2.f;
    	OnUnleash();
    	StartCooldown();
    }
  bugLine: 4
  fix: Move the quicksand's rule into the quicksand's own OnUnleash, so the base knows nothing about any particular hazard.
  explanation: A base that checks for one subclass now depends on it, which is the coupling the pattern exists to remove.
- id: when-not-components
  type: multiple-choice
  prompt: "Pillars, statues, and doors in the arena may each also be a spike trap, and some may be two kinds of trap at once. What fits?"
  choices:
    - A trap base class that pillars, statues, and doors all derive from
    - A spike trap component, and other trap components, that any actor can carry
    - Copying the spike code into each class
    - A global trap manager that every actor calls
  answerIndex: 1
  explanation: A capability shared across unrelated actors, possibly several at once, is a component; a single base class cannot be every actor's parent.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when a sandbox base class is the wrong tool.
  modelAnswer: When members differ only in data, when only one or two exist, when the capability must mix across unrelated actors, or when the engine's own base such as UGameplayAbility already covers the family.
  rubric:
    - Names at least one case such as data-only members, too few members, cross-cutting capabilities, or an existing engine base
    - Names the better choice for it, such as data, components, or the engine's class
  explanation: The pattern pays when many members need their own logic inside shared rules.
```
