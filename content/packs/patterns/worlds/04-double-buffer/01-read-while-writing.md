---
id: p4-read-while-writing
title: Reading a page someone is still writing
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [double-buffer]
terms: [tick, tarray, render-thread]
prerequisites: [p3-per-frame-behavior]
xp: 25
estimatedMinutes: 7
concepts:
  - A change made one entry at a time is visible half-done to anyone who reads in the middle
  - When a step reads the same data it writes, the order of the walk leaks into the result
  - Readers can be given a finished copy while the next one is built, and handed the new one all at once
  - Unreal's renderer already works from its own copy of each frame
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: an arena's leaderboard is rebuilt by updating one team's line at a time. The announcer's widget reads the board every frame. On the frame the update happens, what can the announcer read out?"
choices:
  - Always the old board, because the update is one function call
  - Always the new board, because the widget reads after the update
  - A mix of updated and not-yet-updated lines, if it reads while the update is under way
  - Nothing, because the engine locks the board during the update
answerIndex: 2
explanation: Nothing in the engine stops a reader from looking between two writes. If the reading happens during the update, through a delegate the update fires or on another thread, it sees some lines new and some old.
```

# Card

Most changes to game state happen one piece at a time: one grid square, one team's score, one agent's position. While that is under way, the data is half old and half new. Two kinds of trouble follow.

**Readers see half a change.** Anything that looks at the data in the middle (a widget refreshed by a delegate the update fires, a worker thread, a debug draw) sees a state that never really existed: some entries from before, some from after.

**The update reads its own half-finished work.** A rule like "a square catches fire if a neighbor is burning" or "a team far behind the leader gets a bonus" reads other entries. If the walk has already changed some of them, entries visited late see a different world from entries visited early. Reverse the loop and the result changes. You chose a direction by writing `for`, not by design.

**The fix is a finished copy.** Keep the state readers see, finished and still, and build the next state in a second place. When the next state is complete, hand it over in one move. Readers either see all of the old or all of the new. Rules read only the finished copy, so every entry sees the same moment and the walk order stops mattering.

**Unreal already does this for drawing.** The game thread and the **render thread** do not share the same live data. Components send the renderer their own copies of what they look like (scene proxies), so the game thread can build the next frame while the renderer draws the last one from its copy. Physics results work the same way: gameplay reads the result of the last finished physics step. What you still write by hand is the gameplay version: grids, crowds, and tables where rules read neighbors, or data that arrives in the middle of a frame.

# Example

```cpp
// In place: a square visited later sees a neighbor already changed this step.
for (int32 Index = 0; Index < Tiles.Num(); ++Index)
{
	Tiles[Index] = RuleFor(Index);
}

// Finished copy: every rule reads Tiles, every write goes to NextTiles, then one swap.
for (int32 Index = 0; Index < Tiles.Num(); ++Index)
{
	NextTiles[Index] = RuleFor(Index);
}
Swap(Tiles, NextTiles);
```

# Questions

```yaml
- id: order-leak
  type: multiple-choice
  prompt: "A step updates a row of tiles in place, left to right, and each tile's new value depends on its left neighbor. What happens if you change the loop to run right to left?"
  choices:
    - Nothing, a loop's direction never matters
    - The result can change, because left neighbors are now read before they are updated instead of after
    - The step runs faster but gives the same result
    - The engine reorders the loop for you
  answerIndex: 1
  explanation: In place, a tile reads whatever its neighbor holds at that moment, which depends on whether the loop has reached the neighbor yet.
- id: fill-swap
  type: fill-blank
  prompt: "After building the next grid in NextTiles, the step hands it over in one move with ___(Tiles, NextTiles);"
  acceptedAnswers: [Swap]
  explanation: Swap exchanges the two arrays' contents without copying their elements, so readers move from the whole old grid to the whole new one at once.
- id: spot-in-place
  type: spot-the-bug
  prompt: This step is meant to give every lantern the average of its neighbors' brightness from the start of the step. Which line makes the result depend on loop order?
  code: |
    void ADojoArenaLanterns::Blend()
    {
    	for (int32 Index = 1; Index < Brightness.Num() - 1; ++Index)
    	{
    		Brightness[Index] = (Brightness[Index - 1] + Brightness[Index + 1]) * 0.5f;
    	}
    }
  bugLine: 5
  fix: Read from Brightness but write into a second array, then swap the two after the loop.
  explanation: The left neighbor was already blended earlier in this same loop, so each lantern averages a mix of old and new values.
- id: render-copy
  type: multiple-choice
  prompt: "Why can the game thread change actors for the next frame while the current frame is still being drawn?"
  choices:
    - The renderer draws from its own copies of what components look like, not from the live actors
    - The game thread pauses until drawing finishes
    - Actors are read-only while the renderer runs
    - The renderer only draws every other frame
  answerIndex: 0
  explanation: Components hand the render thread their own render-side copies, so drawing never reads game state halfway through a change.
- id: explain-finished-copy
  type: explain-in-one-sentence
  prompt: In one sentence, say why reading a finished copy removes order dependence from a step.
  modelAnswer: Every rule reads the same unchanging state from the start of the step, so no entry can see another entry's new value, and whatever order the writes happen in, the result is the same.
  rubric:
    - Says rules read a state that does not change during the step
    - Says this makes the walk order irrelevant to the result
  explanation: Order leaks in only when a read can see a write from the same step.
```
