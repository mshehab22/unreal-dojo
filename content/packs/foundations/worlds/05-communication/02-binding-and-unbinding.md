---
id: f5-binding-and-unbinding
title: AddDynamic, Broadcast, and unbinding in EndPlay
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [communication]
terms: [adddynamic, broadcast, unbinding-delegates, blueprintassignable, ufunction]
prerequisites: [f5-delegates]
xp: 25
estimatedMinutes: 7
concepts:
  - Listeners bind in BeginPlay and unbind in EndPlay
  - A dynamic delegate's handler must be a UFUNCTION with the exact parameters
  - Binding twice calls twice
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a lamp calls `Lever->OnPulled.AddDynamic(this, &ADojoF5LeverLamp::HandlePulled)` in BeginPlay, but HandlePulled has no UFUNCTION macro. What happens when the lever is pulled?"
choices:
  - The lamp reacts normally
  - It compiles, but an ensure reports the binding failed when the lamp starts, and the lamp never reacts
  - The lamp reacts twice
  - The lever stops broadcasting
answerIndex: 1
explanation: AddDynamic compiles because it passes the handler's name as text; at run time the delegate looks that name up through reflection, finds no UFUNCTION, reports it with an ensure, and never binds.
```

# Card

The listener does the wiring. In its `BeginPlay`, it binds a handler to the broadcaster's delegate:

`Lever->OnPulled.AddDynamic(this, &ADojoF5LeverLamp::HandlePulled);`

The handler is a `UFUNCTION()` whose parameters match the delegate's exactly (type and order). A mismatch is caught when you build.

The broadcaster fires with `OnPulled.Broadcast(true)`. Each bound handler runs, in no order you should rely on.

Unbind in `EndPlay`: `Lever->OnPulled.RemoveDynamic(this, &ADojoF5LeverLamp::HandlePulled);`. Dynamic delegates hold their listeners weakly and skip dead ones, but a listener that leaves play without unbinding stays in the list until it is collected, and may still be called while it is being destroyed. Unbinding in EndPlay makes the lifetime explicit and works for every reason play can end.

Binding the same handler twice with `AddDynamic` triggers an ensure in development builds and is still added, so the handler then runs twice per broadcast; `AddUniqueDynamic` binds only if it is not already bound. `IsAlreadyBound` and `Contains` ask without binding.

A `UPROPERTY(BlueprintAssignable)` delegate appears in Blueprint as an event you can bind with Bind Event or assign in the Details panel, so designers can react without C++.

# Example

```cpp
void ADojoF5ValveGauge::BeginPlay()
{
	Super::BeginPlay();

	if (IsValid(Valve)) Valve->OnTurned.AddDynamic(this, &ADojoF5ValveGauge::HandleTurned);
}

void ADojoF5ValveGauge::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (IsValid(Valve)) Valve->OnTurned.RemoveDynamic(this, &ADojoF5ValveGauge::HandleTurned);

	Super::EndPlay(EndPlayReason);
}

// Must be a UFUNCTION with exactly the delegate's parameters.
void ADojoF5ValveGauge::HandleTurned(float NewFlow)
{
	ShowFlow(NewFlow);
}
```

# Questions

```yaml
- id: where-bind
  type: multiple-choice
  prompt: "Where should a listener bind to another actor's delegate?"
  choices: [The constructor, BeginPlay, Tick, The destructor]
  answerIndex: 1
  explanation: The other actor exists and play has started in BeginPlay; the constructor also builds the class default object, often with no world.
- id: fill-remove
  type: fill-blank
  prompt: "In EndPlay, the lamp unbinds with Lever->OnPulled.___(this, &ADojoF5LeverLamp::HandlePulled)."
  acceptedAnswers: [RemoveDynamic]
  explanation: RemoveDynamic is the partner of AddDynamic.
- id: spot-wrong-signature
  type: spot-the-bug
  prompt: OnTurned is declared with one float parameter named NewFlow. This build fails at the AddDynamic line. Which line is the real cause?
  code: |
    UFUNCTION()
    void HandleTurned(int32 NewFlow);
  bugLine: 2
  fix: Make the handler take a float, matching the delegate's parameter type.
  explanation: A handler's parameters must match the delegate's exactly.
- id: twice
  type: multiple-choice
  prompt: "A gauge's BeginPlay runs its binding code twice by mistake. Which call avoids a double binding?"
  choices: [AddDynamic, AddUniqueDynamic, Broadcast, Clear]
  answerIndex: 1
  explanation: AddUniqueDynamic binds only if that object and function are not already bound.
- id: explain-unbind
  type: explain-in-one-sentence
  prompt: In one sentence, say why a listener unbinds in EndPlay.
  modelAnswer: EndPlay runs whenever the listener leaves play, so unbinding there guarantees the broadcaster never calls an object that is gone or being destroyed.
  rubric:
    - Mentions EndPlay running for every way of leaving play
    - Mentions not being called after leaving
  explanation: "Bind in BeginPlay and unbind in EndPlay, so the pair brackets the listener's life."
```
