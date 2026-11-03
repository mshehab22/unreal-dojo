---
id: s2-instanced-effects
title: Small objects edited inside an asset
order: 6
kind: concept
difficulty: 3
patterns: []
skills: [reflection, data]
terms: [instanced-subobjects, abstract-specifier, uproperty, tsubclassof, data-asset]
prerequisites: [s2-ability-component]
xp: 30
estimatedMinutes: 9
concepts:
  - EditInlineNew on a class and Instanced on a pointer let a designer create and tune an object inside the Details panel
  - Abstract keeps the base class out of the list a designer picks from
  - An object inside a shared asset is shared too, so it holds settings and no per-use state
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: an ability asset has `UPROPERTY(EditAnywhere) TObjectPtr<UDojoExEffect> Effect;`, and UDojoExEffect is a plain UObject class with a Distance setting. A designer opens the asset. What can they put in the Effect field?"
choices:
  - A new effect of any child class, with its Distance shown right there to tune
  - Only an effect object that already exists somewhere as its own asset or in the level
  - Nothing; UObject pointers never show in Details
  - Only the class, as a dropdown of class names
answerIndex: 1
explanation: A plain object pointer is a reference to an object that lives somewhere else; creating a new one in place needs the class marked EditInlineNew and the property marked Instanced.
```

# Card

An ability asset says what the ability does as a list of effects: move the user ahead, push targets away, refill energy. Each effect is a small `UObject` with a few settings. The question is where those objects live and how a designer makes one.

A plain `UPROPERTY` pointer to a `UObject` is a reference: the Details panel offers a picker for objects that already exist, such as other assets. To let a designer create an object right inside the field, two specifiers work together, and the glossary calls them **instanced subobjects**:

- `UCLASS(EditInlineNew)` on the effect class says objects of this class may be created from a property field.
- `UPROPERTY(EditAnywhere, Instanced)` on the pointer, or on a `TArray` of them, says the object belongs to the owner: the field shows a dropdown of classes, creating one makes a new object whose outer is the asset, its settings appear inline to tune, and it is saved inside the asset's file. Duplicating the asset duplicates the effects with it.

`UCLASS(DefaultToInstanced)` on the class makes every property of that type instanced without writing `Instanced` each time; components work this way.

Mark the effect base `Abstract` as well, and the dropdown lists only the real kinds (dash, push, refill), never the base that does nothing. `EditInlineNew` is inherited by the children, so marking the base once is enough.

Compare it with `TSubclassOf<UDojoExEffect>`. A class reference picks a kind but cannot tune it: different numbers need a Blueprint child class per tuning, which is how Epic's Gameplay Ability System treats its gameplay effects. An instanced object picks the kind and holds its numbers in place.

One rule comes with the convenience. An asset is loaded once and shared by everyone who uses it, so the effect objects inside it are shared too. An effect may hold settings, but nothing that changes when it runs, such as a count of uses or the last target: two heroes using the same ability would overwrite each other. Anything that changes belongs to the user, in its components.

# Example

```cpp
/** Base of every effect; designers create its children inside assets. */
UCLASS(Abstract, EditInlineNew)
class UDojoExEffect : public UObject
{
	GENERATED_BODY()
};

/** One ability, with its effects created and tuned inside the asset. */
UCLASS()
class UDojoExAbility : public UDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere, Instanced, Category = "Ability")
	TArray<TObjectPtr<UDojoExEffect>> Effects;
};
```

# Questions

```yaml
- id: fill-instanced
  type: fill-blank
  prompt: "To let a designer create effects in place in an asset's Effects array, write UPROPERTY(EditAnywhere, ___, Category = \"Ability\")."
  acceptedAnswers: [Instanced]
  explanation: Instanced makes the field own its object, so the Details panel offers a new object of a chosen class instead of a reference to an existing one.
- id: abstract-in-dropdown
  type: multiple-choice
  prompt: The dropdown for a new effect lists the base class UDojoExEffect, which does nothing when it runs. What removes it from the list?
  choices:
    - Marking the base UCLASS(Abstract)
    - Making the base's hook pure virtual in C++ without any specifier
    - Removing EditInlineNew from the children
    - Marking the property Transient
  answerIndex: 0
  explanation: Abstract tells the engine and the editor the class is a parent only, so it is never offered as an object to create.
- id: spot-shared-state
  type: spot-the-bug
  prompt: Each hero may push three times per round. Two heroes use the same Shockwave asset, and after four pushes between them, neither hero's shockwave pushes anything. Which line is wrong?
  code: |
    UCLASS(EditInlineNew)
    class UDojoExPushEffect : public UDojoExEffect
    {
    	GENERATED_BODY()
    	int32 TimesUsed = 0;
    	virtual void OnApply(AActor* User) override;
    };
  bugLine: 5
  fix: Keep the use count on the user, for example in a component, because the effect object inside the asset is shared by every hero.
  explanation: Both heroes run the same effect object, so its counter adds up the uses of everyone who shares the asset.
- id: subclass-or-instanced
  type: multiple-choice
  prompt: A designer wants three push effects with different radii in three abilities, without making any new class or Blueprint. Which property fits?
  choices:
    - "UPROPERTY(EditAnywhere) TSubclassOf<UDojoExEffect> EffectClass;"
    - "UPROPERTY(EditAnywhere, Instanced) TObjectPtr<UDojoExEffect> Effect;"
    - "UPROPERTY(VisibleAnywhere) TObjectPtr<UDojoExEffect> Effect;"
    - "UPROPERTY(EditAnywhere) FName EffectName;"
  answerIndex: 1
  explanation: An instanced object holds its own settings, so each ability tunes its own radius; a class reference would need a child class per radius.
- id: explain-instanced
  type: explain-in-one-sentence
  prompt: In one sentence, say why an effect object created inside an ability asset must not keep a counter of how many times it ran.
  modelAnswer: The asset and the objects inside it are shared by every user of the ability, so a counter there would mix the uses of all of them.
  rubric:
    - Says the asset or the effect object is shared by every user
    - Says per-use state would mix users together
  explanation: Settings may live in shared data; state that changes per use belongs to the user.
```
