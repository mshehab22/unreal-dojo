---
id: p14-singleton-when-not
title: When the one and only is the wrong question
order: 6
kind: concept
difficulty: 3
patterns: [singleton]
skills: [singleton, architecture]
terms: [world-subsystem, game-instance-subsystem, blueprint-function-library, actor-component, static-variable, gameplay-statics]
prerequisites: [p14-standings-refactor]
xp: 25
estimatedMinutes: 8
concepts:
  - A manager that only works on other objects is often behavior that belongs on those objects
  - A subsystem with the wrong owner is a global with a shorter or longer life than its data
  - A subsystem that collects every unrelated job is the old all-purpose manager with a new base class
  - Helpers that keep no state need a function library, not an object
  - A rule of one per world is never kept in a static, and gameplay code never finds its world through a global
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a DartManager moves every dart on the track each frame, checks whether each one left the track, and destroys it. A teammate turns it into a UWorldSubsystem so it is no longer a static. Is the design fixed?"
choices:
  - Yes; a subsystem is never a problem
  - Only the lifetime is fixed; moving and checking a dart is the dart's own behavior, and still lives in a manager
  - No; subsystems cannot hold arrays
  - Yes, as long as the subsystem ticks
answerIndex: 1
explanation: The subsystem fixes who owns the manager. It does not ask whether the manager should exist, and here each dart can move and check itself.
```

# Card

Replacing a static with a subsystem fixes who owns a thing and how long it lives. It does not check whether the thing should exist, or whether it has the right owner. These are the common ways the old problem comes back.

**The manager that should not exist.** A class named after other objects with "Manager" on the end, which only loops over them and does their work, usually holds behavior that belongs on them. Darts that move themselves and destroy themselves when they leave the track need no manager at all. Move the behavior onto the actor or into a component it carries, and keep a central object only for what is truly shared, such as a registry other code asks questions of.

**The wrong owner.** A `UGameInstanceSubsystem` lives through level loads, so per-level data put there leaks into the next level, which is the old static problem with a shorter fuse. A `UWorldSubsystem` dies with its level, so a championship table kept there is lost at the first level change. Pick the owner by how long the data must live, not by which base class you used last.

**The god subsystem.** A single `UGameManagerSubsystem` that holds the score, the save files, the music, the matchmaking, and the weather is a global with a nicer constructor. Each job with its own lifetime and its own readers gets its own subsystem, or no subsystem at all.

**Helpers with no state.** Turning a lap time into text, or finding the nearest actor of a class, needs no object. A `UBlueprintFunctionLibrary` or free functions in a namespace say that honestly, and the engine does the same with `UGameplayStatics`.

**A one per world rule in a static.** A static flag or a static pointer counts every world in the program, so the second player in Play In Editor, or the next track, finds it already taken. Keep such a rule in the world: ask the world for its other actors, or let a world subsystem hold the claim.

**Finding the world through a global.** `GWorld` and the engine's list of world contexts name whichever world the engine is busy with, which in the editor or in a multiplayer test may not be the one your actor stands in. Gameplay code asks its own actor or component for `GetWorld()`.

# Example

```cpp
// The dart moves itself and leaves when it is off the track; no manager loops over darts.
void ADart::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	AddActorWorldOffset(Velocity * DeltaSeconds);
	if (!TrackBounds.IsInside(GetActorLocation())) Destroy();
}
```

# Questions

```yaml
- id: when-not-manager
  type: multiple-choice
  prompt: "Which of these is the strongest sign that a manager class should not exist?"
  choices:
    - It is used by more than one level
    - It only loops over other objects and does their work for them
    - It has a UPROPERTY
    - It is a UObject
  answerIndex: 1
  explanation: Work done to each object in turn is usually that object's own behavior; moving it onto the object removes the manager.
- id: when-not-scope
  type: multiple-choice
  prompt: "Standings that must start empty in every level are kept in a UGameInstanceSubsystem. What goes wrong?"
  choices:
    - Nothing; the game instance resets them on every level load
    - The standings of the last level are still there in the next one, because the game instance outlives every level
    - The standings are destroyed every frame
    - Game instance subsystems cannot be found from actors
  answerIndex: 1
  explanation: The owner decides the lifetime. Per-level data needs a per-level owner, the world.
- id: when-not-helpers
  type: multiple-choice
  prompt: "A helper turns 83.4 seconds into the text \"1:23.4\" and keeps no state. Where should it live?"
  choices:
    - In a UGameInstanceSubsystem so everyone can reach it
    - In a static Get that returns a formatter object
    - In a UBlueprintFunctionLibrary or a plain function, because there is no object to own
    - In every actor that shows a time
  answerIndex: 2
  explanation: A function with no state needs no instance, so a function library is simpler and says exactly what it is.
- id: spot-gworld
  type: spot-the-bug
  prompt: A checkpoint reports to its world's standings. Which line can report to the standings of a different world?
  code: |
    bool ACheckpoint::Touch(FName Driver)
    {
    	UStandings* Standings = GWorld->GetSubsystem<UStandings>();
    	if (!Standings) return false;
    	return Standings->Pass(Driver, Index);
    }
  bugLine: 3
  fix: Ask the checkpoint's own world, GetWorld()->GetSubsystem<UStandings>(), instead of the global GWorld.
  explanation: GWorld is a global that points at whichever world the engine is working on, which with two players in Play In Editor, or in the editor itself, may not be this checkpoint's world.
- id: spot-static-claim
  type: spot-the-bug
  prompt: Only one save coordinator may run in each world. Which line breaks the rule when two worlds are open at once?
  code: |
    void ASaveCoordinator::BeginPlay()
    {
    	Super::BeginPlay();
    	static TWeakObjectPtr<ASaveCoordinator> Running;
    	if (Running.IsValid()) { bDuplicate = true; return; }
    	Running = this;
    }
  bugLine: 4
  fix: Keep the claim in the world, by searching this world for another running coordinator or by letting a world subsystem hold it.
  explanation: The static is shared by every world in the program, so the coordinator of a second world finds the first world's coordinator and stands down although its own world has none.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say why turning a manager into a subsystem does not always fix it.
  modelAnswer: A subsystem only fixes who owns the manager and how long it lives, so a manager that does other objects' work, has the wrong owner, or collects unrelated jobs is still the wrong design after the change.
  rubric:
    - Says a subsystem fixes ownership or lifetime only
    - Names a remaining problem such as behavior on the wrong class, the wrong owner, or a god manager
  explanation: The question is not only who owns the one instance, but whether there should be one, and of what.
```
