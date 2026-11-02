---
id: m1-binding-input
title: Binding an action when a pawn is possessed
order: 3
kind: concept
difficulty: 2
patterns: []
skills: [input]
terms: [enhanced-input-component, setup-player-input-component, etriggerevent, local-player-subsystem]
prerequisites: [m1-actions-and-values]
xp: 25
estimatedMinutes: 9
concepts:
  - SetupPlayerInputComponent runs when a local player controller possesses the pawn, and again for every new possession
  - BindAction ties one action and one trigger event to one function
  - A mapping context is switched on through the local player's Enhanced Input subsystem, when the pawn gets a controller
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a pawn is spawned into the level at the start of play, and the player's controller possesses it two seconds later. When does the engine call the pawn's SetupPlayerInputComponent?"
choices:
  - When the pawn is spawned
  - In the pawn's BeginPlay
  - When the player's controller possesses it
  - Every frame
answerIndex: 2
explanation: A pawn only has an input component once a local player controller controls it, so the engine builds it, and calls SetupPlayerInputComponent, at possession.
```

# Card

Input needs a player, and a pawn only has one while a controller possesses it. So the engine creates the pawn's input component at **possession** and calls the pawn's **`SetupPlayerInputComponent(UInputComponent*)`**. When the pawn is let go its input component is destroyed, and the next controller to possess it gets a fresh one and another call. Bindings therefore belong in that function, not in the constructor or `BeginPlay`.

The component arrives as the plain `UInputComponent`. With Enhanced Input it is really a `UEnhancedInputComponent`, because the project's default input component class says so. Cast it, and leave quietly if the cast fails:

```cpp
UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(PlayerInputComponent);
if (!EnhancedInput) return;
EnhancedInput->BindAction(JumpAction, ETriggerEvent::Triggered, this, &ADojoHero::Jump);
```

`BindAction` takes the action, a **trigger event**, the object, and a function. The function may take nothing, a `const FInputActionValue&`, or a `const FInputActionInstance&` (covered later). **`ETriggerEvent::Triggered`** is the one most bindings want. With no triggers on the action, it fires on every frame the value is not zero, which is what movement needs. **`Started`** fires once, on the first of those frames, and **`Completed`** once when the value returns to zero. `Ongoing` and `Canceled` belong to actions with timed triggers and come in a later card.

Binding says what a function does. It does not say which keys. A **mapping context** must also be switched on for the player. The context goes to the player's **Enhanced Input local player subsystem**, a service that lives on the `ULocalPlayer`, one per person at the machine:

```cpp
if (const APlayerController* Player = Cast<APlayerController>(Controller))
{
	if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(Player->GetLocalPlayer()))
	{
		Subsystem->AddMappingContext(HeroContext, 0);
	}
}
```

Do it in **`NotifyControllerChanged`**, which the pawn calls after its controller changes, so the context arrives with the pawn and the pawn needs no other code. Before calling `Super`, the old controller is still in `PreviousController`, which is the moment to take the context off that player with `RemoveMappingContext`.

# Example

```cpp
void ADojoHero::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	if (UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(PlayerInputComponent))
	{
		EnhancedInput->BindAction(MoveAction, ETriggerEvent::Triggered, this, &ADojoHero::Move);
		EnhancedInput->BindAction(JumpAction, ETriggerEvent::Started, this, &ADojoHero::Jump);
	}
}
```

# Questions

```yaml
- id: fill-bind
  type: fill-blank
  prompt: "To call Move on every frame the move action is pushed, bind it with ETriggerEvent::___."
  acceptedAnswers: [Triggered]
  explanation: Triggered fires on every frame an action with no timed trigger has a non-zero value.
- id: wrong-event
  type: spot-the-bug
  prompt: The pawn steps forward one small step per key press and does not keep walking while W is held. Which line is wrong?
  code: |
    void ADojoWalker::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
    {
    	Super::SetupPlayerInputComponent(PlayerInputComponent);
    	UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(PlayerInputComponent);
    	if (!EnhancedInput) return;
    	EnhancedInput->BindAction(MoveAction, ETriggerEvent::Started, this, &ADojoWalker::Move);
    }
  bugLine: 6
  fix: Bind Move to ETriggerEvent::Triggered so it runs on every frame the key is held.
  explanation: Started fires once, on the first frame; Triggered keeps firing while the value stays non-zero.
- id: when-bound
  type: multiple-choice
  prompt: "Player one possesses a drone, lets it go, and possesses it again. How many times is the drone's SetupPlayerInputComponent called?"
  choices:
    - Once, the first time
    - Twice, once for each possession
    - Never; bindings are kept from the constructor
  answerIndex: 1
  explanation: The input component is destroyed when the pawn is let go and created again on the next possession, so the function runs each time.
- id: where-subsystem
  type: multiple-choice
  prompt: "Where does the Enhanced Input subsystem used for AddMappingContext live?"
  choices:
    - On the world, one for the whole level
    - On the pawn that wants the context
    - On the local player, one per person at the machine
    - On the game instance
  answerIndex: 2
  explanation: It is a local player subsystem, so two players on one machine can have different contexts. Reach it with ULocalPlayer::GetSubsystem and the controller's local player.
- id: why-notify
  type: multiple-choice
  prompt: "Why add the mapping context in NotifyControllerChanged instead of in the pawn's constructor?"
  choices:
    - The constructor runs before there is a controller, so there is no player to add a context to
    - Constructors cannot call functions
    - NotifyControllerChanged runs every frame
  answerIndex: 0
  explanation: A pawn may be built long before, or without, any player. The context belongs to whoever controls it right now.
- id: explain-setup
  type: explain-in-one-sentence
  prompt: In one sentence, say when SetupPlayerInputComponent runs and what you do there.
  modelAnswer: It runs each time a local player controller possesses the pawn, and the pawn binds its input actions to its functions there.
  rubric:
    - Says it runs at possession, not at spawn
    - Says the pawn binds actions to functions in it
  explanation: The input component only exists while a player controls the pawn.
```
