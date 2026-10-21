---
id: f4-pawns-and-controllers
title: Pawns, characters, controllers, and possession
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [framework]
terms: [pawn, character, player-controller, possession, default-pawn-class]
prerequisites: [f3-sentry]
xp: 25
estimatedMinutes: 7
concepts:
  - A pawn is a body; a controller is the will that drives it
  - Possession connects one controller to one pawn at a time
  - A character is a pawn that already knows how to walk
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the player's controller possesses a turret pawn, and later the turret is destroyed. What happens to the player controller?"
choices:
  - It is destroyed with the turret
  - It stays, controlling nothing until it possesses another pawn
  - It turns into a spectator pawn automatically and cannot possess again
  - The level reloads
answerIndex: 1
explanation: The controller and the pawn are separate actors; losing the pawn leaves the controller alive and free to possess another one.
```

# Card

Unreal splits "a thing in the world that can be driven" from "the decisions that drive it".

A **pawn** (`APawn`) is a body: an actor that can be possessed and moved by input or AI. A turret, a vehicle, and a camera drone can all be pawns. A **character** (`ACharacter`) is a pawn that comes with a capsule for collision, a skeletal mesh slot, and the Character Movement Component, so walking, jumping, falling, and swimming already work.

A **controller** is the will. `APlayerController` turns a human's input into commands and owns the player's view and HUD; `AAIController` runs AI logic. A controller drives one pawn at a time through **possession**: `Controller->Possess(Pawn)` connects them and `UnPossess()` disconnects. Possession happens on the server (or in single player, the only machine), and the pawn's `PossessedBy` and the controller's `OnPossess` run when it does.

Keeping them apart pays off: the same AI controller can drive a goblin or a dragon; the player's controller survives the player's death and possesses a fresh pawn on respawn; and things that belong to the player rather than the body (the score, the inventory UI) live on the controller or the player state, not on the pawn.

Which pawn a player gets at the start comes from the game mode's **Default Pawn Class**, which the next quest covers.

# Example

```cpp
// Swaps the player from walking to a mounted turret and back.
void ADojoF4TurretSeat::Mount(APlayerController* Player)
{
	if (!IsValid(Player) || !IsValid(Turret)) return;

	PreviousPawn = Player->GetPawn();
	Player->Possess(Turret);
}

void ADojoF4TurretSeat::Dismount(APlayerController* Player)
{
	if (!IsValid(Player) || !IsValid(PreviousPawn)) return;

	Player->Possess(PreviousPawn);
}
```

# Questions

```yaml
- id: where-score
  type: multiple-choice
  prompt: "A player's score must survive their character dying and respawning. Where should it live?"
  choices:
    - On the character
    - On something that outlives the body, such as the player state or the controller
    - In a local variable in the character's BeginPlay
  answerIndex: 1
  explanation: The character is destroyed on death; the player's controller and player state are not.
- id: fill-possess
  type: fill-blank
  prompt: "To make a controller start driving a pawn, call Controller->___(Pawn)."
  acceptedAnswers: [Possess]
  explanation: Possess connects the controller to the pawn; UnPossess disconnects them.
- id: spot-pawn-owns-hud
  type: spot-the-bug
  prompt: After a few deaths, the screen shows several score widgets stacked on top of each other, each with a different score. Which line creates the HUD in the wrong place?
  code: |
    void ADojoF4Hero::BeginPlay()
    {
    	Super::BeginPlay();
    	ScoreWidget = CreateWidget<UUserWidget>(GetWorld(), ScoreWidgetClass);
    	ScoreWidget->AddToViewport();
    }
  bugLine: 4
  fix: Create the score widget from the player controller, which survives the pawn's death, and keep the reference there.
  explanation: A widget added to the viewport stays until it is removed or the level goes away, so every fresh pawn's BeginPlay adds another one, and the old ones keep showing what their dead pawn knew.
- id: character-or-pawn
  type: multiple-choice
  prompt: "A rolling ball the player steers with physics forces needs no walking, jumping, or capsule. What should its class derive from?"
  choices: [ACharacter, APawn, APlayerController, AGameModeBase]
  answerIndex: 1
  explanation: ACharacter brings walking movement the ball would never use; a plain pawn is the lighter fit.
- id: explain-split
  type: explain-in-one-sentence
  prompt: In one sentence, say why Unreal keeps the controller separate from the pawn.
  modelAnswer: The controller is the decision maker and the pawn is only the body, so one kind of controller can drive many bodies and the player's controller survives when a body is destroyed.
  rubric:
    - Says the controller decides and the pawn is the body
    - Mentions swapping bodies or the controller surviving the pawn
  explanation: Possession is the link that can be broken and remade.
```
