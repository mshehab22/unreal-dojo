---
id: p14-singleton-card
title: One instance, global access
order: 3
kind: concept
difficulty: 3
patterns: [singleton]
skills: [singleton, framework]
terms: [subsystem, world-subsystem, game-instance-subsystem, local-player-subsystem, engine-subsystem, static-variable]
prerequisites: [p14-lap-log]
xp: 25
estimatedMinutes: 10
concepts:
  - Singleton makes a class guarantee there is only one of it and lets any code reach that one through the class
  - It bundles two needs, one instance and access from anywhere, and most code only has one of them
  - Unreal replaces it with subsystems whose owner and lifetime the engine manages, found through that owner
  - When only one must exist, check it within the right scope, such as one per world, and give it no global access
  - Choose the owner by how long the thing must live, and prefer one well-known owner to many globals
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the circuit now keeps career records that must survive every level load for as long as the game runs, and many actors read them. Which owner fits best?"
choices:
  - A static Get on the records class, rooted with AddToRoot
  - A UGameInstanceSubsystem, made with the game instance and destroyed with it
  - A UWorldSubsystem, so each level has its own records
  - Each finish line making its own records object
answerIndex: 1
explanation: The game instance lives from launch to quit and survives level loads, and the engine makes and destroys its subsystems with it. A world subsystem would lose the records at every level change, and a rooted static would outlive even the game session in the editor.
```

# Card

The lap board's static `Get` from the first quest is the **Singleton** pattern: a class makes sure only one instance of it ever exists, and gives any code that one instance through the class itself. It is one of the best known patterns and, in game code, one of the most often regretted.

**Two needs in one.** Singleton answers "there must be only one" and "everyone must be able to reach it" at once. Code that only needs the second, like the finish line, gets the first for free and cannot undo it. Code that only needs the first gains a global it did not ask for. Separate them: if access is the need, hand the object in or let an owner provide it; if one instance is the rule, check that rule where it applies and give nothing global access.

**What it costs.** Any function can use it without saying so, which makes code hard to read and to test. It is state shared by everything, including two worlds that run at once. It is made whenever somebody first asks, which may be mid-race. And in Unreal it fights the engine: a static pointer to a `UObject` is invisible to the garbage collector and outlives every Play In Editor session.

**Unreal's forms.** The engine gives you single instances with an owner and a lifetime, found through that owner. Derive from a subsystem base class and the engine makes one instance when the owner is made and destroys it with the owner:

- `UEngineSubsystem`: one for the engine, alive as long as the program; rarely right for gameplay.
- `UGameInstanceSubsystem`: one per game session, surviving level loads; career records, a save coordinator.
- `UWorldSubsystem`: one per world, gone with the level; the standings of the race in this level.
- `ULocalPlayerSubsystem`: one per local player, so split screen gets one each; a player's own settings.

Each is found with `GetSubsystem<T>()` on its owner: the world, the game instance, the local player. The engine also has a few well-known owners that already exist once per game or per world: the game instance, the game mode, the game state, and each player controller. The engine keeps some true globals of its own, such as `GEngine` and `FModuleManager`, at the engine layer. Game code has no reason to add to them.

**When only one is a rule.** Some things must be one of a kind: one set of start lights on a track, one coordinator for the save files. Enforce that rule where the instance comes into being, and still give it no global access: whoever owns the one instance hands it to the code that needs it.

**Lazy or made on time.** The classic form makes the instance the first time anyone asks. A subsystem is made when its owner is made, and its `Initialize` runs then, so heavy setup happens at a moment the game chooses, such as a level load.

**A function library is more honest for helpers.** Functions that keep no state, such as converting a lap time to text, need no object at all. A `UBlueprintFunctionLibrary` or plain functions in a namespace say exactly that.

# Example

```cpp
// One per game session: the engine makes it with the game instance and removes it with the game instance.
UCLASS()
class UCareerRecords : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	void Record(FName Driver, float Seconds);
};

// Found through its owner, never through a static.
UCareerRecords* Records = GetGameInstance()->GetSubsystem<UCareerRecords>();
```

# Questions

```yaml
- id: two-problems
  type: multiple-choice
  prompt: "Which two needs does the Singleton pattern bundle together?"
  choices:
    - Fast access and low memory
    - Exactly one instance, and access to it from anywhere
    - Saving and loading
    - Ticking and rendering
  answerIndex: 1
  explanation: The class both guarantees a single instance and hands it to any caller. Most code needs only one of the two, and the pattern forces both.
- id: scope-standings
  type: multiple-choice
  prompt: "The standings of a race must start empty in every level and must never be shared by two worlds running at once. Which owner fits?"
  choices:
    - UEngineSubsystem
    - UGameInstanceSubsystem
    - UWorldSubsystem
    - A static pointer inside the standings class
  answerIndex: 2
  explanation: A world subsystem is made for each world and destroyed with it, so each level and each running world has its own.
- id: scope-split-screen
  type: multiple-choice
  prompt: "In split screen, each player has their own control settings, kept while they play. Which owner gives each player one?"
  choices:
    - ULocalPlayerSubsystem
    - UWorldSubsystem
    - UEngineSubsystem
    - The game mode
  answerIndex: 0
  explanation: A local player subsystem exists once per local player, so two players on one screen get one each.
- id: fill-get-subsystem
  type: fill-blank
  prompt: "A world subsystem is found with GetWorld()->___<UMyStandings>()."
  acceptedAnswers: [GetSubsystem]
  explanation: The world hands out its own instance of each world subsystem class, so the caller names the owner instead of a global.
- id: spot-unseen
  type: spot-the-bug
  prompt: Career records are made the first time anyone asks for them. Which line lets the garbage collector destroy the records while code still uses them?
  code: |
    UCareerRecords* UCareerRecords::Get()
    {
    	static UCareerRecords* Instance = nullptr;
    	if (!Instance) Instance = NewObject<UCareerRecords>();
    	return Instance;
    }
  bugLine: 3
  fix: Make the records a UGameInstanceSubsystem and find them with GetGameInstance()->GetSubsystem<UCareerRecords>(), so the engine owns them for the game session.
  explanation: A plain static pointer is not something the garbage collector can see, so nothing keeps the object alive and the pointer can be left holding a destroyed object. Rooting it instead keeps it for the whole program, which is the other half of the problem.
- id: explain-singleton
  type: explain-in-one-sentence
  prompt: In one sentence, say what Unreal offers in place of a hand-written Singleton and why it is better.
  modelAnswer: Subsystems, which the engine makes and destroys with a known owner such as the world or the game instance and which code finds through that owner, so each has a clear lifetime and nothing static is left between worlds or play sessions.
  rubric:
    - Names subsystems or an engine-managed owner
    - Says why, such as a defined lifetime, no static state, or found through the owner
  explanation: The engine replaces a global with an object that has an owner, and the owner decides how long it lives.
```
