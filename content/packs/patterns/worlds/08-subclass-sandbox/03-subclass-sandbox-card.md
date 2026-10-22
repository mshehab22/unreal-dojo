---
id: p8-subclass-sandbox-card
title: The base supplies, the subclass decides
order: 3
kind: concept
difficulty: 2
patterns: [subclass-sandbox]
skills: [subclass-sandbox]
terms: [abstract-specifier, blueprint-protected, blueprintnativeevent, gas, uclass]
prerequisites: [p8-trap-family]
xp: 25
estimatedMinutes: 8
concepts:
  - Subclass Sandbox gives a family of subclasses one overridable hook plus protected, non-virtual tools from the base
  - The base owns the public entry and its rules; the subclass owns what happens inside the hook
  - Blueprint children get the same shape through a BlueprintNativeEvent hook and BlueprintProtected tools
  - UGameplayAbility is the engine's large example of this shape
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the trap base gains a new tool, ShakeCamera. Which classes have to change for every existing trap to keep working?"
choices:
  - Every trap, to add the new function
  - None; existing traps never call it, and new traps can
  - Only traps that already shake the camera
  - The camera system, to know about every trap
answerIndex: 1
explanation: A new tool only adds to the toolbox. Existing subclasses are untouched, and any trap that wants the shake can now call it.
```

# Card

What you built for the arena traps is the **Subclass Sandbox** pattern. A family of subclasses shares one base class that gives them two things: one method to implement (the hook where each subclass's own behavior lives) and protected tools to build it from. The subclass decides what happens; the base supplies everything it is allowed to do.

**Two kinds of functions on the base.**

- **The hook.** One protected function that each subclass overrides: `Trigger`, `OnInteract`, `OnUnleash`. In plain C++ it can be pure virtual; for Blueprint children it is a `BlueprintNativeEvent`.
- **The tools.** Protected, usually non-virtual functions that do the shared work: hurt fighters in a radius, take an item, play a cue. Mark them `BlueprintCallable` with `meta = (BlueprintProtected)` and a Blueprint child can call them on itself, while no other graph can.

**The base owns the entry.** A public, non-virtual function (`Spring`, `Interact`) checks the shared rules, calls the hook, and finishes the shared work. No subclass can skip the rules, because no subclass can replace the entry.

**Choosing tools.** Add a tool when more than one subclass needs it, or when it changes the game's state. Reading something harmless (where the trap is) does not need a tool. When the toolbox grows past a screen, group related tools into a small helper object the base hands out, before the base turns into a dumping ground.

**The engine's own example.** `UGameplayAbility` in the Gameplay Ability System has this shape. Outside code calls `TryActivateAbility`; the ability system calls the protected, non-virtual `CallActivateAbility`, which does the shared setup and calls `ActivateAbility`, the function subclasses override (Blueprint children use the `K2_ActivateAbility` event). Inside it, subclasses use provided helpers such as `CommitAbility` for costs and cooldowns and `GetAvatarActorFromActorInfo` to reach the actor. Many other engine bases work the same way: `AActor` with `BeginPlay` and its helpers, Behavior Tree task nodes with `ExecuteTask`, animation notifies with `Notify`.

# Example

```cpp
// A Blueprint-friendly sandbox: the hook is a native event, the tools are for children only.
UCLASS(Abstract, Blueprintable)
class ADojoArenaShrine : public AActor
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, Category = "Shrine")
	void Pray(ADojoArenaFighter* Fighter);

protected:
	UFUNCTION(BlueprintNativeEvent, Category = "Shrine")
	void OnPrayed(ADojoArenaFighter* Fighter);

	UFUNCTION(BlueprintCallable, Category = "Shrine", meta = (BlueprintProtected))
	void HealFighter(ADojoArenaFighter* Fighter, float Amount);
};
```

# Questions

```yaml
- id: card-effects
  type: which-pattern
  prompt: "A tavern card game in the arena has eighty unique cards, each with its own small script, and every script must draw, discard, and deal damage through the game's rules, never around them. Which pattern gives card authors a safe toolbox?"
  choices: [subclass-sandbox, type-object, command, singleton]
  answer: subclass-sandbox
  distractorNotes:
    - choice: type-object
      why: Data assets fit cards that differ only in numbers; these cards each need their own logic.
    - choice: command
      why: A played card could be a command for an undo history, but the question is what a card's script may do and how.
    - choice: singleton
      why: A global rules object card scripts call directly would still let each card reach anything; the toolbox limits what they touch.
  explanation: A card base with a protected hook and protected tools lets each card be one short script built only from the rules' own operations.
- id: spot-it-gas
  type: multiple-choice
  prompt: "In UGameplayAbility, which function does a subclass override to say what the ability does?"
  choices:
    - TryActivateAbility
    - CallActivateAbility
    - ActivateAbility
    - CommitAbility
  answerIndex: 2
  explanation: TryActivateAbility is the outside entry and CallActivateAbility the base's own non-virtual step; ActivateAbility is the hook subclasses override, and CommitAbility is one of the tools they call inside it.
- id: spot-virtual-entry
  type: spot-the-bug
  prompt: This shrine base should guarantee every shrine checks its cooldown before running. Which line lets a subclass skip that check?
  code: |
    UCLASS(Abstract)
    class ADojoArenaShrine : public AActor
    {
    	GENERATED_BODY()
    public:
    	virtual void Pray(ADojoArenaFighter* Fighter);
    protected:
    	virtual void OnPrayed(ADojoArenaFighter* Fighter);
    };
  bugLine: 6
  fix: Make Pray non-virtual so it always runs the base's cooldown check before calling the OnPrayed hook.
  explanation: A virtual entry point can be overridden, and an override can leave out the rule; the entry belongs to the base.
- id: fill-blueprint-protected
  type: fill-blank
  prompt: "A base class tool that Blueprint children may call on themselves, but other graphs may not, is a BlueprintCallable UFUNCTION with meta = (___)."
  acceptedAnswers: [BlueprintProtected]
  explanation: BlueprintProtected keeps the tool inside the family, the Blueprint version of a protected function.
- id: explain-sandbox
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Subclass Sandbox pattern.
  modelAnswer: A base class gives a family of subclasses a single hook to fill in plus protected tools to build it from, so each subclass writes only its own behavior while the base keeps the rules and every link to other systems.
  rubric:
    - Mentions one overridable method plus protected tools from the base
    - Mentions the rules or the links to other systems living in the base
  explanation: Subclasses decide; the base supplies.
```
