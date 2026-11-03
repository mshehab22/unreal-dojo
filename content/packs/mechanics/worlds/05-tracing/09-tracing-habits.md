---
id: m5-tracing-habits
title: Tracing habits that keep a game fast and honest
order: 9
kind: concept
difficulty: 2
patterns: []
skills: [collision, debugging, time]
terms: [timer-manager, line-trace, sweep, debug-draw, tick]
prerequisites: [m5-laser]
xp: 30
estimatedMinutes: 9
concepts:
  - Ask a query only as often as its answer can change, and say what a result means before acting on it
  - Keep drawing switchable, start traces clear of your own shape, and know that async traces exist
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a sentry checks whether it can see the player by tracing every frame. The player walks, never teleports. Which change costs the least while keeping the sentry's eyes about as sharp?"
choices:
  - Trace twice per frame so it never misses
  - Trace a few times per second from a timer
  - Trace only when the player fires
  - Trace once at BeginPlay and remember the answer
answerIndex: 1
explanation: A walking player changes the answer slowly, so a few looks per second is as good as sixty. Once at BeginPlay would go stale, and waiting for a shot would make the sentry blind until then.
```

# Card

A trace is cheap once and costly in bulk. Ten sentries each tracing every frame is six hundred queries a second to learn something that changes a few times a second. The habit: **ask only as often as the answer changes.** A sentry's eyes belong on a timer from the **timer manager**, set in `BeginPlay` and repeating a few times a second, not in `Tick`. A ground snap that places a prop on the floor asks once, at `BeginPlay`, because the floor does not move. Only an answer that must be fresh every frame, such as the crosshair target under a moving camera, earns a trace in `Tick`.

Start the trace clear of yourself. Either ignore your own actor in the query params, or begin just outside your own shape. A trace that begins inside your collision may be answered by your own body first, as you saw with the rangefinder.

Say what a result means. A `true` return says that something blocked the line, not that the thing you wanted did. A sentry looking for the player must compare `Hit.GetActor()` with the player, and treat a hit on a wall as "not seen". Likewise a `false` return may be the good news: nothing stood between the sentry and its target. Decide, per case, which answer means success.

Keep the drawing switchable. A debug line per look is useful while you build and unwelcome once the tower works. Make it a tunable property so you can turn it off from the editor without touching code:

```cpp
UPROPERTY(EditAnywhere, Category = "Debug")
bool bDrawDebug = true;
```

Then wrap each draw call in `if (bDrawDebug)`. That keeps the drawing one click away on the day a trace misbehaves.

For the rare case of very many queries in one frame, the engine has **asynchronous traces**, such as `AsyncLineTraceByChannel`, which take a delegate and hand the answer back at a later point instead of stopping the frame to compute it. You do not need them yet; it is enough to know they exist and that the cost of a flood of traces is a real thing with a real remedy.

The uses you will meet again and again: the crosshair target (a line from the camera), camera pull-in (a sweep from the character back to the camera spot, so a wall never hides the player), ground snap (a line down), line of sight (a line between two actors, as above), and aim assist (a sweep wider than the reticle). They are all the same question wearing different clothes.

# Example

```cpp
// Starts the sentry's eyes at a few looks per second instead of one per frame.
void ADojoSentry::BeginPlay()
{
	Super::BeginPlay();

	GetWorldTimerManager().SetTimer(LookTimer, this, &ADojoSentry::Look, 0.25f, true);
}

// Traces toward the watched actor and reports whether nothing else is in the way.
void ADojoSentry::Look()
{
	if (!IsValid(WatchedActor))
	{
		return;
	}

	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this);

	const FVector Start = GetActorLocation();
	const FVector End = WatchedActor->GetActorLocation();

	FHitResult Hit;
	const bool bBlocked = GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params);
	const bool bSeen = !bBlocked || Hit.GetActor() == WatchedActor;

	if (bDrawDebug)
	{
		DrawDebugLine(GetWorld(), Start, End, bSeen ? FColor::Green : FColor::Red, false, 0.3f);
	}
}
```

# Questions

```yaml
- id: tick-trace
  type: spot-the-bug
  prompt: Profiling shows the cost of each sentry's eyes climbing with every sentry added, though the player only walks. Which line is the cause?
  code: |
    void ADojoSentry::Tick(float DeltaSeconds)
    {
    	Super::Tick(DeltaSeconds);
    	CheckLineOfSight();
    }
  bugLine: 4
  fix: Call it from a repeating timer started in BeginPlay, a few times a second, and stop ticking.
  explanation: The answer changes at walking pace, so tracing every frame wastes most of its queries. A timer asks as often as the answer can change.
- id: true-is-not-enough
  type: multiple-choice
  prompt: "A sentry's trace returns true. Why is that not enough to say it can see the player?"
  choices:
    - True means only that something blocked the line, which might be a wall, so the hit actor must be checked
    - True means the trace failed and must be run again
    - True is only returned for pawns
  answerIndex: 0
  explanation: The return value reports a blocker of any kind. The hit result says which one, and only a hit on the player, or a clear line to the player, means it is seen.
- id: toggle-why
  type: multiple-choice
  prompt: "Why make bDrawDebug an editable property instead of leaving the draw calls in unconditionally?"
  choices:
    - Draw calls do not compile without it
    - The drawing can be switched off from the editor once it is no longer needed, and back on when something breaks
    - It makes the trace itself faster
  answerIndex: 1
  explanation: A toggle keeps the debugging aid available without leaving it on screen all the time, and it needs no code change to flip.
- id: many-queries
  type: multiple-choice
  prompt: "A level needs hundreds of traces in one frame. Which tool exists for that?"
  choices:
    - Asynchronous traces such as AsyncLineTraceByChannel, which hand back results through a delegate later
    - Setting bTraceComplex to true
    - Drawing the traces with a longer lifetime
  answerIndex: 0
  explanation: Asynchronous traces spread the work out and report back through a delegate instead of stopping the frame for each query.
- id: explain-rate
  type: explain-in-one-sentence
  prompt: In one sentence, say how you decide how often a trace should run.
  modelAnswer: As often as its answer can change, which is once if the world does not move, a few times a second for something that changes at walking pace, and every frame only if it must be fresh each frame.
  rubric:
    - Ties the rate to how fast the answer changes
    - Gives at least one example of a slower rate than every frame
  explanation: Queries cost something, so the right rate is the lowest one that still gives a fresh enough answer.
```
