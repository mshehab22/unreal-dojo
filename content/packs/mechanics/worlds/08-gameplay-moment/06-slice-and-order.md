---
id: m8-slice-and-order
title: Building a moment in the right order
order: 6
kind: concept
difficulty: 3
patterns: []
skills: [planning, delegates]
terms: [spawnactor, dynamic-multicast-delegate, unbinding-delegates]
prerequisites: [m8-exit-gate]
xp: 30
estimatedMinutes: 9
concepts:
  - Pieces that know nothing of each other are built and tested first, and one director connects them last
  - A moment is integrated one beat at a time, and stays playable after each step
  - When time slips, the cut list goes in a fixed order
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: you have a light, a counter, and an exit, each tested alone. What is the safest way to join them into one moment?"
choices:
  - "Join all three at once and test the whole moment"
  - "Add one connection at a time and play the moment after each, starting with the first minute of it"
  - "Rewrite them as one big class"
  - "Wait until the art is done"
answerIndex: 1
explanation: When a joined moment fails, one new connection is the only suspect. Joining everything at once leaves every connection under suspicion.
```

# Card

**Pieces first, director last.** The pieces of a moment, a sensor, a counter, an exit, should each work alone and be tested alone, because a piece that knows nothing about the others is easy to test. The connections between them belong in one place, a **director**: it spawns the round, tells each piece about the ones it should listen to, translates one piece's announcement into another's call, and restarts the round. The director owns no rule of its own; if it starts deciding things, move that rule into a piece.

**A vertical slice.** Before you build the whole moment, build the first thirty seconds of it with all the mechanics that appear in them, playable from start to finish. A slice shows early whether the pieces work together and what the moment feels like.

**One beat at a time.** Then add the rest one beat at a time, and play the moment after each. A beat is a stretch of the walkthrough with one purpose, such as tension, relief, a puzzle, or a reward. The rule is that the moment is playable after every step. When something breaks, the last step is where to look.

**Rounds.** A moment is played again and again. Starting a round should spawn everything fresh and leave nothing behind: stop listening to the old pieces, destroy them, and release the player's pawn before destroying it. A second round must play like the first.

**The cut list.** When time slips, decide in the same order every time: cut what the player will not notice first, then fake what the player sees only briefly, then simplify what they use often, and last of all touch the core of the moment. Say each decision in one sentence.

# Example

```cpp
void ADojoMoment::StartRound()
{
	ClearLastRound();

	Light = World->SpawnActor<ADojoLight>(LightSpot, FRotator::ZeroRotator);
	Box = World->SpawnActor<ADojoBox>(BoxSpot, FRotator::ZeroRotator);

	Box->OnPowered.AddUniqueDynamic(this, &ADojoMoment::HandlePowered);
	Clock->Start();
}
```

# Questions

```yaml
- id: where-rules
  type: multiple-choice
  prompt: "The director checks every frame whether the meter is full and, if so, ends the moment. What should change?"
  choices:
    - "Nothing, a director may decide things"
    - "Move the rule into the meter or a clock that listens to it, and let the director only connect them"
    - "Make the director a subsystem"
  answerIndex: 1
  explanation: A director that decides things becomes the one class everything depends on. Rules belong in the pieces that own the data, and an announcement replaces the per-frame check.
- id: cut-order
  type: multiple-choice
  prompt: "A moment is two days behind. It has a siren sound nobody will miss, a glow on the pickup that is seen for a second, and the core chase. What goes first?"
  choices:
    - "The chase, since it is the hardest"
    - "The glow, since it is only seen for a second"
    - "The siren sound, which the player will not notice is missing"
    - "Nothing; work longer"
  answerIndex: 2
  explanation: Cut what the player will not notice first, fake what they see briefly next, and leave the core for last.
- id: stale-bind
  type: spot-the-bug
  prompt: Round two starts, and the old fuse box's announcement still powers the new exit. Which line is wrong?
  code: |
    void ADojoMoment::StartRound()
    {
    	Box = World->SpawnActor<ADojoBox>(BoxSpot, FRotator::ZeroRotator);
    	Box->OnPowered.AddUniqueDynamic(this, &ADojoMoment::HandlePowered);
    	Exit->StartOver();
    }
  bugLine: 3
  fix: Destroy the old box before spawning the new one, so its announcement and its binding go with it.
  explanation: The old box still exists and still announces to the director, so one round's pieces leak into the next. Destroying the old pieces first leaves nothing to listen to.
- id: slice-first
  type: fill-blank
  prompt: "A playable build of only the first thirty seconds, with every mechanic those seconds use, is called a vertical ___."
  acceptedAnswers: [slice]
  explanation: A slice goes all the way through the pieces for a short stretch, rather than building one layer for the whole moment.
- id: explain-director
  type: explain-in-one-sentence
  prompt: In one sentence, say what a director does and what it must not do.
  modelAnswer: It spawns a round, connects the pieces to each other's announcements, and restarts, but it owns no rule of the moment itself.
  rubric:
    - Says it spawns and connects the pieces
    - Says it owns no rule of its own
  explanation: The rules stay in the pieces, so each can be tested alone.
```
