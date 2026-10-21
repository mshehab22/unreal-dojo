---
id: p3-per-frame-behavior
title: Whose job is this frame?
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [update-method]
terms: [tick, primary-actor-tick, tick-groups, deltatime]
prerequisites: [p2-frame-time]
xp: 25
estimatedMinutes: 7
concepts:
  - Each object can carry its own slice of behavior that the engine calls once per frame
  - Behavior spread over frames must store where it left off, because the function returns every frame
  - Objects update one after another, not at the same instant, so an object can see a neighbor's new state from this frame
  - Ticking can be turned off, slowed with an interval, or ordered with prerequisites
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: when a round ends, the arena's scoreboard should roll its number up from 0 to the final score so the crowd can watch it climb. Someone writes the roll as a for loop from 0 to the score that sets the label on each pass, called once from the round's end. What does the player see?"
choices:
  - The number climbing smoothly to the score
  - The final score appear at once, after a short hitch
  - The number climbing on another thread
  - Every number at once, overlapping
answerIndex: 1
explanation: Nothing is drawn until the function returns, so every pass of the loop happens inside one frame and only the last value is ever shown. Anything the player should watch change has to be spread across frames.
```

# Card

The engine's frame comes round many times a second. Something that should be seen to move, a drone, a flame, a sweeping blade, has to do a little of its behavior on each pass and then give the frame back. The cleanest place to put that little piece is in the thing itself: in Unreal, an actor's **Tick** or a component's `TickComponent`. The engine keeps a list of everything that has opted in (`PrimaryActorTick.bCanEverTick`) and calls each one once per frame.

**The function returns every frame, so the object must remember.** A loop that rolls a number up knows how far it has got from the loop counter. Sliced into frames, that knowledge is gone at the end of every Tick, so the object keeps it in fields: which way it is heading, how far through its swing it is, how long until it fires. That stored "where was I" is the price of spreading behavior over frames.

**One after another, not all at once.** Within a frame the engine calls the objects in turn. If the guard ticks before the lamp, the lamp sees where the guard is now, not where it was at the start of the frame. Usually that is fine. When one thing must always read another after it moved (a camera following a pawn), say so with a **tick prerequisite** (`AddTickPrerequisiteActor`) or a later tick group, instead of relying on luck.

**Changing the crowd while walking it.** If a thing spawns new things or removes itself during an update, the walk over the crowd has to be careful: new arrivals usually wait for the next frame, and removals usually wait until the walk is done.

**Not every frame.** A thing that only needs to act now and then can switch ticking off (`SetActorTickEnabled(false)`) while idle, tick at an interval (`SetActorTickInterval`), or not tick at all and use a timer or an event instead.

# Example

```cpp
// A flame that wavers on its own: a little behavior per frame, and the phase stored between frames.
void ADojoArenaTorch::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// Where it left off last frame, moved on by this frame's real length.
	Phase += WaverSpeed * DeltaSeconds;

	FlameHeight = BaseHeight + Waver * FMath::Sin(Phase);
}
```

# Questions

```yaml
- id: fill-resume
  type: fill-blank
  prompt: "A patrol sliced into frames must keep its direction in a ___ on the object, because Tick returns at the end of every frame."
  acceptedAnswers: [field, member, member variable, variable, property]
  explanation: The stored direction is the patrol's "where was I"; without it the next frame cannot tell which way to go.
- id: order-within-frame
  type: multiple-choice
  prompt: "In one frame, the guard actor ticks before the lamp actor, and the lamp reads the guard's position. Which position does the lamp see?"
  choices:
    - The guard's position from the end of the previous frame
    - The guard's position after its tick this frame
    - A blend of both
    - It depends on the render thread
  answerIndex: 1
  explanation: Updates run one after another, so the lamp sees whatever the guard already wrote this frame.
- id: spot-blocking-fade
  type: spot-the-bug
  prompt: The winner's banner should fade in over a second when the round ends. Which line makes it appear fully faded in, all at once?
  code: |
    void ADojoArenaWinnerBanner::ShowWinner()
    {
    	SetActorHiddenInGame(false);
    	for (float Opacity = 0.f; Opacity <= 1.f; Opacity += 0.01f) SetOpacity(Opacity);
    	bShowing = true;
    }
  bugLine: 4
  fix: Store the opacity on the banner and raise it a frame's worth at a time in Tick, by fade speed times DeltaSeconds, until it reaches 1.
  explanation: All hundred steps run before the frame is drawn, so the player only ever sees the last one.
- id: prerequisite
  type: multiple-choice
  prompt: "A camera rig must always read its pawn's position after the pawn has moved in the same frame. What is the reliable way to get that?"
  choices:
    - Hope the pawn was placed in the level first
    - Add the pawn as a tick prerequisite of the camera rig
    - Make the camera tick twice per frame
    - Read the position from the previous frame
  answerIndex: 1
  explanation: A tick prerequisite tells the engine the rig must tick after the pawn, so the order no longer depends on placement.
- id: explain-slicing-cost
  type: explain-in-one-sentence
  prompt: In one sentence, say what spreading behavior over frames costs compared with writing it as one straight function.
  modelAnswer: Because Tick returns every frame, the object loses its place in the code and must store explicitly where it is and what it was doing so it can carry on next frame.
  rubric:
    - Says the function returns or ends each frame
    - Says the object must store its progress, such as a direction or a timer
  explanation: Straight code remembers its place for free; per-frame code has to keep it in fields.
```
