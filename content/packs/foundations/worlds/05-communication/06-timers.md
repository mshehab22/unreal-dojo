---
id: f5-timers
title: Timers for delays and repeats
order: 6
kind: concept
difficulty: 2
patterns: []
skills: [communication, time]
terms: [timer-manager, timer-handle, endplay]
prerequisites: [f5-interact]
xp: 25
estimatedMinutes: 7
concepts:
  - A timer calls a function after a delay, once or on repeat, with no Tick
  - The handle is how you ask about a timer and how you stop it
  - Clear timers in EndPlay
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: `SetTimer(Handle, this, &ADojoF5Door::Close, 3.f, false)` runs while the same Handle already has 1 second left. What happens?"
choices:
  - Both timers run, so Close is called twice
  - The old timer is replaced, so Close is called once, 3 seconds from now
  - The call is ignored because the handle is busy
  - It asserts
answerIndex: 1
explanation: Setting a timer on a handle that is already running replaces it; a cooldown that should refuse a restart must check first.
```

# Card

Many gameplay rhythms are "do this later" or "do this every N seconds": a door that closes after 3 seconds, a turret that fires twice a second, a cooldown. A **timer** does that without Tick.

`GetWorldTimerManager().SetTimer(Handle, this, &AMyActor::Function, Seconds, bLoop)` schedules Function on this object after Seconds, once or repeating. An optional last argument sets a different first delay. Components reach the same manager with `GetWorld()->GetTimerManager()`.

The **timer handle** (`FTimerHandle`) is your ticket for that timer. Keep it as a member to ask about the timer and to stop it:

- `IsTimerActive(Handle)`: still waiting?
- `GetTimerRemaining(Handle)`: seconds left, or -1 when not active.
- `ClearTimer(Handle)`: cancel it.

Setting a timer on a handle that is still running replaces the old one. That is what you want for "reset the countdown" and exactly wrong for a cooldown that must refuse an early press, which has to check `IsTimerActive` first.

Clear your timers in `EndPlay` (or call `ClearAllTimersForObject(this)`), so nothing fires for an object that has left play. Timers run on game time: they pause with the game and slow down with `slomo`.

# Example

```cpp
// Closes the door 3 seconds after it opens, unless it is opened again first.
void ADojoF5Door::Open()
{
	SetOpen(true);
	GetWorldTimerManager().SetTimer(CloseTimer, this, &ADojoF5Door::Close, CloseDelay, false);
}

void ADojoF5Door::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	GetWorldTimerManager().ClearTimer(CloseTimer);

	Super::EndPlay(EndPlayReason);
}
```

# Questions

```yaml
- id: timer-or-tick
  type: multiple-choice
  prompt: "A beacon should blink every 0.5 seconds. What fits best?"
  choices: [A looping timer, Tick with an accumulator, A delegate, A Delay node in Tick]
  answerIndex: 0
  explanation: A looping timer states the rhythm directly and costs nothing between blinks.
- id: fill-active
  type: fill-blank
  prompt: "To ask whether a timer is still waiting, call GetWorldTimerManager().___(Handle)."
  acceptedAnswers: [IsTimerActive]
  explanation: IsTimerActive answers without changing the timer.
- id: spot-restart
  type: spot-the-bug
  prompt: Pressing dash during the cooldown restarts the cooldown instead of being refused. Which line is wrong?
  code: |
    bool UDojoF5Dash::TryDash()
    {
    	GetWorld()->GetTimerManager().SetTimer(CooldownTimer, this, &UDojoF5Dash::Ready, 1.2f, false);
    	return true;
    }
  bugLine: 3
  fix: Return false without setting the timer when IsTimerActive(CooldownTimer) says a cooldown is running.
  explanation: Setting a running handle replaces its timer, so the cooldown starts over on every press.
- id: clear-where
  type: multiple-choice
  prompt: "Where should an actor clear the timers it started?"
  choices: [BeginPlay, EndPlay, The constructor, Tick]
  answerIndex: 1
  explanation: EndPlay runs for every way of leaving play.
- id: explain-handle
  type: explain-in-one-sentence
  prompt: In one sentence, say what a timer handle is for.
  modelAnswer: It identifies one scheduled timer so you can ask how long is left, check whether it is running, and cancel or replace it.
  rubric:
    - Mentions identifying a specific timer
    - Mentions querying or clearing it
  explanation: Without the handle you can schedule a timer but never talk to it again.
```
