---
id: p1-multicast-delegates
title: Announce it once, let anyone listen
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [delegates]
terms: [multicast-delegate, dynamic-multicast-delegate, broadcast, adddynamic, unbinding-delegates, blueprintassignable, endplay, ufunction]
prerequisites: [p1-architecture-lens, f1-ufunction-specifiers]
xp: 25
estimatedMinutes: 8
concepts:
  - A multicast delegate is a list of callbacks the owner fires with Broadcast
  - Native multicast binds with AddUObject; dynamic multicast binds UFUNCTIONs with AddDynamic and can be BlueprintAssignable
  - The listener includes the announcer's header and binds itself; the announcer never learns who listens
  - Every binding has an exit, usually in the listener's EndPlay
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: when an arena foe is defeated, the scoreboard, the crowd audio, and the tutorial all want to react. Next month a fourth system will want to as well. Where should the knowledge of who reacts live so that adding the fourth system does not touch the foe's code?"
choices:
  - In the foe, as one pointer and one call per system
  - In each reacting system, which tells the foe it wants to hear about defeats
  - In a switch statement in the game mode
  - "Nowhere: every system checks every foe each frame"
answerIndex: 1
explanation: If each listener signs itself up, the foe only has to say "I was defeated" to whoever signed up, and a fourth listener is a change to the fourth listener alone. Polling every frame also avoids touching the foe, but it costs work every frame and still reacts late.
```

# Card

A **multicast delegate** is a list of callbacks that its owner can fire all at once. The owner declares the delegate type, holds one as a member, and calls `Broadcast` when something happens. Anything that wants to react adds itself to the list. The owner never sees who is on it.

**Declaring one.** The macro names the type and its parameters. A native delegate is for C++ listeners only and is fast:

`DECLARE_MULTICAST_DELEGATE_OneParam(FDojoArenaOnGateForced, ADojoArenaGate*);`

A dynamic one goes through reflection, so Blueprint can bind to it when the member is marked `BlueprintAssignable`. Its parameters carry names, and it lives in a reflected header:

`DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoArenaOnGateForcedDynamic, ADojoArenaGate*, Gate);`

**Binding.** For a native delegate, `AddUObject(this, &UMyClass::HandleGateForced)` binds a member function and returns an `FDelegateHandle`. The binding holds the object weakly, so a destroyed listener is skipped rather than crashing the broadcast. For a dynamic delegate, `AddDynamic(this, &UMyClass::HandleGateForced)` binds by function name through reflection, so the handler must be a `UFUNCTION`; without the macro the bind compiles and then fails when the delegate fires. `AddUniqueDynamic` does the same but refuses a second copy of the same binding.

**Unbinding.** Every binding needs an exit, or a listener that is gone, or reset, keeps a stale entry in the list. Native: `Remove(Handle)` or `RemoveAll(this)`. Dynamic: `RemoveDynamic(this, &UMyClass::HandleGateForced)`. The usual place is the listener's **EndPlay**, which runs when the actor is destroyed or its level unloads.

**Dependency direction.** The listener includes the announcer's header and binds itself. The announcer includes nothing of its listeners. In this world, every quest with two actors states that direction and the rubric checks it.

**Fire after the change.** Listeners often read the announcer while they react, so change the state first and broadcast last.

# Example

```cpp
// DojoArenaGate.h: the gate announces; it has no idea who listens.
class ADojoArenaGate;

DECLARE_MULTICAST_DELEGATE_OneParam(FDojoArenaOnGateForced, ADojoArenaGate*);

UCLASS()
class ADojoArenaGate : public AActor
{
	GENERATED_BODY()

public:
	/** Opens the gate, then tells every listener. */
	UFUNCTION(BlueprintCallable, Category = "Gate")
	void ForceOpen();

	/** Fired after the gate opens; C++ listeners bind with AddUObject. */
	FDojoArenaOnGateForced OnGateForced;

private:
	bool bOpen = false;
};

void ADojoArenaGate::ForceOpen()
{
	if (bOpen) return;

	bOpen = true;
	OnGateForced.Broadcast(this);
}

// DojoArenaCrowd.cpp: the listener includes the gate's header, binds itself, and leaves on EndPlay.
void ADojoArenaCrowd::WatchGate(ADojoArenaGate* Gate)
{
	if (!IsValid(Gate)) return;

	WatchedGate = Gate;
	WatchedGate->OnGateForced.AddUObject(this, &ADojoArenaCrowd::HandleGateForced);
}

void ADojoArenaCrowd::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (IsValid(WatchedGate)) WatchedGate->OnGateForced.RemoveAll(this);

	Super::EndPlay(EndPlayReason);
}
```

# Questions

```yaml
- id: blueprint-can-bind
  type: multiple-choice
  prompt: "A designer wants to bind a Blueprint event to the gate's announcement in the Event Graph. What must the C++ side provide?"
  choices:
    - A DECLARE_MULTICAST_DELEGATE member with AddUObject
    - A dynamic multicast delegate held in a UPROPERTY marked BlueprintAssignable
    - A public TFunction member
    - A BlueprintPure getter that returns the delegate
  answerIndex: 1
  explanation: Only dynamic delegates are reflected, and BlueprintAssignable is the specifier that lets a Blueprint bind to the multicast one.
- id: fill-broadcast
  type: fill-blank
  prompt: "Inside ForceOpen, after setting bOpen, the gate notifies every listener with OnGateForced.___(this);"
  acceptedAnswers: [Broadcast]
  explanation: Broadcast walks the list and calls every bound function with the given arguments.
- id: spot-missing-ufunction
  type: spot-the-bug
  prompt: This listener binds to a dynamic multicast delegate. The bind compiles, and the game stops with an error the first time the delegate fires. Which line causes it?
  code: |
    UCLASS()
    class ADojoArenaCrowd : public AActor
    {
    	GENERATED_BODY()
    public:
    	void HandleGateForced(ADojoArenaGate* Gate);
    };
  bugLine: 6
  fix: Put UFUNCTION() above HandleGateForced so reflection can find it by name.
  explanation: AddDynamic stores the function's name, and the broadcast looks that name up through reflection; a plain C++ function is not in the table.
- id: direction
  type: multiple-choice
  prompt: "The gate announces OnGateForced and the crowd reacts. Which file includes which?"
  choices:
    - The gate's source file includes the crowd's header
    - Both include each other
    - The crowd's source file includes the gate's header, and the gate includes nothing of the crowd
    - Neither includes the other; they meet through the game mode
  answerIndex: 2
  explanation: The listener depends on the announcer, never the reverse. That one-way arrow is what lets you add or delete a listener without touching the gate.
- id: explain-endplay
  type: explain-in-one-sentence
  prompt: In one sentence, say why a listener removes its binding in EndPlay.
  modelAnswer: The announcer can outlive the listener, so without removing the binding the list keeps a stale entry for an actor that is gone, and a recreated listener would be bound twice.
  rubric:
    - Says the announcer may outlive the listener
    - Names the consequence, such as a stale entry, a lapsed listener, or a duplicate binding
  explanation: Each binding should have a matching exit in the listener, so the list always reflects who is really listening.
```
