---
id: p2-game-loop-when-not
title: When to leave the clock alone
order: 6
kind: concept
difficulty: 2
patterns: [game-loop]
skills: [game-loop, architecture]
terms: [tick, deltatime, timer-manager, physics-substepping, game-thread]
prerequisites: [p2-boulder-refactor]
xp: 25
estimatedMinutes: 6
concepts:
  - You never write a second outer loop inside Unreal; a blocking loop freezes the game thread
  - Plain DeltaSeconds is right for most gameplay; a fixed-step bank is for rules that interact within an update or results that must repeat
  - Physics already has substepping; a timer already handles periodic work
  - The fraction of a step is for drawing; the cap on catch-up steps belongs in every bank
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a camera smoothly follows the player using an interpolation scaled by DeltaSeconds. A teammate proposes moving it onto a fixed 60 steps per second bank, like the boulder. Is that worth it?"
choices:
  - Yes, every per-frame calculation should use a fixed step
  - No, the camera only needs to look smooth, not repeat to the digit, so DeltaSeconds is enough
  - Yes, because fixed steps are always faster
  - No, because cameras cannot tick
answerIndex: 1
explanation: A fixed step costs a bank, a loop, and an interpolation. The camera gains nothing from it, because nobody compares camera positions across machines.
```

# Card

Lesson zero said each layer is a bet. The fixed-step bank is a good bet in a few places and a bad one in most.

**Never a second outer loop.** The engine runs the frame. A `while` loop in `BeginPlay` or `Tick` that waits for something, or a call to sleep on the game thread to slow the game down, does not create a new loop: it stops the one the engine runs, and the editor freezes with it. Work that should happen later goes on a timer or into the next Tick.

**Plain DeltaSeconds for most gameplay.** Movement at a speed, timers, fades, camera smoothing, UI animation: these are rates per second, they look right with a variable step, and nobody needs them identical across machines. A bank adds code that every reader must walk through for no gain.

**Let the engine do physics.** If the jitter is in simulated physics bodies, turn on physics substepping before writing your own step. Hand-stepping a rigid body on top of the physics engine fights it.

**Periodic work wants a timer, not a bank.** "Every two seconds, spawn a wave" is a timer from the timer manager. A bank is for a simulation that changes state every step, not for an event that fires on a schedule.

**When you do bank, cap it.** A bank without a limit on catch-up steps turns one long frame into a burst of steps, and if a step costs more time than it simulates, each frame owes more than the last until the game stalls. Cap the steps per frame and drop what the cap refuses.

**Use a fixed step when the answer must repeat.** Replays, lockstep matches, deterministic tests, and rules that interact within an update (a damped spring, a simulation with thresholds) are where the bet pays. A lone decay does not need one: a power of DeltaSeconds handles it.

# Example

```cpp
// Wrong: waiting inside the frame. The game thread never returns, so nothing else runs, including the gate.
void ADojoArenaHerald::BeginPlay()
{
	Super::BeginPlay();

	while (!Gate->IsOpen())
	{
		FPlatformProcess::Sleep(0.1f);
	}

	Announce();
}

// Right: let the engine's frame keep running and react when the news arrives.
void ADojoArenaHerald::BeginPlay()
{
	Super::BeginPlay();

	Gate->OnOpened.AddUObject(this, &ADojoArenaHerald::Announce);
}
```

# Questions

```yaml
- id: when-not-fade
  type: multiple-choice
  prompt: "Which of these is the weakest case for a fixed-step bank?"
  choices:
    - A ghost replay that must end exactly where the recorded run ended
    - A spring-loaded trap whose spring explodes when a frame is long
    - A health bar that fades out over half a second
    - A lockstep duel where both machines must agree on every hit
  answerIndex: 2
  explanation: A fade is a rate per second that only needs to look right; DeltaSeconds handles it. The other three need repeatable or stable steps.
- id: when-not-periodic
  type: multiple-choice
  prompt: "A brazier should flare once every three seconds. What is the plainest tool?"
  choices:
    - A fixed-step bank with a step of three seconds
    - A looping timer from the timer manager
    - A while loop with a three-second sleep in BeginPlay
    - Counting 180 ticks
  answerIndex: 1
  explanation: A timer runs a function on a schedule inside the engine's frame. A three-second step would make the flare's drawing jump, the sleep freezes the game, and tick counting depends on the frame rate.
- id: spot-blocking-loop
  type: spot-the-bug
  prompt: This countdown should show 3, 2, 1 over three seconds. Which line freezes the game instead?
  code: |
    void ADojoArenaCountdown::Start()
    {
    	for (int32 Number = 3; Number > 0; --Number)
    	{
    		Label->SetText(FText::AsNumber(Number));
    		FPlatformProcess::Sleep(1.f);
    	}
    }
  bugLine: 6
  fix: Drive the countdown from a looping timer or from Tick, and update the label each time it fires.
  explanation: Sleeping on the game thread stops the engine's frame, so nothing is drawn until the loop ends and the player sees only the last number.
- id: uncapped-bank
  type: multiple-choice
  prompt: "A fixed-step crowd simulation steps 1/32 of a second at a time, but after a designer doubled the crowd, each step takes 40 milliseconds of real time to compute. Without a cap on catch-up steps, what happens after one slow frame?"
  choices:
    - Nothing, the bank sorts itself out
    - Each frame owes more steps than the last, and the game grinds to a stop
    - The engine lowers the step length automatically
    - The crowd runs in slow motion forever but stays smooth
  answerIndex: 1
  explanation: Steps that cost more real time than they simulate make the bank grow every frame. A cap with the extra time dropped turns that into a brief slowdown instead.
- id: explain-when-bank
  type: explain-in-one-sentence
  prompt: In one sentence, say when a fixed-step bank is worth its cost.
  modelAnswer: When rules interact within an update or a result must repeat exactly across machines or runs, such as a replay or a lockstep match; otherwise DeltaSeconds is simpler and enough.
  rubric:
    - Names interacting rules, stability, or exact repeatability as the reason
    - Says ordinary rates per second do not need it
  explanation: "The test is lesson zero's: does the extra machinery make a likely change or a real requirement cheaper?"
```
