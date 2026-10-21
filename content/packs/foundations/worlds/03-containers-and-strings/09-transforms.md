---
id: f3-transforms
title: FTransform puts location, rotation, and scale together
order: 9
kind: concept
difficulty: 2
patterns: []
skills: [math]
terms: [ftransform, fvector, frotator, fquat]
prerequisites: [f3-rotations]
xp: 25
estimatedMinutes: 6
concepts:
  - An FTransform is a location, a rotation, and a scale in one value
  - TransformPosition turns a local offset into a world position
  - Spawning and attaching take transforms
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a sentry stands at (1000, 0, 0) facing yaw 90. A muzzle sits 100 units in front of it, local offset (100, 0, 0). Where is the muzzle in the world?"
choices:
  - "(1100, 0, 0)"
  - "(1000, 100, 0)"
  - "(100, 0, 0)"
  - "(1000, -100, 0)"
answerIndex: 1
explanation: The sentry's forward points along +Y after a yaw of 90, so 100 units in front is 100 along Y from its location.
```

# Card

An actor's place in the world has three parts: where it is, which way it faces, and how big it is. `FTransform` holds all three in one value: a location (`FVector`), a rotation (stored as an `FQuat`), and a scale (`FVector`, 1 by default). `GetActorTransform()` returns it, and `SpawnActor` and `SpawnActorDeferred` take one.

Transforms convert between local and world space:

- `Transform.TransformPosition(LocalOffset)` takes an offset in the actor's own frame (forward, right, up) and returns the world position. It applies scale, then rotation, then location.
- `Transform.InverseTransformPosition(WorldPosition)` goes back: where is this world point, seen from the actor?
- `TransformVector` does the same for directions, without the location part.

Use it whenever something is described relative to an actor: a muzzle in front of a turret, a spawn point to the left of a door, a camera behind a car. `GetActorForwardVector()` and friends are shortcuts for the rotated axes.

Components carry their own relative transforms under their parent, which is what attaching sets up; the next world covers that.

# Example

```cpp
// Spawns a flare 100 units in front of and 50 above the launcher, whichever way it faces.
void ADojoF3Launcher::LaunchFlare()
{
	const FTransform& Here = GetActorTransform();
	const FVector Muzzle = Here.TransformPosition(FVector(100.f, 0.f, 50.f));

	GetWorld()->SpawnActor<AActor>(FlareClass, Muzzle, GetActorRotation());
}
```

# Questions

```yaml
- id: transform-parts
  type: multiple-choice
  prompt: "Which three things does an FTransform hold?"
  choices:
    - Location, rotation, and scale
    - Location, velocity, and mass
    - Rotation, color, and scale
  answerIndex: 0
  explanation: Those three place an object in the world; physics values live elsewhere.
- id: fill-transform-position
  type: fill-blank
  prompt: "To turn a local offset in front of an actor into a world position, call GetActorTransform().___(Offset)."
  acceptedAnswers: [TransformPosition]
  explanation: TransformPosition applies scale, rotation, and location in that order.
- id: spot-world-offset
  type: spot-the-bug
  prompt: The muzzle flash appears beside this turret whenever it has turned. Which line is wrong?
  code: |
    void ADojoF3Launcher::SpawnFlash()
    {
    	const FVector Muzzle = GetActorLocation() + FVector(100.f, 0.f, 0.f);
    	GetWorld()->SpawnActor<AActor>(FlashClass, Muzzle, GetActorRotation());
    }
  bugLine: 3
  fix: Use GetActorTransform().TransformPosition with the local offset so it follows the turret's facing.
  explanation: Adding a world offset ignores which way the turret faces.
- id: inverse-use
  type: multiple-choice
  prompt: "A door should open away from the player. Which call tells it whether the player stands in front of it or behind it?"
  choices:
    - TransformPosition on the player's location
    - InverseTransformPosition on the player's location, then check X
    - GetActorScale3D
  answerIndex: 1
  explanation: In the door's own frame, a positive X means in front and a negative X means behind.
- id: explain-local-world
  type: explain-in-one-sentence
  prompt: In one sentence, say why a muzzle offset is written in local space rather than world space.
  modelAnswer: A local offset moves and turns with the actor, so the muzzle stays in front of it whichever way it faces, while a world offset stays fixed.
  rubric:
    - Mentions the offset following the actor's facing or rotation
    - Contrasts it with a fixed world offset
  explanation: TransformPosition is the bridge between the two.
```
