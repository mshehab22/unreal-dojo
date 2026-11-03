---
id: m4-hearing-it-go
title: Hearing an actor leave play
order: 7
kind: concept
difficulty: 2
patterns: []
skills: [spawning, delegates]
terms: [on-destroyed, destroy, endplay, isvalid, tweakobjectptr, adddynamic]
prerequisites: [m4-bomb-rack]
xp: 30
estimatedMinutes: 8
concepts:
  - OnDestroyed tells anyone listening that an actor has left play, after its own EndPlay
  - A list of spawned actors is kept true by listening, not by checking every frame
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a spawner keeps an array of the bombs it made. A bomb's fuse runs out and it destroys itself. What happens to the spawner's array?"
choices:
  - The bomb is removed from it automatically
  - Nothing, unless the spawner hears about the bomb leaving and removes it, or checks each entry before using it
  - The array is emptied
  - The game crashes the next time the array is read
answerIndex: 1
explanation: An array does not watch what it holds. The entry stays until someone removes it; with a UPROPERTY array the collector later clears it to nullptr, but the count the spawner keeps is wrong in the meantime.
```

# Card

Every actor has an **`OnDestroyed`** event, a dynamic multicast delegate that passes the actor that is leaving: `AActor* DestroyedActor`. Bind to it on an actor you spawned, and you hear the moment it leaves play, whoever destroyed it and for whatever reason:

```cpp
Bomb->OnDestroyed.AddDynamic(this, &ADojoKeeper::HandleBombDestroyed);
```

When `Destroy()` runs, the actor's own `EndPlay` runs first, so its timers and bindings are cleaned up, and then `OnDestroyed` is broadcast. In the handler the actor is still there to read, its location for instance, and `IsValid` still says yes, but it is already on its way out: `DestroyedActor->IsActorBeingDestroyed()` is true, its shapes are removed and it is marked for collection right after the listeners return, so it must not be kept or used afterwards. `SetLifeSpan(3.f)` is a timer that ends in the same `Destroy`, so it fires the same event.

Listening turns a list of spawned actors into one you can trust. A spawner that removes each actor from its array in `OnDestroyed` always knows how many are alive and which ones, without looking at them every frame. The other honest way is to keep weak pointers, `TArray<TWeakObjectPtr<AActor>>`, and skip the ones that read as invalid whenever you use the list; that needs no binding, but the count is only right at the moment you clean the list.

Two habits keep this tidy. Bind once per actor, right after it is spawned, so one actor is never heard twice. And when the listener itself leaves play first, unbind with `RemoveDynamic` in its `EndPlay`, or simply let the engine skip it: a dynamic delegate does not call into a listener that has been destroyed, but unbinding says plainly that the relationship is over.

Reacting inside the handler is allowed, with one care: if the handler destroys other actors, their events fire inside yours, so do not change an array while you are looping over it in the same call. Copy it first, or collect what to do and do it after the loop.

# Example

```cpp
void ADojoHatchery::HandleChickDestroyed(AActor* DestroyedActor)
{
	Chicks.Remove(Cast<ADojoChick>(DestroyedActor));

	UE_LOG(LogTemp, Log, TEXT("A chick left at %s; %d remain"), *DestroyedActor->GetActorLocation().ToString(), Chicks.Num());
}
```

# Questions

```yaml
- id: order
  type: multiple-choice
  prompt: "When an actor is destroyed, which runs first?"
  choices:
    - Its OnDestroyed listeners, then its EndPlay
    - Its EndPlay, then its OnDestroyed listeners
    - Only one of the two runs
  answerIndex: 1
  explanation: Destroying an actor ends its play first and then tells the listeners, so by the time they hear it, its own timers are already stopped.
- id: fill-bind
  type: fill-blank
  prompt: "To hear when a spawned bomb leaves play, write Bomb->___.AddDynamic(this, &ADojoKeeper::HandleBombDestroyed)."
  acceptedAnswers: [OnDestroyed]
  explanation: OnDestroyed is the actor's own event for leaving play, with one parameter, the actor itself.
- id: keep-pointer
  type: spot-the-bug
  prompt: A keeper remembers the last bomb that blew so it can show where. Later reads of that pointer go wrong. Which line is wrong?
  code: |
    void ADojoKeeper::HandleBombDestroyed(AActor* DestroyedActor)
    {
    	Live--;
    	LastBlast = DestroyedActor;
    }
  bugLine: 4
  fix: Keep the location, not the actor, because the destroyed actor must not be used after the handler returns.
  explanation: The actor is on its way out during the handler; afterwards it is invalid and will be collected.
- id: lifespan
  type: multiple-choice
  prompt: "A bomb calls SetLifeSpan(2.f). Two seconds later, does its OnDestroyed fire?"
  choices:
    - No, a life span quietly removes the actor
    - Yes, a life span ends in the same Destroy
    - Only if the bomb ticks
  answerIndex: 1
  explanation: SetLifeSpan schedules a Destroy, and every Destroy broadcasts OnDestroyed.
- id: weak-list
  type: multiple-choice
  prompt: "What is the cost of keeping a TArray of TWeakObjectPtr instead of listening to OnDestroyed?"
  choices:
    - Weak pointers keep destroyed actors alive
    - The list still holds entries for actors that are gone until you skip or clean them, so its count is not live
    - Weak pointers cannot be stored in arrays
  answerIndex: 1
  explanation: A weak pointer turns invalid on its own, but the array entry stays; listening keeps the list exact at every moment.
- id: explain-ondestroyed
  type: explain-in-one-sentence
  prompt: In one sentence, say how a spawner can always know how many of its actors are still in play.
  modelAnswer: It binds each actor's OnDestroyed when it spawns it and removes the actor from its list in the handler, so the list changes exactly when an actor leaves.
  rubric:
    - Names OnDestroyed, or listening for the actor leaving
    - Says the list is updated in the handler
  explanation: The event does the bookkeeping at the moment of change, so nothing has to look every frame.
```
