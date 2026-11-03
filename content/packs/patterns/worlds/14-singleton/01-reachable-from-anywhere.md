---
id: p14-reachable-from-anywhere
title: One lap board for the whole program
order: 1
kind: concept
difficulty: 3
patterns: []
skills: [singleton, lifecycle]
terms: [static-variable, add-to-root, garbage-collection, play-in-editor, dependency-injection, world-subsystem]
prerequisites: [p13-bytecode-when-not]
xp: 25
estimatedMinutes: 10
concepts:
  - A static variable exists once for the whole program, not once per world, per race, or per object
  - In the editor one program holds the editor's world and every Play In Editor session, so anything static outlives them all
  - A static pointer to a UObject is invisible to the garbage collector, so the object is either rooted for good or destroyed behind the pointer's back
  - Asking for "only one" and asking for "reachable from anywhere" are two separate needs, and the second quietly forbids a second one ever
  - The other homes are an object handed to the code that needs it, the world it belongs to, or a subsystem the engine owns
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the circuit's lap board is a UObject with a static Get function. The first call makes the board with NewObject, roots it with AddToRoot, and keeps it in a static pointer; every later call returns that pointer. You play in the editor, drive two laps, stop, and play again. What does the board show at the start of the second session?"
choices:
  - An empty board, because stopping play destroys everything the session made
  - The two laps from the first session, because the board belongs to the program, not to the session
  - Nothing at all; the static pointer is reset to nullptr when play stops
  - A crash, because AddToRoot is not allowed during play
answerIndex: 1
explanation: Static storage lasts as long as the program, and the editor is one program for every play session. A rooted object is never collected, so the second session reads the first session's laps.
```

# Card

The trial circuit has one lap board. Finish lines write to it, the scoreboard reads it, the replay screen reads it. Passing it to all of them feels like busywork, so the board gets a static `Get` function: the first call makes it, and every later call returns the same one. Any code can now write `ULapBoard::Get()` without being given anything. It is quick to write and it works in the first test level. Then the bills arrive.

**One per program is not one per race.** A static variable exists once for the whole program. In the editor, that program holds the editor's own world and every Play In Editor session, and with several players in Play In Editor it holds several game worlds at once. The board belongs to none of them. The second session starts with the first session's laps, and two worlds running together share one board.

**A static pointer is invisible to the garbage collector.** Unreal keeps a `UObject` alive only while something it can see points at it: a `UPROPERTY`, the root set, an object it already keeps. A plain static pointer is not one of those. Left alone, the board is collected and the pointer keeps the address of a destroyed object. The usual patch is `AddToRoot`, which keeps the board forever, and that brings back the first problem: it never ends with the race, the level, or the session.

**Nobody can see who uses it.** A function that calls `Get` inside its body has a dependency that its signature does not show. Reading the function's declaration, you cannot tell it writes lap times. Testing it means setting up the one shared board and cleaning it afterwards, and two tests can never run with two boards.

**Only one is not the same as reachable from anywhere.** The day the designers ask for a practice mode whose laps must not reach the records, the circuit needs a second board. Every call site already says `Get`, and `Get` has one answer. "Reachable from anywhere" was the convenience; "never a second one" came free with it, and nobody asked for that part.

**Made the first time somebody asks.** A board made by its first caller is made whenever that call happens to run, maybe in the middle of the first lap, with whatever loading that needs. The program cannot choose when.

**Other homes for the one board.** Give the board to the code that needs it: the race's setup makes it and hands it to each finish line, which is all **dependency injection** means. Let the world own it, so a new world gets a new board, which is what a `UWorldSubsystem` does. And when "there must be only one" is a real rule, check it against the right scope: one per world, not one per program.

# Example

```cpp
// Before: any code can reach the board, and the program owns it.
ULapBoard::Get()->Record(Driver, Seconds);

// After: the line writes into the board it was handed.
void AFinishLine::UseBoard(ULapBoard* NewBoard)
{
	Board = NewBoard;
}
```

# Questions

```yaml
- id: static-lifetime
  type: multiple-choice
  prompt: "How long does a static variable in your game module last?"
  choices:
    - Until the level changes
    - Until the Play In Editor session stops
    - As long as the program, which in the editor spans every play session
    - Until the next garbage collection
  answerIndex: 2
  explanation: Static storage belongs to the program. In the editor, the program is the editor itself, so a static outlives every world and session it holds.
- id: fill-root
  type: fill-blank
  prompt: "A UObject held only by a plain static pointer is kept alive by calling ___ on it, which also keeps it until the program closes."
  acceptedAnswers: [AddToRoot, "AddToRoot()"]
  explanation: AddToRoot puts the object in the root set, which the garbage collector never collects, so it lives as long as the program unless something calls RemoveFromRoot.
- id: spot-hidden
  type: spot-the-bug
  prompt: A finish line records laps. Which line hides a dependency that nothing in the class declaration shows?
  code: |
    void AFinishLine::CrossLine(FName Driver, float Now)
    {
    	if (const float* Start = LapStarts.Find(Driver))
    	{
    		ULapBoard::Get()->Record(Driver, Now - *Start);
    	}
    	LapStarts.Add(Driver, Now);
    }
  bugLine: 5
  fix: Give the line a board pointer, set by whoever builds the race, and record into that pointer instead of calling Get.
  explanation: Get is reachable from anywhere, so the line's declaration never says it writes laps, and no test or mode can give it a different board.
- id: two-needs
  type: multiple-choice
  prompt: "The designers want practice laps kept apart from the records. Why is that hard when every finish line calls ULapBoard::Get?"
  choices:
    - Practice laps are slower to record
    - Get always returns the one board, so every call site would have to change to reach a second one
    - A UObject cannot hold more than one array
    - Static functions cannot be called during play
  answerIndex: 1
  explanation: Making the board reachable from anywhere also made it the only board. Asking for a second one means rewriting every caller.
- id: world-home
  type: multiple-choice
  prompt: "The standings of a race belong to the level the race runs in. Which owner gives each world its own standings and destroys them with the world?"
  choices:
    - A static pointer in the standings class
    - A UWorldSubsystem
    - The class default object
    - A global variable in the game module
  answerIndex: 1
  explanation: The engine makes one world subsystem for each world and destroys it with that world, so a new level starts clean.
- id: explain-anywhere
  type: explain-in-one-sentence
  prompt: In one sentence, say why a static Get for the lap board causes trouble in the Unreal editor even if the game only ever needs one board.
  modelAnswer: The static board belongs to the whole editor program rather than to a world or session, so it keeps laps from earlier play sessions, is shared by worlds running together, and needs AddToRoot or it is collected behind its pointer.
  rubric:
    - Says the static belongs to the program, not a world or a session
    - Names a consequence such as leftover laps, shared worlds, or the garbage collector
  explanation: The trouble is not the number of boards but who owns the one there is.
```
