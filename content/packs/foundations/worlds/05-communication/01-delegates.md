---
id: f5-delegates
title: Delegates, a call that can be pointed anywhere
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [communication]
terms: [delegate, multicast-delegate, dynamic-delegate, dynamic-multicast-delegate]
prerequisites: [f4-fence]
xp: 25
estimatedMinutes: 7
concepts:
  - A delegate stores who to call, so the caller never names the callee
  - Multicast delegates call any number of listeners
  - Dynamic delegates are reflected, so Blueprint and saved bindings can use them
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a lever has a multicast delegate OnPulled with nobody bound to it. The lever calls `OnPulled.Broadcast(true)`. What happens?"
choices:
  - A crash, because there is nobody to call
  - Nothing, the broadcast simply has no listeners
  - A warning in the log every time
  - The lever calls its own Pull again
answerIndex: 1
explanation: Broadcasting an empty multicast delegate is safe and does nothing, which is why a broadcaster never needs to check who is listening.
```

# Card

So far, when one actor needed another to react, it held a pointer to that actor and called it: the score keeper reads the dummies, the director calls the carrier. That makes the caller depend on every class it calls. A **delegate** turns it around: it is a variable that stores "call this function on that object", filled in by the listener, and the owner just fires it.

Unreal declares delegates with macros that name the type and its parameters:

- `DECLARE_DELEGATE_OneParam(FDojoF5OnScore, int32)`: one listener, C++ only. Bind with `BindUObject` or `BindLambda`, call with `ExecuteIfBound`.
- `DECLARE_MULTICAST_DELEGATE_OneParam(...)`: any number of listeners, C++ only. Bind with `AddUObject` or `AddLambda`, call with `Broadcast`.
- `DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoF5OnLeverPulled, bool, bIsOn)`: any number of listeners, **reflected**. Note the parameter names in the macro. Only dynamic delegates can be a `UPROPERTY(BlueprintAssignable)` that Blueprints bind to, and they bind by function name, so their handlers must be `UFUNCTION()`s.

Dynamic delegates are a little slower and cannot bind lambdas; native ones are faster and invisible to Blueprint. Gameplay events that designers react to (health changed, door opened, lever pulled) are usually dynamic multicast; internal C++ plumbing is usually native.

The point is the direction of knowledge: the lever declares and fires OnPulled and never learns who listens. That is the Observer pattern's Unreal form, and Pack 2 gives it a full world.

# Example

```cpp
// A reflected event with one parameter; the macro names both the type and the parameter.
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoF5OnValveTurned, float, NewFlow);

UCLASS()
class ADojoF5Valve : public AActor
{
	GENERATED_BODY()

public:
	// Blueprints can bind to it; C++ uses AddDynamic.
	UPROPERTY(BlueprintAssignable, Category = "Valve")
	FDojoF5OnValveTurned OnTurned;

	void Turn(float NewFlow)
	{
		Flow = NewFlow;
		OnTurned.Broadcast(Flow);
	}

private:
	float Flow = 0.f;
};
```

# Questions

```yaml
- id: pick-delegate
  type: multiple-choice
  prompt: "A health component's change must reach a HUD widget made in Blueprint and a C++ sound player. Which delegate kind fits?"
  choices: [A single-cast native delegate, A native multicast delegate, A dynamic multicast delegate, A function pointer]
  answerIndex: 2
  explanation: Several listeners, one of them in Blueprint, need a reflected multicast delegate.
- id: fill-broadcast
  type: fill-blank
  prompt: "A multicast delegate calls every listener with OnPulled.___(true)."
  acceptedAnswers: [Broadcast]
  explanation: Broadcast calls each bound listener in turn and is safe with none bound.
- id: spot-macro-names
  type: spot-the-bug
  prompt: The header tool stops on this declaration. Which line is wrong?
  code: |
    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoF5OnValveTurned, float);
    UCLASS()
    class ADojoF5Valve : public AActor
    {
    	GENERATED_BODY()
    };
  bugLine: 1
  fix: Give the parameter a name after its type, as in float, NewFlow.
  explanation: Dynamic delegates are reflected, so each parameter needs a type and a name.
- id: direction
  type: multiple-choice
  prompt: "With a lever and lamps wired through the lever's OnPulled delegate, which statement is true?"
  choices:
    - The lever holds a list of lamp pointers it calls
    - Each lamp knows its lever; the lever never knows the lamps
    - Neither knows the other
  answerIndex: 1
  explanation: Listeners bind themselves to the event; the broadcaster just fires it.
- id: explain-delegate
  type: explain-in-one-sentence
  prompt: In one sentence, say what a delegate lets a lever do that a direct function call does not.
  modelAnswer: It lets the lever announce that it was pulled without knowing which objects react, because the listeners register themselves with the delegate.
  rubric:
    - Mentions the lever not knowing the listeners
    - Mentions listeners registering or binding themselves
  explanation: That one-way knowledge is what keeps the lever reusable.
```
