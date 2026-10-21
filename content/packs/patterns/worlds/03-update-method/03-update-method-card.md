---
id: p3-update-method-card
title: Each thing owns its frame
order: 3
kind: concept
difficulty: 2
patterns: [update-method]
skills: [update-method]
terms: [tick, primary-actor-tick, actor-component, timer-manager]
prerequisites: [p3-patrol-drone]
xp: 25
estimatedMinutes: 8
concepts:
  - Update Method gives each object a function that performs one frame of its behavior, called once per frame for every live object
  - Adding or removing a behaving thing becomes adding or removing an object, not editing a central function
  - The update can live on the actor, on a component, or on a manager that walks many plain structs
  - Objects update in sequence, so order between them is a choice to make on purpose
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the training floor already has patrol drones, braziers, and sweeping blades, each with its own Tick. A designer wants a new obstacle, a pendulum gong. What has to change besides the new gong class?"
choices:
  - The braziers' class, so they know about gongs
  - Nothing; the engine already calls every ticking actor, including the new one
  - A central function that lists every hazard type
  - The engine's loop
answerIndex: 1
explanation: Every ticking actor is called by the engine's per-frame walk. A new kind of thing joins by existing, not by being added to someone else's code.
```

# Card

What you built in the patrol drone is the **Update Method** pattern. Each object that behaves over time has a function that performs one frame of that behavior. Every frame, the loop walks the live objects and calls that function on each one. The drone's patrol, its heading, and its turn at the ends all live in the drone; nothing outside it knows how a drone patrols.

**Why it pays.** Without it, someone has to run every object's behavior from one place: a big function with a branch per kind of thing and the state of every object kept beside it. Each new kind means editing that function, and every reader must load all of it. With it, adding a kind of thing is adding a class, and placing one in a level is all it takes to make it behave.

**Where the update lives.** On the actor (`Tick`), as the drone does: simple, one class per behavior. On a **component** (`TickComponent`): the behavior can be attached to any actor, and one actor can carry several. Or on a manager that owns many light objects as plain structs and walks them in one update, which is how you keep thousands of sparks or crowd agents cheap; the engine's Mass framework is that idea at scale.

**What it costs.** Behavior sliced into frames has to store its place (the heading, the phase). Objects are updated in sequence, not at the same instant, so one may see another's new state from this frame; when that matters, order them on purpose with tick prerequisites or tick groups. And when an update spawns or removes objects, the walk over them must be written so newcomers wait and removals do not skip anyone.

**The Unreal form.** `AActor::Tick` and `UActorComponent::TickComponent`, opted into with `bCanEverTick`, ordered with tick groups and prerequisites, slowed with tick intervals, paused with `SetActorTickEnabled`. The engine's world tick is the loop that calls them.

# Example

```cpp
// The same behavior as a component, so any actor can carry it: a door, a chandelier, a banner.
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoArenaSwayComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UDojoArenaSwayComponent()
	{
		PrimaryComponentTick.bCanEverTick = true;
	}

	virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override
	{
		Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

		Phase += SwaySpeed * DeltaTime;
		GetOwner()->SetActorRotation(FRotator(0.f, 0.f, SwayDegrees * FMath::Sin(Phase)));
	}

	UPROPERTY(EditAnywhere, Category = "Sway")
	float SwaySpeed = 2.f;

	UPROPERTY(EditAnywhere, Category = "Sway")
	float SwayDegrees = 15.f;

private:
	float Phase = 0.f;
};
```

# Questions

```yaml
- id: training-floor
  type: which-pattern
  prompt: "A racing game's pit lane has fuel pumps that fill at their own rate, tyre stacks that cool down, and a pit-board light that blinks while a car is in. Each keeps changing on its own, frame after frame, and none depends on the others. Which pattern gives each its own home for that work?"
  choices: [update-method, observer, game-loop, state]
  answer: update-method
  distractorNotes:
    - choice: observer
      why: Delegates fit things reacting to events; these things act continuously whether or not anything happens.
    - choice: game-loop
      why: The engine's loop is what calls them each frame, but the question is where each thing's own behavior lives.
    - choice: state
      why: A drone may have states later, but the shared need here is a per-frame behavior on every object.
  explanation: Each object owns a function for one frame of its behavior, and the engine's walk calls all of them.
- id: thousands
  type: which-pattern
  prompt: "Ten thousand embers drift up from a bonfire, each moving every frame. One actor per ember is too slow. Which pattern still applies, in a different shape?"
  choices: [object-pool, update-method, flyweight, observer]
  answer: update-method
  distractorNotes:
    - choice: object-pool
      why: Reusing embers saves spawning cost, but the per-frame cost is the update walk itself.
    - choice: flyweight
      why: Sharing one ember mesh saves memory, not the work of moving each ember every frame.
    - choice: observer
      why: Nothing is announced; each ember simply moves.
  explanation: One manager walks a plain array of ember structs and updates each, which is Update Method without an actor per object.
- id: spot-it-component
  type: multiple-choice
  prompt: "In Unreal, which of these is Update Method in its component form?"
  choices:
    - A component's TickComponent that advances its own state each frame
    - A component's OnComponentBeginOverlap delegate
    - A Data Asset holding a component's tuning values
    - The component's constructor
  answerIndex: 0
  explanation: TickComponent is the per-frame function the engine calls for every component that opted in.
- id: spot-lost-place
  type: spot-the-bug
  prompt: This guard should walk to the end of its beat and back. It reaches the end and then stays there, jittering. Which line loses its place between frames?
  code: |
    void ADojoArenaGuard::Tick(float DeltaSeconds)
    {
    	Super::Tick(DeltaSeconds);
    	float Heading = 1.f;
    	Offset += Heading * Speed * DeltaSeconds;
    	if (Offset > BeatLength) Heading = -1.f;
    }
  bugLine: 4
  fix: Store Heading as a member of the guard, set once at the start, so the turn made in one frame carries into the next.
  explanation: A local is rebuilt every time Tick runs, so the turn is forgotten the moment the frame ends; per-frame behavior must keep its place on the object.
- id: explain-update-method
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Update Method pattern.
  modelAnswer: Each object that behaves over time has a function that performs one frame of its behavior, and every frame the loop calls that function on each live object.
  rubric:
    - Says each object has its own per-frame function
    - Says the loop calls it every frame for every live object
  explanation: The loop knows how to walk the objects; only each object knows what it does.
```
