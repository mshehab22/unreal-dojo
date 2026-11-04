---
id: m3-shapes-and-actors
title: One actor, many shapes
order: 8
kind: concept
difficulty: 3
patterns: []
skills: [collision]
terms: [overlap-event, get-overlapping-actors, generate-overlap-events, primitive-component, physics-simulation, hit-event]
prerequisites: [m3-scale-plate]
xp: 30
estimatedMinutes: 9
concepts:
  - Component events come once per pair of shapes; actor events once per pair of actors
  - Collision switched off, or a shape destroyed, ends its overlaps with end events
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a crate has a solid body and a grab handle, and both overlap a trigger box. The crate is set down inside the trigger. How many times do the trigger's OnComponentBeginOverlap and its actor's OnActorBeginOverlap fire?"
choices:
  - Once for each of the two events
  - Once for the component event, twice for the actor event
  - Twice for the component event, once for the actor event
  - Twice for each of the two events
answerIndex: 2
explanation: The component event fires for every pair of shapes that start overlapping, and the crate brings two shapes. The actor event fires only when the first shape of one actor starts touching another actor.
```

# Card

Overlaps are kept between **pairs of shapes**, not pairs of actors. When a crate with a body and a handle lands in a trigger, two pairs begin, so the trigger's `OnComponentBeginOverlap` runs twice, once with each crate shape as `OtherComp`. When it leaves, `OnComponentEndOverlap` runs twice too. A plate that adds one on every begin and takes one on every end therefore counts shapes, which is right only while every visitor has exactly one shape. Characters, vehicles, and pickups often have several.

There are three honest ways to count things instead:

- **Ask the shape.** `GetOverlappingActors` lists each overlapping actor once, however many of its shapes overlap, so recounting from it on every event is always right. It costs a small array per event.
- **Listen at the actor level.** `OnActorBeginOverlap` fires when the first shape of another actor starts touching any shape of yours, and `OnActorEndOverlap` when the last pair ends. It counts actors, but it hears every one of your own shapes, so a second shape added to the plate later changes what it means.
- **Filter by shape.** Check `OtherComp` in the handler and react only to the shape you care about, such as a body and not a handle; or turn Generate Overlap Events off on shapes that never need to be noticed. The first ties the plate to knowledge of other classes' shapes; the second takes the handle away from anything else that wanted to find it.

Overlaps also end without anything moving. Destroying an actor ends every overlap its shapes had, with end events, and so does switching a shape's collision off or changing a response away from Overlap. A count built from begin and end events stays right through all of these, as long as it counts the right thing.

Hits come in pairs of shapes too, and a swept move reports at most one blocking hit, the first one on its path. A body moved by the **physics simulation** is different: its hits come from the physics engine's contacts, they are only reported to a shape that has **Simulation Generates Hit Events** on, and only those fill `NormalImpulse` with how hard the bodies pushed each other. That number is what a crate needs to break only when it lands hard.

# Example

```cpp
void ADojoTallyZone::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	TArray<AActor*> Inside;
	Zone->GetOverlappingActors(Inside);

	UE_LOG(LogTemp, Log, TEXT("%s's shape %s arrived; %d actors inside"), *GetNameSafe(OtherActor), *GetNameSafe(OtherComp), Inside.Num());
}
```

# Questions

```yaml
- id: pair-count
  type: multiple-choice
  prompt: "A runner has a body sphere and a feet box, both overlapping a trigger, and nothing else touches it. What does the trigger's GetOverlappingActors fill its array with?"
  choices:
    - One entry, the runner
    - Two entries, one per shape
    - Nothing, because the runner is not a pawn class
  answerIndex: 0
  explanation: The array lists overlapping actors, each once, however many of their shapes overlap.
- id: counting-bug
  type: spot-the-bug
  prompt: A pressure pad should count the actors standing on it, but a character with two overlapping shapes counts as two. Which line is wrong?
  code: |
    void ADojoTallyPad::HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
    {
    	Visitors++;
    	RefreshLabel();
    }
  bugLine: 3
  fix: Set the count from the pad's GetOverlappingActors, which lists each actor once, instead of adding one per shape that arrives.
  explanation: The component event runs once per arriving shape, so adding one per call counts shapes.
- id: destroy-ends
  type: multiple-choice
  prompt: "A crate standing in a trigger is destroyed. Does the trigger's OnComponentEndOverlap run?"
  choices:
    - No, a destroyed actor never fires any events
    - Only if the crate was moving when it died
    - Yes, destroying its shapes ends their overlaps
  answerIndex: 2
  explanation: A destroyed shape ends every overlap it had and notifies the other side, so counts built from events stay right.
- id: fill-actor-event
  type: fill-blank
  prompt: "The actor-level event that fires once when the first shape of another actor starts touching any of yours is OnActor___."
  acceptedAnswers: [BeginOverlap]
  explanation: OnActorBeginOverlap pairs with OnActorEndOverlap, which fires when the last pair of shapes stops touching.
- id: impulse-source
  type: multiple-choice
  prompt: "A crate should crack only when it lands hard. Which setup gives its hit handler a NormalImpulse that is not zero?"
  choices:
    - Moving it by code with AddActorWorldOffset and the sweep flag on
    - Letting physics move it, with Simulation Generates Hit Events on
    - Turning Generate Overlap Events on for both the crate and the floor
  answerIndex: 1
  explanation: Only physics contacts carry an impulse; swept moves made by code pass a zero vector.
- id: explain-pairs
  type: explain-in-one-sentence
  prompt: In one sentence, say why adding one on every OnComponentBeginOverlap can count a single crate twice.
  modelAnswer: The component event fires once for every pair of shapes that start overlapping, so a crate whose body and handle both enter the trigger produces two begin overlaps.
  rubric:
    - Says the event is per pair of shapes, or per component
    - Says a crate with two shapes produces two events
  explanation: The engine keeps overlaps between shapes; actors are only the owners of those shapes.
```
