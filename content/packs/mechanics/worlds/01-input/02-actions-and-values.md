---
id: m1-actions-and-values
title: Actions, contexts, and the value they carry
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [input]
terms: [enhanced-input, input-action, input-mapping-context, finputactionvalue, input-modifier, legacy-input]
prerequisites: [m1-controls-plan]
xp: 25
estimatedMinutes: 8
concepts:
  - An input action names one verb and the type of value it produces; keys never appear in game code
  - A mapping context binds keys to actions, and modifiers on a mapping reshape the raw value
  - The handler reads the value as the type the action was set up with
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a character can move with W, A, S, D, the arrow keys, or a gamepad stick. How many different input pieces does the movement code have to know about?"
choices:
  - One for each device, so three
  - One for each key, so nine
  - "One: a single move action that hands over a number or a pair of numbers"
  - None; movement is read straight from the keyboard each frame
answerIndex: 2
explanation: In Enhanced Input the code listens to an action, not to keys. Which buttons produce the action is data in a mapping context.
```

# Card

Older Unreal input named actions and axes in Project Settings and bound them by string. **Enhanced Input** replaced that as the default in UE 5.1 and splits the job in three:

- An **Input Action** (`UInputAction`, assets are named `IA_...`) is one verb: Move, Jump, Zoom. It does not know any key. It has a **value type**: a yes or no (`Boolean`), one number (`Axis1D`), a pair (`Axis2D`), or three (`Axis3D`).
- An **Input Mapping Context** (`UInputMappingContext`, `IMC_...`) is a list of mappings from keys to actions. Several keys can feed one action, and one context can be switched on and off as a set.
- The game code binds a function to an action and receives an **`FInputActionValue`**. It reads the value as the type the action was set up with: `Value.Get<bool>()`, `Value.Get<float>()`, `Value.Get<FVector2D>()`.

A mapping can carry **modifiers**, small steps that reshape the raw key value before it reaches the action. A key gives 1 when it is down, so on a one-dimensional action `A` needs a **Negate** modifier to push the other way. On a two-dimensional action a key only fills the X slot, so `W` needs a **Swizzle Input Axis Values** modifier to move its 1 onto Y, and `S` needs a swizzle and a Negate. **Scalar** multiplies, and **Dead Zone** ignores a stick that has barely moved. Modifiers on a key mapping run first, in order; modifiers on the action asset itself run after them.

Designers normally make these as assets in the Content Browser and assign them in Details. The sandbox has no assets, so the quests in this world build them in C++ with `NewObject`. The classes are the same either way.

In the example below, E gives the action 1 and Q gives it -1, so the function bound to `ZoomAction` reads one float.

Your module's Build.cs must list `EnhancedInput`, and the project's input settings must name the Enhanced classes for the player input and the input component. The sandbox already does both.

# Example

```cpp
UInputAction* ZoomAction = NewObject<UInputAction>(this);
ZoomAction->ValueType = EInputActionValueType::Axis1D;

UInputMappingContext* ZoomContext = NewObject<UInputMappingContext>(this);
ZoomContext->MapKey(ZoomAction, EKeys::E);

FEnhancedActionKeyMapping& ZoomOut = ZoomContext->MapKey(ZoomAction, EKeys::Q);
ZoomOut.Modifiers.Add(NewObject<UInputModifierNegate>(ZoomContext));
```


# Questions

```yaml
- id: which-asset
  type: multiple-choice
  prompt: "Which asset says that W, A, S, D and the left stick all drive the move action?"
  choices:
    - The input action
    - The input mapping context
    - The pawn's constructor
    - The action value
  answerIndex: 1
  explanation: A mapping context holds the key to action list. The action only names the verb and its value type.
- id: value-type
  type: fill-blank
  prompt: "A move action that hands the pawn a left-right amount and a forward-back amount at once has the value type EInputActionValueType::___."
  acceptedAnswers: [Axis2D]
  explanation: A pair of numbers is an Axis2D value, read in code as an FVector2D.
- id: wrong-read
  type: spot-the-bug
  prompt: The move action is two-dimensional, but the pawn only ever slides sideways. Which line is wrong?
  code: |
    void ADojoWalker::Move(const FInputActionValue& Value)
    {
    	const float Push = Value.Get<float>();
    	AddActorLocalOffset(FVector(0.f, Push * Speed * GetWorld()->GetDeltaSeconds(), 0.f));
    }
  bugLine: 3
  fix: Read the value as an FVector2D, because the action produces a pair, and use both of its parts.
  explanation: Reading a two-dimensional value as a float keeps only its first part, so the forward and back part is thrown away.
- id: modifier-order
  type: multiple-choice
  prompt: "A key mapping carries a Negate modifier and its action asset carries a Scalar modifier. In which order do they run?"
  choices:
    - The action's Scalar first, then the mapping's Negate
    - The mapping's Negate first, then the action's Scalar
    - Both at once, so the order does not matter
  answerIndex: 1
  explanation: Modifiers on a key mapping are applied before the modifiers on the action asset.
- id: legacy
  type: multiple-choice
  prompt: "You find `PlayerInputComponent->BindAxis(TEXT(\"MoveForward\"), this, &AHero::MoveForward);` in an old project. What is it?"
  choices:
    - Enhanced Input, bound by action name
    - The legacy axis mapping style that Enhanced Input replaced as the default
    - A gamepad-only binding
  answerIndex: 1
  explanation: BindAxis with a name looked up a mapping in Project Settings. Enhanced Input binds an action asset instead.
- id: explain-action
  type: explain-in-one-sentence
  prompt: In one sentence, say why game code listens to an input action instead of to keys.
  modelAnswer: An action names what the player wants and carries a value, so the same code works for any keys or devices that a mapping context assigns to it.
  rubric:
    - Says the action is the thing the code listens to
    - Says which keys or devices produce it is decided elsewhere, in a mapping context
  explanation: The action is the stable name; the mapping is the part that changes.
```
