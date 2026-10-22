---
id: m6-timers-with-payloads
title: Timers that remember what they are for
order: 4
kind: concept
difficulty: 3
patterns: []
skills: [delegates, time]
terms: [timer-delegate, timer-handle, timer-manager]
prerequisites: [m6-checkpoints]
xp: 25
estimatedMinutes: 7
concepts:
  - An FTimerDelegate can carry extra arguments that are handed to the function when the timer fires
  - One function and one handle per thing being timed, kept in a map
  - A finished thing must clear its own timer, or the timer fires anyway
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a tracker runs a time limit for three quests at once with SetTimer(Handle, this, &UTracker::HandleTimeUp, 20.f). When one runs out, how does HandleTimeUp know which quest failed?"
choices:
  - It receives the quest as an argument automatically
  - It cannot; the plain form passes nothing, so the timer has to carry the quest itself
  - The timer handle stores the quest
  - The last quest started is always the one that failed
answerIndex: 1
explanation: The member-function form of SetTimer calls a function with no arguments; to say which quest, the timer has to be built from a delegate that carries the quest as a payload.
```

# Card

Pack 1 started timers with `SetTimer(Handle, this, &AThing::Function, Seconds)`. That form calls a function with **no arguments**, which is fine when an object has one thing to time. A quest tracker times many quests at once, and when a clock runs out it must know which quest ran out.

An `FTimerDelegate` is a single-cast delegate that the timer manager can fire. Build it with a **payload**, extra values stored inside the delegate and passed to the function when it runs:

```cpp
const FTimerDelegate TimeUp = FTimerDelegate::CreateUObject(this, &UDojoTracker::HandleTimeUp, Quest);
GetWorld()->GetTimerManager().SetTimer(Handle, TimeUp, 20.f, false);
```

`HandleTimeUp(UDojoQuestData* Quest)` is then called with that quest. The payload is copied when the delegate is made, so later changes to the variable do not reach it.

`CreateUObject` binds a member function of a UObject and stops firing if that object is destroyed; `CreateLambda` and `CreateUFunction` (by name, for a UFUNCTION) are the other common forms. This kind of delegate is not dynamic, so the function does not need to be a UFUNCTION.

Each running clock still needs its own **handle**, or starting a second one replaces the first. Keep them in a map from the thing being timed to its handle, such as `TMap<TObjectPtr<UDojoQuestData>, FTimerHandle>`. Clear the right handle when the thing ends early: a quest completed in time must clear its clock, or the clock fires later and fails a quest that is already done. When the handler might still run for an old reason, it should also check the state before acting.

# Example

```cpp
void ADojoBombSquad::Arm(ADojoBomb* Bomb, float Fuse)
{
	const FTimerDelegate Boom = FTimerDelegate::CreateUObject(this, &ADojoBombSquad::HandleFuseOut, Bomb);
	GetWorldTimerManager().SetTimer(Fuses.FindOrAdd(Bomb), Boom, Fuse, false);
}

void ADojoBombSquad::Defuse(ADojoBomb* Bomb)
{
	if (FTimerHandle* Fuse = Fuses.Find(Bomb)) GetWorldTimerManager().ClearTimer(*Fuse);
}

void ADojoBombSquad::HandleFuseOut(ADojoBomb* Bomb)
{
	if (IsValid(Bomb) && !Bomb->IsDefused()) Bomb->Explode();
}
```

# Questions

```yaml
- id: fill-create
  type: fill-blank
  prompt: "To make a timer delegate that calls a member function of this UObject with Quest as an extra argument, write FTimerDelegate::___(this, &UTracker::HandleTimeUp, Quest)."
  acceptedAnswers: [CreateUObject]
  explanation: CreateUObject binds a member function of a UObject, and any values after the function pointer become the payload.
- id: one-handle
  type: spot-the-bug
  prompt: Three quests are started; only the last one ever fails on time. Which line is wrong?
  code: |
    void UDojoTracker::StartClock(UDojoQuestData* Quest)
    {
    	const FTimerDelegate TimeUp = FTimerDelegate::CreateUObject(this, &UDojoTracker::HandleTimeUp, Quest);
    	GetWorld()->GetTimerManager().SetTimer(ClockHandle, TimeUp, Quest->TimeLimitSeconds, false);
    }
  bugLine: 4
  fix: Keep one handle per quest, for example in a TMap from quest to FTimerHandle.
  explanation: Setting a timer on a handle that is already running replaces it, so one shared handle keeps only the latest clock.
- id: needs-ufunction
  type: multiple-choice
  prompt: "Does the function bound with FTimerDelegate::CreateUObject need to be a UFUNCTION?"
  choices:
    - Yes, every delegate needs reflection
    - No, FTimerDelegate is not a dynamic delegate, so it binds by function pointer
    - Only when it has a payload
  answerIndex: 1
  explanation: Only dynamic delegates bind by name through reflection; this one stores a plain function pointer.
- id: early-finish
  type: multiple-choice
  prompt: "A timed quest is completed in 12 of its 20 seconds. What must happen so it is not failed at 20?"
  choices:
    - Nothing, completed quests cannot fail
    - Clear that quest's timer when it completes, and have the handler ignore quests that are no longer active
    - Pause every timer
  answerIndex: 1
  explanation: The clock keeps running unless cleared, and a guard in the handler protects against any clock that slips through.
- id: explain-payload
  type: explain-in-one-sentence
  prompt: In one sentence, say what a payload on a timer delegate is for.
  modelAnswer: It stores extra values in the delegate, such as which quest the clock belongs to, so the one handler knows what ran out when the timer fires.
  rubric:
    - Mentions extra values stored with the delegate
    - Mentions the handler knowing which thing the timer was for
  explanation: A payload lets one function serve many clocks.
```
