---
id: f1-ufunction-specifiers
title: UFUNCTION opens a function to Blueprint and the console
order: 4
kind: concept
difficulty: 2
patterns: []
skills: [reflection]
terms: [ufunction, blueprintcallable, blueprintpure, blueprintimplementableevent, blueprintnativeevent]
prerequisites: [f1-uproperty-specifiers]
xp: 25
estimatedMinutes: 7
concepts:
  - BlueprintCallable and BlueprintPure expose C++ functions as nodes
  - BlueprintImplementableEvent and BlueprintNativeEvent let Blueprint supply the body
  - Callers call the event, never its _Implementation
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a public C++ function `void Ring();` has no macro above it. A designer opens the actor's Blueprint and searches for a Ring node. What do they find?"
choices:
  - A Ring node with an execution pin
  - A Ring node without execution pins
  - No Ring node at all
  - A Ring event they can override
answerIndex: 2
explanation: Blueprint only lists functions that reflection knows about, and a function becomes known through UFUNCTION.
```

# Card

`UFUNCTION(...)` records a function with reflection, the same way UPROPERTY records a field. Once recorded, the engine can find the function by name: Blueprint can call it, delegates can bind to it, and the console command `ke * <FunctionName>` can run it on every actor that has it.

Specifiers for C++ bodies that Blueprint calls:

- `BlueprintCallable`: a node with execution pins, for functions that change something.
- `BlueprintPure`: a node with no execution pins, for getters that change nothing. Pair it with `const`.

Specifiers for bodies that Blueprint provides:

- `BlueprintImplementableEvent`: C++ declares it and calls it; there is no C++ body at all. If no Blueprint implements it, the call does nothing.
- `BlueprintNativeEvent`: C++ writes a default body in a function named `<Name>_Implementation`, and a Blueprint child may override it. Code always calls `<Name>(...)`; the generated version picks the Blueprint override when one exists and the C++ default otherwise. Calling `_Implementation` yourself skips any override.

A handler bound to a dynamic delegate needs `UFUNCTION()` with no specifiers, because the binding finds it by name.

# Example

```cpp
UCLASS()
class ADojoF1Gong : public AActor
{
	GENERATED_BODY()

public:
	// Changes state, so it gets execution pins.
	UFUNCTION(BlueprintCallable, Category = "Gong")
	void Hit();

	// Only reads, so it is a pure node.
	UFUNCTION(BlueprintPure, Category = "Gong")
	int32 GetHitCount() const;

protected:
	// Blueprint may replace the reaction; C++ supplies a default.
	UFUNCTION(BlueprintNativeEvent, Category = "Gong")
	void React();
	virtual void React_Implementation();

	// Purely cosmetic and entirely up to Blueprint.
	UFUNCTION(BlueprintImplementableEvent, Category = "Gong")
	void PlaySparkle();

private:
	int32 HitCount = 0;
};

void ADojoF1Gong::Hit()
{
	HitCount++;

	// Calls the Blueprint override if there is one, otherwise React_Implementation.
	React();
	PlaySparkle();
}
```

# Questions

```yaml
- id: pick-pure
  type: multiple-choice
  prompt: "Which function should be BlueprintPure rather than BlueprintCallable?"
  choices:
    - OpenGate, which starts the gate moving
    - GetRemainingHits, which returns a number and changes nothing
    - ResetScore, which sets the score to zero
    - SpawnTarget, which places a new actor
  answerIndex: 1
  explanation: A pure node has no execution pins, so it suits functions that only read state.
- id: fill-implementation
  type: fill-blank
  prompt: "A BlueprintNativeEvent named React has its C++ default body in a function named React___."
  acceptedAnswers: [_Implementation]
  explanation: The header tool generates React itself, which dispatches to a Blueprint override or to React_Implementation.
- id: spot-direct-implementation
  type: spot-the-bug
  prompt: A designer overrode React in a Blueprint child of the gong, but hitting it still runs only the C++ default. Which line is wrong?
  code: |
    void ADojoF1Gong::Hit()
    {
    	HitCount++;
    	React_Implementation();
    }
  bugLine: 4
  fix: Call React instead of React_Implementation so the generated dispatcher can pick the Blueprint override.
  explanation: _Implementation is only the C++ default; calling it directly bypasses the override.
- id: implementable-without-blueprint
  type: multiple-choice
  prompt: "C++ calls a BlueprintImplementableEvent named PlaySparkle on an actor whose Blueprint never implemented it. What happens?"
  choices:
    - A crash, because the function has no body
    - A compile error in the C++ caller
    - Nothing, the call returns without doing anything
    - The engine logs an error every time
  answerIndex: 2
  explanation: An unimplemented BlueprintImplementableEvent with no return value is simply a call that does nothing.
- id: explain-native-event
  type: explain-in-one-sentence
  prompt: In one sentence, say when you would pick BlueprintNativeEvent over BlueprintImplementableEvent.
  modelAnswer: Pick BlueprintNativeEvent when the function needs a sensible C++ default that still works if no Blueprint overrides it.
  rubric:
    - Mentions a C++ default body
    - Says Blueprint can still override it
  explanation: BlueprintImplementableEvent has no C++ body, so it fits purely cosmetic hooks where doing nothing is fine.
```
