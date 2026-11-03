---
id: m4-holding-timers
title: A timer you can hold, ask, and stop
order: 4
kind: concept
difficulty: 2
patterns: []
skills: [time]
terms: [timer-manager, timer-handle, endplay, deltatime]
prerequisites: [m4-scatter]
xp: 30
estimatedMinutes: 9
concepts:
  - The handle is how you find a running timer again to ask about it or stop it
  - One handle holds one timer; two jobs that run at once need two handles
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a looping timer is set to run every 0.1 seconds, and one frame takes 0.4 seconds. How many times does its function run during that frame?"
choices:
  - Once, because a timer runs at most once a frame
  - Four times, to catch up on the time that passed
  - Not at all, because the frame was too long
  - It depends on whether the actor ticks
answerIndex: 1
explanation: A looping timer counts how many of its periods fit in the time that passed and calls its function that many times in the frame, so the count over a second stays right on a slow machine.
```

# Card

`GetWorldTimerManager().SetTimer(Handle, this, &AThing::Fire, Rate, bLoop, FirstDelay)` asks the world to call `Fire` after `Rate` seconds, once or over and over. The **handle**, an `FTimerHandle` you keep as a member, is the timer's name tag: everything else you do with that timer goes through it.

- `IsTimerActive(Handle)` says whether it is still waiting to fire.
- `GetTimerRemaining(Handle)` says how many seconds are left before it fires next, and `GetTimerElapsed(Handle)` how many have passed. With no timer behind the handle, both answer **-1**.
- `PauseTimer(Handle)` freezes it with its time left kept; `UnPauseTimer(Handle)` lets it carry on from there. `IsTimerPaused` tells the two apart.
- `ClearTimer(Handle)` cancels it and resets the handle.

A handle holds **one** timer. Calling `SetTimer` again with a handle that already has a running timer clears that timer and starts the new one from zero, which is how a cooldown restarts. That also means an actor doing two things on two clocks, say a fuse and a countdown label, needs two handles: sharing one would let the second `SetTimer` silently cancel the first. A rate of zero or less sets nothing and clears the handle's timer.

Timers run in game time. They stop while the game is paused, and they stretch under time dilation, so after `slomo 0.25` in the console a 2 second timer takes 8 real seconds. A **looping** timer whose period is shorter than a frame catches up: it runs as many times in that frame as periods have passed. A function that only redraws a label does not mind; a function that spawns something does, and should be written knowing it can run several times in one frame.

`FirstDelay` lets a looping timer fire sooner, or later, the first time: `SetTimer(Handle, this, &AThing::Fire, 2.f, true, 0.f)` fires at once and then every 2 seconds. `SetTimerForNextTick(this, &AThing::Fire)` waits exactly one frame, which helps when something must happen after every actor has run its `BeginPlay`.

The timer manager does not call into an actor that has been destroyed, but an actor should still clear its own timers in `EndPlay`: it says plainly that the actor's jobs end with it, and it stops a timer that was meant to be cancelled for some other reason.

# Example

```cpp
void ADojoSprinkler::StartWatering(float Seconds)
{
	FTimerManager& Timers = GetWorldTimerManager();

	Timers.SetTimer(SprayTimer, this, &ADojoSprinkler::Spray, 0.25f, true);
	Timers.SetTimer(StopTimer, this, &ADojoSprinkler::StopWatering, Seconds, false);
}

void ADojoSprinkler::StopWatering()
{
	GetWorldTimerManager().ClearTimer(SprayTimer);
	UE_LOG(LogTemp, Log, TEXT("Watered; stop timer has %.1f s left"), GetWorldTimerManager().GetTimerRemaining(StopTimer));
}
```

# Questions

```yaml
- id: shared-handle
  type: spot-the-bug
  prompt: A turret should fire every 0.5 seconds and switch itself off after 10 seconds, but it never fires. Which line is wrong?
  code: |
    void ADojoTurret::Arm()
    {
    	GetWorldTimerManager().SetTimer(TurretTimer, this, &ADojoTurret::Fire, 0.5f, true);
    	GetWorldTimerManager().SetTimer(TurretTimer, this, &ADojoTurret::Disarm, 10.f, false);
    }
  bugLine: 4
  fix: Give the switch-off its own FTimerHandle member, because setting a second timer on the same handle cancels the firing timer.
  explanation: One handle holds one timer; the second SetTimer clears the first.
- id: remaining-none
  type: multiple-choice
  prompt: "What does GetTimerRemaining return for a handle whose timer has already fired and was not looping?"
  choices:
    - "0"
    - The rate it was set with
    - "-1"
  answerIndex: 2
  explanation: Once a one-shot timer has fired there is no timer behind the handle, and the manager answers -1.
- id: fill-pause
  type: fill-blank
  prompt: "To freeze a timer and keep the time it has left, call GetWorldTimerManager().___(Handle)."
  acceptedAnswers: [PauseTimer]
  explanation: PauseTimer keeps the remaining time; UnPauseTimer carries on from it, unlike ClearTimer, which throws it away.
- id: first-delay
  type: multiple-choice
  prompt: "Which call fires a function at once and then every 3 seconds?"
  choices:
    - SetTimer(Handle, this, &AThing::Ping, 3.f, true)
    - SetTimer(Handle, this, &AThing::Ping, 3.f, true, 0.f)
    - SetTimer(Handle, this, &AThing::Ping, 0.f, true, 3.f)
  answerIndex: 1
  explanation: The last argument is the first delay. Left out, the first call waits a whole period; a rate of zero sets nothing.
- id: slomo
  type: multiple-choice
  prompt: "After typing slomo 0.5 in the console, how long in real seconds does a 3 second timer take?"
  choices:
    - "3"
    - "1.5"
    - "6"
  answerIndex: 2
  explanation: Timers run in game time, which now passes at half speed.
- id: explain-handle
  type: explain-in-one-sentence
  prompt: In one sentence, say what a timer handle is for.
  modelAnswer: It names one running timer so you can later ask whether it is active and how long it has left, pause it, or clear it, and setting a new timer on it replaces the old one.
  rubric:
    - Says the handle identifies one timer
    - Names at least one thing done through it later, such as asking, pausing, or clearing
  explanation: Without the handle, a timer can only be left to run.
```
