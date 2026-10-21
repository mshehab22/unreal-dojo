---
id: f4-components
title: Actor, scene, and primitive components
order: 3
kind: concept
difficulty: 2
patterns: []
skills: [framework, components]
terms: [actor-component, scene-component, primitive-component, root-component, attach-to-component, primary-actor-tick]
prerequisites: [f4-game-mode-and-state]
xp: 25
estimatedMinutes: 7
concepts:
  - An actor component adds behavior; a scene component adds a place; a primitive component adds something to see or collide with
  - The root component's transform is the actor's transform
  - Attaching makes one thing follow another
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a health component derives from `UActorComponent`. Can you set its location to put it above the actor's head?"
choices:
  - Yes, every component has a location
  - No, an actor component has no transform; only scene components do
  - Only if the actor has a mesh
  - Only in the constructor
answerIndex: 1
explanation: UActorComponent is pure behavior; location, rotation, scale, and attachment start at USceneComponent.
```

# Card

Components let you build an actor from parts, and give any actor new behavior without changing its class. Three levels matter:

- **Actor component** (`UActorComponent`): behavior only, with no place in the world. Health, an inventory, a hit counter. Add one to a door, a dummy, and a crate, and all three gain the same behavior.
- **Scene component** (`USceneComponent`): an actor component with a transform, so it has a location relative to its parent and can have children. Mount points, a spring arm, an empty pivot.
- **Primitive component** (`UPrimitiveComponent`): a scene component with geometry: it can render, collide, or overlap. Meshes, shapes, text render components.

Every actor with a place in the world has a **root component**, a scene component whose transform *is* the actor's transform. Moving the actor moves the root, and every scene component attached below it follows.

Attachment builds that tree. In the constructor, use `Child->SetupAttachment(Parent)`. At run time, use `AttachToComponent(Parent, Rules)` on a component or an actor, where the rules say what happens to the child's current transform: `KeepRelative`, `KeepWorld`, or `SnapToTarget` (jump onto the parent). `DetachFromActor` or `DetachFromComponent` breaks it, again with a rule for where the child ends up.

Ask an actor for a component with `FindComponentByClass<T>()`, and a component for its actor with `GetOwner()`.

Actors and components tick separately. An actor's per-frame settings live in `PrimaryActorTick` and a component's in `PrimaryComponentTick`; setting `bCanEverTick = false` in the constructor keeps the engine from calling Tick at all, which is right for anything that only reacts to calls or events.

# Example

```cpp
ADojoF4Lamppost::ADojoF4Lamppost()
{
	// The root: the actor's own transform.
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	// A scene component 300 units up, to hang things from.
	Hook = CreateDefaultSubobject<USceneComponent>(TEXT("Hook"));
	Hook->SetupAttachment(RootComponent);
	Hook->SetRelativeLocation(FVector(0.f, 0.f, 300.f));

	// Behavior only: no place, no children.
	Wear = CreateDefaultSubobject<UDojoF4HitCounterComponent>(TEXT("Wear"));
}

void ADojoF4Lamppost::HangLantern(AActor* Lantern)
{
	Lantern->AttachToComponent(Hook, FAttachmentTransformRules::SnapToTargetNotIncludingScale);
}
```

# Questions

```yaml
- id: pick-base
  type: multiple-choice
  prompt: "A component should mark where carried items sit on a pack mule and has nothing to draw. Which class should it be?"
  choices: [UActorComponent, USceneComponent, UStaticMeshComponent, UPrimitiveComponent]
  answerIndex: 1
  explanation: It needs a place to attach things to, but no geometry.
- id: fill-setup-attachment
  type: fill-blank
  prompt: "Inside a constructor, a component is placed under its parent with Child->___(Parent)."
  acceptedAnswers: [SetupAttachment]
  explanation: SetupAttachment records the parent for the class default; AttachToComponent is the run time call.
- id: spot-keep-relative
  type: spot-the-bug
  prompt: A dummy lying at (900, 0, 0) is picked up by a carrier at the origin, but it appears 900 units away from the mount instead of on it. Which line is wrong?
  code: |
    void ADojoF4Mule::Load(AActor* Cargo)
    {
    	Cargo->AttachToComponent(Pack, FAttachmentTransformRules::KeepWorldTransform);
    	Loaded = Cargo;
    }
  bugLine: 3
  fix: Attach with SnapToTargetNotIncludingScale so the cargo jumps onto the mount.
  explanation: KeepWorldTransform attaches the cargo but leaves it exactly where it was.
- id: root-meaning
  type: multiple-choice
  prompt: "What does an actor's root component decide?"
  choices:
    - Which component ticks first
    - The actor's location, rotation, and scale in the world
    - Which component handles input
  answerIndex: 1
  explanation: The actor's transform is its root component's transform.
- id: explain-component
  type: explain-in-one-sentence
  prompt: In one sentence, say why a hit counter is better as a component than as code inside each target class.
  modelAnswer: As a component it is written once and can be added to any actor, even classes you cannot change, instead of copying the same code into every class that needs it.
  rubric:
    - Mentions writing it once or reusing it
    - Mentions adding it to many or unrelated actors
  explanation: Components are how most Unreal gameplay code is shared between actors.
```
