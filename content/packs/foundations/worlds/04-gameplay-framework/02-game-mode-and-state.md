---
id: f4-game-mode-and-state
title: Game mode, game state, player state, and game instance
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [framework]
terms: [game-mode-base, game-state-base, player-state, game-instance, default-pawn-class]
prerequisites: [f4-pawns-and-controllers]
xp: 25
estimatedMinutes: 7
concepts:
  - The game mode holds the rules and exists only where the game is run
  - Game state and player state hold what everyone needs to know
  - The game instance outlives level changes
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: in a networked match, a client's HUD code calls `GetWorld()->GetAuthGameMode()` to read the time left. What does it get?"
choices:
  - The game mode, same as on the server
  - nullptr, because the game mode exists only on the server
  - A copy of the game mode made for the client
  - The game state
answerIndex: 1
explanation: The game mode lives only where the game is run; values every player needs belong on the game state, which is replicated to everyone.
```

# Card

Four classes split the bookkeeping of a match. Each one answers "who needs this, and for how long".

- **Game mode** (`AGameModeBase`): the rules. How a match starts and ends, who may join, where players spawn, and which classes to use: **Default Pawn Class**, Player Controller Class, Game State Class, HUD Class. One per level, set in World Settings or the project's Maps and Modes. It exists only on the server (or in single player), so clients never see it.
- **Game state** (`AGameStateBase`): what every player should know about the match: the time left, the team scores, the list of player states. It is replicated to everyone.
- **Player state** (`APlayerState`): what every player should know about one player: name, score, ping. There is one per player, and it survives that player's pawn dying.
- **Game instance** (`UGameInstance`): one per running game, created at startup and kept until the game closes. It survives level changes, so it holds things like the chosen difficulty or the profile name. It is not replicated: every machine has its own.

A useful habit: rules go on the game mode, shared facts on the states, and anything that must outlive a level on the game instance (or a game instance subsystem). Putting a match score on the pawn or the game mode is a classic bug in multiplayer, and a habit worth avoiding even in single player.

# Example

```cpp
// A game mode that only sets which classes the level uses; the rules come later.
UCLASS()
class ADojoF4YardGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	ADojoF4YardGameMode()
	{
		DefaultPawnClass = ADojoF4Keeper::StaticClass();
		GameStateClass = ADojoF4YardGameState::StaticClass();
	}
};

// Shared match facts every player can read.
UCLASS()
class ADojoF4YardGameState : public AGameStateBase
{
	GENERATED_BODY()

public:
	UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "Yard")
	int32 TargetsLeft = 0;
};
```

# Questions

```yaml
- id: where-timer
  type: multiple-choice
  prompt: "Every player's HUD shows the round's time left. Where should that value live?"
  choices: [Game mode, Game state, Game instance, The local player's pawn]
  answerIndex: 1
  explanation: The game state is shared with everyone; the game mode is server-only and the game instance is per machine.
- id: fill-default-pawn
  type: fill-blank
  prompt: "The pawn a player gets when the match starts comes from the game mode's ___ setting."
  acceptedAnswers: [Default Pawn Class, DefaultPawnClass]
  explanation: The game mode spawns that class for each joining player and has their controller possess it.
- id: spot-difficulty-on-mode
  type: spot-the-bug
  prompt: The difficulty the player picks in the main menu is forgotten as soon as the first level opens. Which line stores it in the wrong place?
  code: |
    void UDojoF4MainMenu::PickDifficulty(int32 Level)
    {
    	ADojoF4YardGameMode* Mode = GetWorld()->GetAuthGameMode<ADojoF4YardGameMode>();
    	Mode->Difficulty = Level;
    }
  bugLine: 4
  fix: Store the difficulty on the game instance or a game instance subsystem, which survives opening a new level.
  explanation: Opening a level destroys the menu level's game mode along with its other actors.
- id: player-state-life
  type: multiple-choice
  prompt: "A player's character dies and respawns. Which object keeps the same identity throughout?"
  choices: [The character, The player state, The character movement component]
  answerIndex: 1
  explanation: The player state belongs to the player, not to the body.
- id: explain-instance
  type: explain-in-one-sentence
  prompt: In one sentence, say what the game instance is for.
  modelAnswer: It is a single object that lives from the game's start to its end, across level changes, so it holds things that must persist between levels on that machine.
  rubric:
    - Mentions surviving level changes or living for the whole game
    - Mentions what it is used for, such as settings or a profile
  explanation: It is not replicated; each machine has its own.
```
