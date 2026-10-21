---
id: p2-frame-time
title: Every frame is a different length
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [time]
terms: [tick, deltatime, tick-groups, primary-actor-tick, console-command]
prerequisites: [p1-architecture-lens]
xp: 25
estimatedMinutes: 7
concepts:
  - The engine moves the world forward once per frame and hands every ticking object that frame's real duration
  - Frames vary in length, so anything per frame must be scaled by DeltaSeconds to mean the same per second
  - A lone decay per update can be made frame-rate independent with a power of DeltaSeconds; rules that interact, or results that must repeat, need updates of a fixed length
  - Tick groups order the work inside one frame; they do not change how long a frame is
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a torch flickers by adding 1 to a counter in Tick and switching on every 30th tick. On a desktop running at 120 frames per second and a laptop running at 30, how do the flickers compare?"
choices:
  - The same on both, because Tick runs on a fixed clock
  - Four times as fast on the desktop
  - Four times as fast on the laptop
  - The same on both, because the engine caps Tick at 60
answerIndex: 1
explanation: Tick runs once per drawn frame, and the desktop draws four times as many frames each second, so a count of ticks is a count of frames, not of seconds.
```

# Card

Nothing in an Unreal level waits for the player. Every frame, the engine reads input, moves the whole world forward a little, and draws the result, then does it again. Your actors and components join in through **Tick**: once per frame, if `PrimaryActorTick.bCanEverTick` is set, the engine calls `Tick(DeltaSeconds)`.

**Frames are not equal.** `DeltaSeconds` is how much real time the last frame took. On a fast machine it might be 1/144 of a second, on a slow one 1/25, and on the same machine it jumps when a level streams in or a garbage collection pass runs. Two things shape it before your Tick sees it: the world's time dilation scales it (slow motion), and it is capped by Max Undilated Frame Time in World Settings, 0.4 seconds by default, so a three-second stall reaches Tick as 0.4 seconds and the game simply loses the rest. Inside that cap, each frame is as long as it was; the engine does not smooth it.

**Scale what is per second.** A speed, a turn rate, a countdown: each is "so much per second", so each frame should add that amount times `DeltaSeconds`. Counting ticks, or moving a fixed amount per tick, makes the game faster on better hardware.

**Some rules need more than a multiply.** "Keep 98 percent of your speed" applied once per update does not become frame-rate independent by multiplying by `DeltaSeconds`. On its own it can be fixed with a power instead: `Speed *= FMath::Pow(0.98f, DeltaSeconds * 60.f)` keeps the same share per second at any frame rate. That trick stops working once rules interact within an update (a spring pulling while damping slows, a stop threshold, a collision), because one long update no longer equals many short ones, and it never makes results repeat to the digit. Interacting rules and results that must give the same answer twice need updates that are always the same length, whatever the frame does. The next quest builds that.

**Order inside a frame.** **Tick groups** (`TG_PrePhysics`, `TG_DuringPhysics`, `TG_PostPhysics`, and others) decide whether your Tick runs before or after physics in that frame. They solve "I read the position before physics moved it", never "the frame was long".

**Seeing it.** The console command `stat fps` shows the frame rate, `stat unit` shows where the frame's time goes, and `t.MaxFPS 30` caps the frame rate so you can test a slow machine on a fast one.

# Example

```cpp
// A brazier that dims over five seconds, the same on every machine.
void ADojoArenaBrazier::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// Seconds, not ticks: subtract the real time this frame took.
	SecondsLeft = FMath::Max(0.f, SecondsLeft - DeltaSeconds);

	// A per-second rate scaled by the frame's length.
	FlameHeight = FMath::Max(0.f, FlameHeight - ShrinkPerSecond * DeltaSeconds);
}
```

# Questions

```yaml
- id: fill-delta
  type: fill-blank
  prompt: "Inside Tick, a door that opens at 90 degrees per second turns by 90 times ___ each frame."
  acceptedAnswers: [DeltaSeconds, DeltaTime, delta time, the delta time]
  explanation: DeltaSeconds is the real length of the frame, so a per-second rate times DeltaSeconds is the share for this frame.
- id: spot-tick-count
  type: spot-the-bug
  prompt: This buff is meant to last three seconds. Which line makes it last a different time on every machine?
  code: |
    void ADojoArenaShrine::Tick(float DeltaSeconds)
    {
    	Super::Tick(DeltaSeconds);
    	if (!bBlessed) return;
    	BlessingTicksLeft -= 1;
    	if (BlessingTicksLeft <= 0) bBlessed = false;
    }
  bugLine: 5
  fix: Track seconds left and subtract DeltaSeconds each frame instead of one tick.
  explanation: A tick is one frame, and frames per second differ by machine, so a count of ticks is not a length of time.
- id: unscalable-rule
  type: multiple-choice
  prompt: "Which of these per-frame rules does multiplying by DeltaSeconds NOT make frame-rate independent?"
  choices:
    - Position += Velocity
    - Timer -= 1
    - Speed *= 0.98
    - Angle += TurnRate
  answerIndex: 2
  explanation: The other three are amounts per second and scale cleanly. Keeping a share of the speed per update compounds, so its effect depends on how many updates happen; on its own it needs a power of DeltaSeconds, not a multiply.
- id: tick-groups-purpose
  type: multiple-choice
  prompt: "What does moving an actor's tick to TG_PostPhysics change?"
  choices:
    - Its Tick runs at a fixed 60 times a second
    - Its Tick runs after physics has moved things in the same frame
    - Its Tick runs on the render thread
    - Its DeltaSeconds becomes the physics step
  answerIndex: 1
  explanation: Tick groups order work inside one frame. Frame length and how often Tick runs do not change.
- id: explain-delta
  type: explain-in-one-sentence
  prompt: In one sentence, say why a speed applied in Tick must be multiplied by DeltaSeconds.
  modelAnswer: Tick runs once per frame and frames last different amounts of real time on different machines, so only speed times the frame's real duration gives the same distance per second everywhere.
  rubric:
    - Says Tick runs once per frame
    - Says frames vary in real length, by machine or by moment
  explanation: Per frame and per second are different units; DeltaSeconds converts between them.
```
