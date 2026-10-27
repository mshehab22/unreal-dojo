---
id: m2-movement-components
title: When a movement component does the moving
order: 9
kind: concept
difficulty: 3
patterns: []
skills: [movement, framework]
terms: [movement-component, projectile-movement-component, character-movement-component, scene-component, tick]
prerequisites: [m2-dart]
xp: 30
estimatedMinutes: 8
concepts:
  - A movement component moves its owner's root each tick and handles the sweeping and sliding for you
  - Hand-write the move when the rule of the move is the mechanic
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a ball has a projectile movement component with bouncing turned on and no Tick code. It hits a wall. Who works out the new direction?"
choices:
  - The ball's own Tick, which must be written
  - The movement component, from the surface it hit
  - The wall, which pushes the ball away
  - Nobody; the ball stops
answerIndex: 1
explanation: A movement component sweeps its owner's root each tick, reads the hit, and applies its own bounce rules, so the owner needs no movement code.
```

# Card

You have moved actors three ways so far: by setting a location, by adding an offset each frame, and by a helper such as an interpolation that does the arithmetic. The engine also ships **movement components**, which move their owner for you.

A movement component (`UMovementComponent` is the base) keeps a pointer to one scene component, its **updated component**, which is the owner's root unless you say otherwise. Each tick it works out how far to move, moves the updated component with a sweep, and slides along or reacts to whatever blocks it. That is the same job as the bumper's Tick, packaged.

The ones you will meet:

- **`UProjectileMovementComponent`** flies its actor forward from an initial speed, with a gravity scale, a maximum speed, optional bouncing (`bShouldBounce`, `Bounciness`, `Friction`), and optional homing (`bIsHomingProjectile` with a target component and a homing acceleration). `bRotationFollowsVelocity` turns the actor to face the way it flies. It calls events when it bounces or stops.
- **`UFloatingPawnMovement`** drifts a pawn that has no walking, driven by movement input.
- **`UCharacterMovementComponent`** walks, jumps, swims, and falls a character, with movement modes, ground friction, and braking.

To use one, create it in the actor's constructor like any component. It needs a root with a collision shape if the actor should be stopped by things, because the sweep uses the root's shape:

```cpp
Flight = CreateDefaultSubobject<UProjectileMovementComponent>(TEXT("Flight"));
Flight->InitialSpeed = 900.f;
Flight->ProjectileGravityScale = 0.f;
```

**Choosing.** Use a component when the motion is a standard kind: a rocket, a thrown grenade, a character walking. It has already been written, swept, and tuned, and other systems know it. Write your own Tick when the rule of the motion is the mechanic: a patrol that counts its ends, a lift that eases to a floor and refuses calls, a dart whose turn limit is the thing the player learns. A component states its rules as its own settings; a hand-written mover states exactly your rule.

# Example

```cpp
ADojoRocket::ADojoRocket()
{
	Body = CreateDefaultSubobject<USphereComponent>(TEXT("Body"));
	Body->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	RootComponent = Body;

	Flight = CreateDefaultSubobject<UProjectileMovementComponent>(TEXT("Flight"));
	Flight->InitialSpeed = 900.f;
	Flight->MaxSpeed = 900.f;
	Flight->ProjectileGravityScale = 0.f;
	Flight->bRotationFollowsVelocity = true;
}
```

# Questions

```yaml
- id: fill-projectile
  type: fill-blank
  prompt: "To make a rocket fly with no movement code, give it a UProjectile___Component."
  acceptedAnswers: [Movement]
  explanation: The projectile movement component flies its actor from an initial speed, and can bounce and home.
- id: no-collision-root
  type: spot-the-bug
  prompt: A bouncing ball moves, but flies straight through every wall instead of bouncing. Which line is wrong?
  code: |
    ADojoBall::ADojoBall()
    {
    	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    	RootComponent = Root;
    	Flight = CreateDefaultSubobject<UProjectileMovementComponent>(TEXT("Flight"));
    	Flight->bShouldBounce = true;
    }
  bugLine: 3
  fix: Make the root a collision shape such as a sphere component, so the movement has a shape to sweep and walls to hit.
  explanation: A movement component sweeps the shape of its updated component, and a bare scene component has no shape to block anything.
- id: which-stays-by-hand
  type: multiple-choice
  prompt: "Which of these is the best candidate to keep as hand-written Tick code?"
  choices:
    - A grenade that arcs under gravity and bounces
    - A patrol that turns round at its two ends and counts them
    - A character that walks and jumps
  answerIndex: 1
  explanation: A standard arc or walk is what the components are for; a rule at the ends of a path is the mechanic itself, so it belongs in your code.
- id: updated-component
  type: multiple-choice
  prompt: "What does a movement component move?"
  choices:
    - Every component of its owner at once
    - Its updated component, usually the owner's root, and everything attached to it
    - Only the owner's mesh
  answerIndex: 1
  explanation: It moves one scene component, the root by default, and attached children follow it.
- id: explain-choice
  type: explain-in-one-sentence
  prompt: In one sentence, say when you would write a mover's Tick yourself instead of using a movement component.
  modelAnswer: When the rule of the movement is the mechanic itself, such as a turn limit or a rule at each end of a path, which a ready-made component does not express.
  rubric:
    - Says the motion has a special rule that a component does not provide
    - Contrasts it with standard motion that a component already handles
  explanation: Components are for standard motion; your own Tick is for the motion the game is about.
```
