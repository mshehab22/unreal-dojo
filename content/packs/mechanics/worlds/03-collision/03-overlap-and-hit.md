---
id: m3-overlap-and-hit
title: "Being told about a touch: overlap and hit events"
order: 3
kind: concept
difficulty: 2
patterns: []
skills: [collision, delegates]
terms: [overlap-event, hit-event, generate-overlap-events, get-overlapping-actors, adddynamic, ufunction, fhitresult]
prerequisites: [m3-channels-and-responses]
xp: 30
estimatedMinutes: 10
concepts:
  - Overlaps report things passing through a shape; hits report a swept move that was stopped
  - A handler is a UFUNCTION with the delegate's exact parameters, bound with AddDynamic
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a trigger box overlaps pawns, and a runner's body overlaps the trigger's object type, so their responses work out to Overlap. The runner has Generate Overlap Events on, the trigger has it off, and a handler is bound to the trigger's OnComponentBeginOverlap. The runner walks into the trigger. What happens?"
choices:
  - The handler runs, because the runner asked for overlap events
  - Nothing, because both shapes must have Generate Overlap Events on
  - The runner is stopped at the trigger's edge
  - The handler runs once the runner stops moving
answerIndex: 1
explanation: The engine only starts an overlap between two shapes when both have the flag on and their responses work out to Overlap. With the trigger's flag off, no event fires on either side.
```

# Card

A shape can be told about two kinds of touch.

An **overlap** is something passing into or out of a shape that does not stop it: a runner crossing a trigger, a crate landing in a pit. It starts with `OnComponentBeginOverlap` and finishes with `OnComponentEndOverlap`. For an overlap to start, the two shapes' responses must work out to Overlap, and **both** must have **Generate Overlap Events** on (`SetGenerateOverlapEvents(true)`, on by default for shapes). The engine brings overlaps up to date when a shape moves, with a sweep or without one, so a teleport with `SetActorLocation` into a trigger begins an overlap too. It also updates them when a shape's responses change.

A **hit** is solid contact: a move with the sweep flag on is stopped by a shape that blocks it. `OnComponentHit` fires on the moving shape and on the shape it ran into, and the `FHitResult` says where and which way the surface faced. A swept move needs no extra switch for this. The **Simulation Generates Hit Events** flag is only for bodies that the physics simulation moves, and only those fill in the `NormalImpulse` parameter; for a swept move it is zero. A teleport never hits anything, because it never checks the path.

Each event is a dynamic multicast delegate on the component. You listen with `AddDynamic`, usually in `BeginPlay`, and the engine finds your function by name through reflection, so the handler must be a `UFUNCTION()` with exactly the delegate's parameters:

```cpp
UFUNCTION()
void HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

UFUNCTION()
void HandleEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex);

UFUNCTION()
void HandleHit(UPrimitiveComponent* HitComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, FVector NormalImpulse, const FHitResult& Hit);
```

`OtherActor` is the actor that owns the other shape, and `OtherComp` is that shape. A handler usually starts by asking whether `OtherActor` is something it cares about, with `Cast`, and returns when it is not. A function without `UFUNCTION()` compiles, but binding it fails while the game runs, and the handler never runs.

Events tell you when something changes. To ask what is touching a shape right now, use `GetOverlappingActors(Actors)`, which fills an array with the actors whose shapes overlap it, or `IsOverlappingActor(Actor)`. Both read the list that overlap events keep, so they also need Generate Overlap Events on. Ask when a decision depends on the present; listen when something should happen at the moment of change.

Actors have their own versions, `OnActorBeginOverlap`, `OnActorEndOverlap`, and `OnActorHit`, which fire for any of the actor's shapes. The component versions say exactly which shape was touched.

# Example

```cpp
void ADojoAlarmPad::BeginPlay()
{
	Super::BeginPlay();

	Pad->OnComponentBeginOverlap.AddDynamic(this, &ADojoAlarmPad::HandlePadBeginOverlap);
	Pad->OnComponentHit.AddDynamic(this, &ADojoAlarmPad::HandlePadHit);
}

void ADojoAlarmPad::HandlePadBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	UE_LOG(LogTemp, Log, TEXT("%s stepped on the pad"), *GetNameSafe(OtherActor));
}

void ADojoAlarmPad::HandlePadHit(UPrimitiveComponent* HitComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, FVector NormalImpulse, const FHitResult& Hit)
{
	UE_LOG(LogTemp, Log, TEXT("%s ran into the pad at %s"), *GetNameSafe(OtherActor), *Hit.ImpactPoint.ToString());
}
```

# Questions

```yaml
- id: overlap-or-hit
  type: multiple-choice
  prompt: "A ball moves with the sweep flag on and is stopped by a wall that blocks it. Which event fires on the wall's box?"
  choices:
    - OnComponentBeginOverlap
    - OnComponentHit
    - Neither, because the wall did not move
    - OnComponentHit, but only if Simulation Generates Hit Events is on
  answerIndex: 1
  explanation: A swept move that is stopped fires a hit on both shapes, the mover and the one it ran into. The simulation flag is only for bodies moved by physics.
- id: missing-ufunction
  type: spot-the-bug
  prompt: A trigger's handler never runs, and the log shows the binding failed. Which line is wrong?
  code: |
    UCLASS()
    class ADojoBell : public AActor
    {
    	GENERATED_BODY()
    protected:
    	virtual void BeginPlay() override;
    	void HandleRing(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);
    };
  bugLine: 7
  fix: Declare the handler with UFUNCTION() on the line above, so AddDynamic can find it by name.
  explanation: AddDynamic looks the function up through reflection, which only knows functions marked UFUNCTION.
- id: fill-end
  type: fill-blank
  prompt: "To hear when something leaves a trigger box, bind a handler with Box->OnComponent___.AddDynamic(this, &ADojoZone::HandleLeave)."
  acceptedAnswers: [EndOverlap]
  explanation: OnComponentEndOverlap fires when an overlap that had begun ends, with four parameters instead of six.
- id: teleport-overlap
  type: multiple-choice
  prompt: "Code calls SetActorLocation with no sweep and puts a runner straight inside a trigger. Does the trigger's begin overlap fire?"
  choices:
    - No, only swept moves start overlaps
    - Yes, overlaps are brought up to date after every move, swept or not
    - Only on the next frame's Tick
  answerIndex: 1
  explanation: A teleport skips the path, so it cannot hit anything on the way, but the overlaps at the new place are still updated.
- id: impulse
  type: multiple-choice
  prompt: "In an OnComponentHit handler fired by a swept move, what is NormalImpulse?"
  choices:
    - The speed of the mover along the surface normal
    - Zero, because only bodies moved by the physics simulation fill it in
    - The same as Hit.ImpactNormal
  answerIndex: 1
  explanation: Impulse is a physics quantity. A swept move is moved by code, so the engine passes a zero vector.
- id: explain-overlap
  type: explain-in-one-sentence
  prompt: In one sentence, say what has to be true for a trigger's OnComponentBeginOverlap handler to run when a runner walks in.
  modelAnswer: The two shapes' responses must work out to Overlap, both must have Generate Overlap Events on, and the handler must be a UFUNCTION bound with AddDynamic before the runner arrives.
  rubric:
    - Names the responses working out to Overlap
    - Names Generate Overlap Events on both shapes
    - Names the UFUNCTION handler bound with AddDynamic
  explanation: Each of the three is a separate reason a handler stays silent, and checking them in order finds most bugs.
```
