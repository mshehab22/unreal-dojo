---
id: m7-tuning-knobs
title: Tuning knobs and acceptance first
order: 4
kind: concept
difficulty: 2
patterns: []
skills: [planning, reflection]
terms: [clamp-min-meta, meta-specifier, editanywhere, category-specifier, uproperty]
prerequisites: [m7-signal-plate]
xp: 25
estimatedMinutes: 8
concepts:
  - Every number that shapes the feel becomes an EditAnywhere knob with a Category, a hard range, and a unit
  - ClampMin and ClampMax limit what the Details panel accepts; code that sets the value is not clamped
  - Acceptance criteria are written before the code, as sentences a test can check
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a gate's speed is OpenHeight / OpenSeconds, and OpenSeconds is EditAnywhere with no meta. A designer types 0 into it in Details. What happens when the gate opens?"
choices:
  - The editor refuses the 0 and keeps the old value
  - The game crashes with a divide-by-zero error
  - The speed becomes infinite, so the panel jumps fully open in a single frame
  - The gate falls back to the default time
answerIndex: 2
explanation: Float division by zero gives infinity rather than a crash, and a step of infinite size jumps straight to the target; nothing in Details stops the 0 unless the property says where its range starts.
```

# Card

**Knobs, not magic numbers.** A number written in a function body, such as `375.f * DeltaSeconds` in a gate's Tick, works for exactly one gate. Change the gate's height and the trip takes a different time; ask a designer to make it slower and they need a programmer. Every number that shapes how a mechanic feels becomes a property:

```cpp
UPROPERTY(EditAnywhere, Category = "Gate", meta = (ClampMin = "0.05", Units = "s"))
float OpenSeconds = 0.8f;
```

- `EditAnywhere` puts it in Details on the class and on each placed gate, so two gates can feel different.
- `Category = "Gate"` groups it with the gate's other knobs; with thirty properties, groups are how a designer finds the right one.
- `ClampMin = "0.05"` is a **hard floor**: a designer who types 0 gets 0.05. `ClampMax` is the ceiling. Pick the limits from what breaks: below 0.05 s the trip is too short to see, and at 0 the speed divides by zero.
- `UIMin` and `UIMax` only set the slider's range; a typed value can go past them. Use them for the usual range and the clamps for the limits.
- `Units = "s"` (or `"cm"`) shows the unit next to the value, so nobody wonders whether 0.8 is seconds or frames.

Metadata guards the **editor only**. Code, Blueprints, and tests that set `OpenSeconds` directly are not clamped, so a value the code cannot survive still deserves a guard in the code.

**Acceptance first.** Before writing a mechanic, write what "done" means as sentences a test can check: a setup, an action, and a result with a number. "The gate opens smoothly" cannot be tested. "With OpenHeight 300 and OpenSeconds 0.8, the panel is fully open 0.8 s plus one frame after it starts rising, and not before 0.7 s" can. The signal plate's tests were written this way: one press when the first thing arrives, no release while something is still on it, exactly one release when the last one leaves. Writing these first turns the spec's numbers into tests, shows which numbers are knobs, and tells you when to stop coding.

# Example

```cpp
/** A floor trap that raises its spikes a moment after something steps on it, then lowers them again. */
UCLASS()
class ADojoSpikeTrap : public AActor
{
	GENERATED_BODY()

public:
	/** Seconds between the step and the spikes. */
	UPROPERTY(EditAnywhere, Category = "Spike Trap|Timing", meta = (ClampMin = "0", ClampMax = "3", Units = "s"))
	float WarningSeconds = 0.5f;

	/** How long the spikes stay up. */
	UPROPERTY(EditAnywhere, Category = "Spike Trap|Timing", meta = (ClampMin = "0.1", UIMax = "5", Units = "s"))
	float RaisedSeconds = 1.5f;

	/** How far the spikes rise. */
	UPROPERTY(EditAnywhere, Category = "Spike Trap|Shape", meta = (ClampMin = "0", UIMax = "200", Units = "cm"))
	float SpikeHeight = 60.f;
};

// Acceptance, written before the code:
// 1. With WarningSeconds 0.5, the spikes are still down 0.45 s after a runner steps on, and up at 0.55 s.
// 2. With RaisedSeconds 1.5, the spikes are down again 2.05 s after the step.
// 3. A second runner stepping on while the spikes are up does not restart the timer.
```

# Questions

```yaml
- id: clamp-or-ui
  type: multiple-choice
  prompt: "A designer types 9 into a property marked meta = (UIMin = \"0\", UIMax = \"5\"). What value is kept?"
  choices:
    - 5, because UIMax caps every value
    - 9, because UIMin and UIMax only set the slider's range
    - 0, because the value is out of range and resets
  answerIndex: 1
  explanation: UIMin and UIMax shape the slider; only ClampMin and ClampMax refuse typed values past the limit.
- id: magic-speed
  type: spot-the-bug
  prompt: A designer sets OpenSeconds to 2 on one gate, but that gate still opens as fast as the others. Which line is wrong?
  code: |
    void ADojoGate::Tick(float DeltaSeconds)
    {
    	Super::Tick(DeltaSeconds);
    	const float TargetHeight = bWantsOpen ? OpenHeight : 0.f;
    	const float Height = FMath::FInterpConstantTo(GetPanelHeight(), TargetHeight, DeltaSeconds, 375.f);
    	SetPanelHeight(Height);
    }
  bugLine: 5
  fix: Use OpenHeight divided by OpenSeconds as the speed instead of the fixed 375.
  explanation: The speed was worked out once for 300 cm over 0.8 s and written in as a number, so the knobs no longer reach it.
- id: testable
  type: multiple-choice
  prompt: "Which acceptance criterion can a test check?"
  choices:
    - The gate feels heavy and satisfying
    - The gate opens quickly enough for players
    - With OpenHeight 300 and OpenSeconds 0.8, the panel is fully open 0.8 s plus one frame after it starts rising
    - The gate code is clean and easy to read
  answerIndex: 2
  explanation: A testable criterion names a setup, an action, and a result with a number; the others are wishes a test cannot measure.
- id: code-not-clamped
  type: multiple-choice
  prompt: "OpenSeconds has meta = (ClampMin = \"0.05\"). A test spawns a gate and sets OpenSeconds = 0 in C++ before it finishes spawning. What value does the gate use?"
  choices:
    - 0, because metadata only guards the Details panel
    - 0.05, because ClampMin applies everywhere
    - 0.8, because the default wins
  answerIndex: 0
  explanation: Metadata is read by the editor, not enforced on assignment, so code still needs its own guard against a value it cannot survive.
- id: explain-knob
  type: explain-in-one-sentence
  prompt: In one sentence, say why a number in a gate's Tick should become an EditAnywhere property with a ClampMin.
  modelAnswer: As a property each placed gate can be tuned in Details without code, and the ClampMin stops a designer from typing a value, such as a zero time, that would break the movement.
  rubric:
    - Mentions designers tuning each gate without changing code
    - Mentions the clamp keeping out a value that breaks the code
  explanation: A knob gives control to the designer, and the range keeps that control safe.
```
