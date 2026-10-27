---
id: m1-priority-and-consume
title: Layers of controls, priority, and who gets the key
order: 6
kind: concept
difficulty: 3
patterns: []
skills: [input]
terms: [input-mapping-context, local-player-subsystem, input-consumption]
prerequisites: [m1-move-pad]
xp: 30
estimatedMinutes: 9
concepts:
  - Mapping contexts are layers; a higher priority number is offered a key first
  - An action that consumes input hides its keys from the layers below it, even if nothing is bound to it
  - Context changes take effect shortly after the call, and a key already held is ignored until it is released
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a gameplay context maps Space to Jump at priority 0. A menu context that maps Space to Confirm is then added at priority 10. The player presses Space. What happens?"
choices:
  - Jump and Confirm both fire
  - Jump fires, because it was added first
  - Confirm fires and Jump does not
  - Neither fires, because the two conflict
answerIndex: 2
explanation: The higher priority context is offered the key first, and by default an action that takes a key hides it from the contexts below.
```

# Card

A player can have many mapping contexts switched on at once, added with **`AddMappingContext(Context, Priority)`** on the Enhanced Input local player subsystem and taken away with **`RemoveMappingContext(Context)`**. `HasMappingContext` asks whether one is active. Think of them as layers. When two layers map the same key, the one with the **higher priority number** is offered the key first.

What happens next is **input consumption**. Every input action has `bConsumeInput`, on by default. If the action in the higher layer takes the key, the lower layers never see it: their mappings of that key are dropped when the player's mappings are rebuilt. Set `bConsumeInput` to false on the higher action and the key reaches both layers. This is how a pause or menu context works: map the gameplay keys to a do-nothing action in a high layer and the game stops hearing them. Consumption is a property of the mapping, so the action does not need any function bound to it. Removing the context hands the keys back.

Two details catch people out:

- Changes are not instant. Unless the options say otherwise, the player's mappings are rebuilt shortly after the call, so keys behave the old way for the rest of that frame.
- If the player is already holding a key when a context that maps it is added, that key is ignored until it is released and pressed again (for yes or no actions). This is `bIgnoreAllPressedKeysUntilRelease` in `FModifyContextOptions`, on by default. It stops a held attack key from firing the moment a menu closes.

Give contexts that share keys different priorities, and use numbers with room between them, for example gameplay at 0, vehicle at 5, menu at 10.

# Example

```cpp
void ADojoMenuHost::OpenMenu(UEnhancedInputLocalPlayerSubsystem* Subsystem)
{
	Subsystem->AddMappingContext(MenuContext, 10);
}

void ADojoMenuHost::CloseMenu(UEnhancedInputLocalPlayerSubsystem* Subsystem)
{
	Subsystem->RemoveMappingContext(MenuContext);
}
```

# Questions

```yaml
- id: both-fire
  type: multiple-choice
  prompt: "Gameplay maps Space to Jump at priority 0. A menu maps Space to Confirm at priority 10, and the Confirm action has bConsumeInput set to false. The player presses Space. What fires?"
  choices:
    - Only Confirm
    - Only Jump
    - Both Confirm and Jump
    - Neither
  answerIndex: 2
  explanation: Confirm does not take the key, so the key also reaches the lower layer.
- id: fill-remove
  type: fill-blank
  prompt: "To take a context off a player, call ___ on the Enhanced Input local player subsystem."
  acceptedAnswers: [RemoveMappingContext]
  explanation: AddMappingContext puts a layer on and RemoveMappingContext takes it off; it is safe to call for a context that is not active.
- id: low-priority
  type: spot-the-bug
  prompt: The menu opens, but Space still jumps instead of confirming. Which line is wrong?
  code: |
    void ADojoMenuHost::OpenMenu(UEnhancedInputLocalPlayerSubsystem* Subsystem)
    {
    	Subsystem->AddMappingContext(GameplayContext, 0);
    	Subsystem->AddMappingContext(MenuContext, -5);
    }
  bugLine: 4
  fix: Give the menu context a higher priority number than the gameplay context.
  explanation: The layer with the higher number is offered keys first; the menu was placed below gameplay.
- id: held-key
  type: multiple-choice
  prompt: "The player is already holding E when a context that maps E is added with the default options. When does the new E mapping first fire?"
  choices:
    - At once, on the same frame
    - After the player releases E and presses it again
    - Never, until the context is removed and added again
  answerIndex: 1
  explanation: By default keys that are down while the mappings are rebuilt are ignored until released.
- id: no-binding
  type: multiple-choice
  prompt: "A pause context maps W to an action that has no function bound to it, with bConsumeInput on. Does it stop W from moving the pawn?"
  choices:
    - No, an action with nothing bound does nothing at all
    - Yes, because consumption is decided by the mapping, not by what is bound
    - Only if the action is also a trigger
  answerIndex: 1
  explanation: Consumption happens when the player's mappings are rebuilt, so the lower layer's W mapping is dropped whether or not anything listens to the high layer's action.
- id: explain-layers
  type: explain-in-one-sentence
  prompt: In one sentence, say how a pause menu can stop the gameplay keys without touching any gameplay code.
  modelAnswer: It adds a mapping context with a higher priority that maps those keys to an action which consumes them, so the gameplay layer never sees them, and removing the context gives them back.
  rubric:
    - Says a higher-priority context is added
    - Says consumption hides the keys from the gameplay mappings
  explanation: The gameplay code is untouched; only the layers over it change.
```
