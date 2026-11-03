---
id: s3-save-games
title: Save game objects and slots
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [saving, data]
terms: [savegame, uproperty]
prerequisites: [s3-save-plan]
xp: 30
estimatedMinutes: 8
concepts:
  - A USaveGame is an object whose properties are written to a named slot and read back later
  - Saving to a slot outlives the level and the game; saving to memory does not
  - Loading gives back a new object that must be cast to its class
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: you make a save game object, set its Coins property to 7, and call SaveGameToSlot with the slot name \"Vault\". You quit the game, start it again, and call LoadGameFromSlot(\"Vault\", 0). What do you get back?"
choices:
  - The same object you saved, still in memory
  - A new save game object with Coins at 7
  - Nothing, because saves only live until the game quits
  - A save game object with Coins at its default value
answerIndex: 1
explanation: The slot is a file on disk; loading reads it and builds a new object of the saved class with the saved values.
```

# Card

Progress that must outlive a level or a game session goes into a **save game**: an object of a class derived from `USaveGame` (header `GameFramework/SaveGame.h`). The class is ordinary data: `UPROPERTY` fields such as a coin count, a map of states, or a transform. Every `UPROPERTY` on it is written when it is saved; it needs no special specifier.

`UGameplayStatics` (header `Kismet/GameplayStatics.h`) does the work with a slot, a name you choose plus a user index (0 for a single local player):

- `CreateSaveGameObject(UMySave::StaticClass())` makes an empty save object of your class.
- `SaveGameToSlot(SaveObject, TEXT("Vault"), 0)` writes it and returns whether it worked. On desktop platforms the slot becomes a file in the project's `Saved/SaveGames` folder.
- `DoesSaveGameExist(TEXT("Vault"), 0)` asks whether the slot has been written.
- `LoadGameFromSlot(TEXT("Vault"), 0)` reads the slot and returns a new `USaveGame*`, or null. Cast it to your class before you use it.
- `DeleteGameInSlot(TEXT("Vault"), 0)` removes the slot.

The same object can also go to bytes in memory with `SaveGameToMemory` and back with `LoadGameFromMemory`, which is useful for undo or for sending a state somewhere else, but nothing written to memory survives quitting the game.

Saving to a slot and loading from it happen at once on the calling thread. For big saves, `AsyncSaveGameToSlot` and `AsyncLoadGameFromSlot` do the file work on another thread and call a delegate when they finish, so the frame does not hitch; the world in this pack uses the plain calls so tests can check the result on the same line.

A save game holds data, never actors: a pointer to a door in the level would be meaningless after the level opens again. Store what you need to find the actor again, such as a name or an id, and the values to put back.

# Example

```cpp
/** A checkpoint for a vault: the coins carried. */
UCLASS()
class UDojoExVaultSave : public USaveGame
{
	GENERATED_BODY()

public:
	UPROPERTY()
	int32 Coins = 0;
};

// Saving.
UDojoExVaultSave* Save = Cast<UDojoExVaultSave>(UGameplayStatics::CreateSaveGameObject(UDojoExVaultSave::StaticClass()));
Save->Coins = 7;
UGameplayStatics::SaveGameToSlot(Save, TEXT("Vault"), 0);

// Loading, later or in another session.
if (UDojoExVaultSave* Loaded = Cast<UDojoExVaultSave>(UGameplayStatics::LoadGameFromSlot(TEXT("Vault"), 0)))
{
	UE_LOG(LogTemp, Log, TEXT("Coins: %d"), Loaded->Coins);
}
```

# Questions

```yaml
- id: fill-save-call
  type: fill-blank
  prompt: "To write a save game object to the slot named Vault for player 0, call UGameplayStatics::___(Save, TEXT(\"Vault\"), 0)."
  acceptedAnswers: [SaveGameToSlot]
  explanation: SaveGameToSlot writes the object to the slot and returns whether it worked.
- id: load-needs-cast
  type: multiple-choice
  prompt: LoadGameFromSlot returns a USaveGame pointer. What do you do before reading your own Coins field from it?
  choices:
    - Nothing; every field of every save class is on USaveGame
    - Cast it to your save class and check the result for null
    - Call CreateSaveGameObject on it
    - Copy it into a new object with NewObject
  answerIndex: 1
  explanation: The engine builds an object of the class that was saved; casting gives you your fields, and a null result means the slot was missing or held another class.
- id: spot-pointer-in-save
  type: spot-the-bug
  prompt: A checkpoint loads after the game restarts, but the door it should open is never found. Which line is wrong?
  code: |
    UCLASS()
    class UDojoExVaultSave : public USaveGame
    {
    	GENERATED_BODY()
    public:
    	UPROPERTY()
    	TObjectPtr<AActor> OpenDoor;
    };
  bugLine: 7
  fix: Save something that names the door again in a fresh level, such as its id, and find the door by it after loading.
  explanation: A pointer names an object that existed in the old session; when the level opens again the door is a new object, so the saved pointer leads nowhere.
- id: memory-or-slot
  type: multiple-choice
  prompt: A checkpoint must still load after the player quits and starts the game again. Which call writes it?
  choices:
    - SaveGameToMemory
    - SaveGameToSlot
    - CreateSaveGameObject
    - DoesSaveGameExist
  answerIndex: 1
  explanation: Only a slot is written to disk; memory is gone when the game quits.
- id: explain-save-game
  type: explain-in-one-sentence
  prompt: In one sentence, say what a USaveGame is and why it holds ids instead of pointers to actors.
  modelAnswer: A USaveGame is a data object whose properties are written to a slot and read back later, and it holds ids because the actors of a reloaded level are new objects that only an id can find again.
  rubric:
    - Says the save game is data written to and read from a slot
    - Says pointers to actors do not survive a reload, so ids are stored
  explanation: The slot outlives the objects; anything that refers to a level object must be something you can look up again.
```
