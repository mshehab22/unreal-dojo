---
id: p9-component-card
title: The actor is the container, the parts do the work
order: 3
kind: concept
difficulty: 2
patterns: [component]
skills: [component]
terms: [actor-component, scene-component, createdefaultsubobject, initialize-component, beginplay, uinterface, character-movement-component]
prerequisites: [p9-arena-parts]
xp: 25
estimatedMinutes: 9
concepts:
  - Component splits an object's abilities into separate parts it owns, so each ability is written once and kinds of objects are mixes of parts
  - "Unreal works this way: an AActor holds parts, and UActorComponent and USceneComponent are the two base classes for them"
  - Parts are made in the constructor with CreateDefaultSubobject or at runtime with NewObject, and start up in a fixed order
  - Parts talk through the owner, through delegates, through interfaces, or through a direct reference, each for a different kind of link
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a stamina part fills itself to full in its own startup code. Another part on the same actor wants to spend stamina in its BeginPlay. Where should the stamina part fill itself so the spend always sees a full bar?"
choices:
  - In BeginPlay, like everything else
  - In InitializeComponent, which runs before any part's BeginPlay
  - In the destructor
  - In the other part's BeginPlay
answerIndex: 1
explanation: For an actor starting play, every part's InitializeComponent runs before any part's BeginPlay, so state filled there is ready whichever BeginPlay runs first. The part must ask for it by setting bWantsInitializeComponent.
```

# Card

What you built for the arena props is the **Component** pattern. One object spans several abilities, and each ability lives in its own part that the object owns: health in one, loot in another. Each part is written once and knows nothing of the others' insides. A kind of object is the set of parts it carries, chosen in code, in a Blueprint, or in data.

**Unreal is built on it.** `AActor` is the container. `UActorComponent` is a part with logic and no place in the world: health, inventory, stamina. `USceneComponent` adds a transform and attachment, so parts can sit in the world and carry other parts: a mesh, a text label, a trigger box. The engine's own parts include `UCharacterMovementComponent`, `UStaticMeshComponent`, and `UAbilitySystemComponent`. Your parts take `meta = (BlueprintSpawnableComponent)` so designers can add them in the editor.

**Two ways a part is made.**

- **In the constructor.** `HealthComponent = CreateDefaultSubobject<UDojoArenaHealth>(TEXT("Health"));` makes the part part of the class itself: every instance and every Blueprint child has it, and its settings show in the Details panel.
- **At runtime.** `NewObject`, fill in its settings, `AddInstanceComponent`, `RegisterComponent`. Used when the mix is decided while the game runs.

**The startup order.** For an actor that spawns or a level that starts play, all of its parts first get `OnRegister` (which also runs in the editor whenever the actor is placed or changed), then each part with `bWantsInitializeComponent = true` gets `InitializeComponent`, then the actor's `BeginPlay`, which calls each part's `BeginPlay`. A part registered later on an actor that is already playing gets all three inside its `RegisterComponent` call.

**Four ways parts talk.**

- **Through the owner.** Parts read what the actor holds for everyone: `GetOwner()->GetActorLocation()`. Nothing is coupled except to `AActor` itself.
- **Through a delegate.** Health broadcasts `OnDepleted`; loot, a score keeper, or a sound part listens. The sender never knows who listens.
- **Through an interface.** A part asks its owner for an ability without knowing its class: `if (IDojoArenaTarget* Target = Cast<IDojoArenaTarget>(GetOwner()))`.
- **Through a direct reference.** A part finds a close partner with `GetOwner()->FindComponentByClass<...>()` and calls it. Simple and fast, but it ties the two together, so keep it for pairs that truly belong together.

Start with the loosest link that works, and add tighter ones only where a pair needs them.

# Example

```cpp
// A container class: the gladiator is the parts it makes in its constructor.
ADojoArenaGladiator::ADojoArenaGladiator()
{
	HealthComponent = CreateDefaultSubobject<UDojoArenaHealth>(TEXT("Health"));
	ShieldComponent = CreateDefaultSubobject<UDojoArenaShield>(TEXT("Shield"));
}

// A part that wants its state ready before anyone's BeginPlay.
UDojoArenaShield::UDojoArenaShield()
{
	bWantsInitializeComponent = true;
}

void UDojoArenaShield::InitializeComponent()
{
	Super::InitializeComponent();

	Charge = MaxCharge;
}
```

# Questions

```yaml
- id: scene-or-actor
  type: multiple-choice
  prompt: "Which part needs to be a USceneComponent rather than a plain UActorComponent?"
  choices:
    - A score counter
    - A stamina pool
    - A torch flame that must sit at the tip of a wall bracket
    - A list of quest flags
  answerIndex: 2
  explanation: Only the flame needs a place in the world and attachment; the others are logic and data, so UActorComponent fits them.
- id: order-of-startup
  type: multiple-choice
  prompt: "An actor spawns with three parts made in its constructor, one of which sets bWantsInitializeComponent. In what order do these run?"
  choices:
    - BeginPlay, then InitializeComponent, then OnRegister
    - OnRegister on every part, then InitializeComponent on the part that asked for it, then the actor's BeginPlay, which starts each part's BeginPlay
    - InitializeComponent, then OnRegister, then BeginPlay
    - Only BeginPlay runs for parts made in the constructor
  answerIndex: 1
  explanation: Registering comes first, then initializing, then play begins; a part's state set in InitializeComponent is ready before any BeginPlay.
- id: pick-the-link
  type: multiple-choice
  prompt: "A health part must make a sound part play a hit sound, a score part add a point, and a HUD bar update. Which link fits best?"
  choices:
    - Health finds and calls all three directly
    - Health broadcasts a delegate when it changes, and each of the three listens
    - The three poll health every frame
    - Health casts its owner to the player class and calls the HUD
  answerIndex: 1
  explanation: One sender, many listeners that the sender should not know about, is what a delegate is for.
- id: spot-owner-cast
  type: spot-the-bug
  prompt: This stamina part is meant to work on any actor. Which line ties it to one class?
  code: |
    void UDojoArenaStamina::Spend(float Amount)
    {
    	Stamina = FMath::Max(0.f, Stamina - Amount);
    	ADojoArenaGladiator* Gladiator = Cast<ADojoArenaGladiator>(GetOwner());
    	if (Stamina <= 0.f && Gladiator) Gladiator->ShowTiredPose();
    	OnSpent.Broadcast(Stamina);
    }
  bugLine: 4
  fix: Drop the cast and let the gladiator listen to a stamina delegate (or check an interface the owner implements) and show the pose itself.
  explanation: Casting the owner to one concrete class quietly makes the part a gladiator part; on any other actor the reaction silently never happens.
- id: explain-component
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Component pattern.
  modelAnswer: An object's abilities are split into separate parts it owns, each written once and independent of the others, so kinds of objects are built by choosing parts instead of by inheritance.
  rubric:
    - Mentions abilities split into separate owned parts
    - Mentions building kinds by combining parts rather than by inheritance, or each part being reusable
  explanation: The actor holds; the parts do.
```
