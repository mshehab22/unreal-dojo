---
id: f5-interfaces
title: Interfaces, a promise any class can keep
order: 4
kind: concept
difficulty: 3
patterns: []
skills: [communication]
terms: [uinterface, iinterface, blueprintnativeevent, cast]
prerequisites: [f5-lever]
xp: 30
estimatedMinutes: 8
concepts:
  - An interface lets unrelated classes answer the same call
  - Unreal interfaces have two halves, U for reflection and I for the functions
  - Call Blueprint-implementable interface functions through Execute_
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a keeper must open crates, ring bells, and pull levers when the player presses E. They share no parent class except AActor. Which is the cleanest way for the keeper to call them?"
choices:
  - Cast to each class in turn and call its own function
  - Give all three an interface with an Interact function and call that
  - Make all three derive from one big base class
  - Search for every actor with a tag
answerIndex: 1
explanation: An interface is a promise any class can keep, so the keeper calls Interact without knowing which class it has.
```

# Card

Casting asks "are you exactly this class?". When many unrelated classes should answer the same question, a chain of casts grows with every new class. An **interface** turns it around: each class promises to implement a function, and callers only ask "do you keep this promise?".

An Unreal interface is written in two halves in one header:

```cpp
UINTERFACE(Blueprintable)
class UDojoF5Interactable : public UInterface { GENERATED_BODY() };

class IDojoF5Interactable
{
	GENERATED_BODY()
public:
	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interact")
	bool Interact(AActor* Instigator);
};
```

`UDojoF5Interactable` is the reflected half: an empty class that lets the engine and Blueprint know the interface exists. `IDojoF5Interactable` holds the functions. A class keeps the promise by listing the I half as a second parent, `class ADojoF5Crate : public AActor, public IDojoF5Interactable`, and implementing `Interact_Implementation`.

To call it, first ask: `Target->Implements<UDojoF5Interactable>()`. Then call through the generated static helper `IDojoF5Interactable::Execute_Interact(Target, Instigator)`. Execute_ works whether the class implemented the function in C++ or in Blueprint. The two shortcuts both fail: calling `Interact` directly on the I class stops the program on a failed check for every implementer, because the generated body of an interface event only tells you to call Execute_ instead; and a Cast to the I class returns nullptr for a Blueprint implementer, which has no C++ I part. So always call BlueprintNativeEvent and BlueprintImplementableEvent functions through Execute_.

# Example

```cpp
// The keeper interacts with whatever it faces, without knowing what that is.
bool ADojoF5Keeper::InteractWith(AActor* Target)
{
	if (!IsValid(Target) || !Target->Implements<UDojoF5Interactable>()) return false;

	return IDojoF5Interactable::Execute_Interact(Target, this);
}
```

# Questions

```yaml
- id: interface-or-cast
  type: multiple-choice
  prompt: "Twelve kinds of pickup should all respond when the player walks over them. What should the player call?"
  choices:
    - A chain of twelve casts
    - An interface function every pickup implements
    - A tag search followed by a cast
  answerIndex: 1
  explanation: One interface call replaces the cast chain, and a thirteenth pickup needs no change to the player.
- id: fill-execute
  type: fill-blank
  prompt: "To call Interact on an actor whose implementation may be in Blueprint, use IDojoF5Interactable::___Interact(Target, Instigator)."
  acceptedAnswers: [Execute_]
  explanation: The Execute_ helper reaches C++ and Blueprint implementations alike.
- id: spot-implements-class
  type: spot-the-bug
  prompt: This check does not compile. Which line is wrong?
  code: |
    bool ADojoF5Keeper::CanInteract(AActor* Target) const
    {
    	return IsValid(Target) && Target->Implements<IDojoF5Interactable>();
    }
  bugLine: 3
  fix: Ask about the U half, Implements<UDojoF5Interactable>(), which is the reflected class the engine knows.
  explanation: Implements calls StaticClass on the type it is given, and only the reflected U class has one; the I class holds the functions but is not a UClass.
- id: two-halves
  type: multiple-choice
  prompt: "Which half of an Unreal interface does a class list as a parent to implement it?"
  choices: [The U half, The I half, Both, Neither; it is set in the editor]
  answerIndex: 1
  explanation: The class inherits the I half, which holds the functions it implements.
- id: explain-interface
  type: explain-in-one-sentence
  prompt: In one sentence, say when an interface is a better fit than a delegate.
  modelAnswer: An interface fits when a caller wants to ask many unrelated objects to do the same thing, while a delegate fits when one object wants to tell unknown listeners that something happened.
  rubric:
    - Ties the interface to a caller asking objects to act
    - Ties the delegate to announcing to listeners
  explanation: Interfaces carry requests outward; delegates carry news outward without knowing the audience.
```
