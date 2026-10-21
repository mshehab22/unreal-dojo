---
id: p1-observer-when-not
title: When a plain call beats a delegate
order: 7
kind: concept
difficulty: 2
patterns: [observer]
skills: [observer, architecture]
terms: [multicast-delegate, broadcast, delegate]
prerequisites: [p1-power-refactor]
xp: 25
estimatedMinutes: 6
concepts:
  - Inside one cohesive feature, a direct call is easier to read than a hidden list
  - Observers that depend on each other's order are secretly coupled
  - A caller that needs an answer back wants a call or a single-cast delegate, not a broadcast
  - Work that must happen later or on another thread needs a queue, not a broadcast
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a turret has a barrel component and a cooldown component that only ever work together, and they live in the same feature folder. The barrel needs to start the cooldown after each shot. Is a delegate the right way for the barrel to tell the cooldown?"
choices:
  - Yes, always decouple components
  - No, a direct call is clearer here; both ends change together and nothing else listens
  - Yes, because delegates are faster than function calls
  - No, because components cannot hold delegates
answerIndex: 1
explanation: Observer earns its cost when the listeners are unrelated and change on their own. Two parts of one feature that always change together pay for a hidden link and get nothing back.
```

# Card

Lesson zero said every layer is a bet. Observer is a good bet when one event fans out to systems that have nothing to do with each other. It is a bad one in these cases:

**Both ends belong to one feature.** If you have to read the announcer and the listener together to understand either, the delegate only hides a link you must still follow. A direct call shows up in "find references" and in the debugger's call stack; a binding made at run time does not. Keep the call until a second, unrelated listener shows up.

**The listeners depend on their order.** If the door's sound must play after the door's light changes, and both bind to the same delegate, they are coupled through an order nobody wrote down. Unreal does not promise an order for a multicast list, and removing a binding can reshuffle it. Fix it by making one listener do both steps, or by having the subject send a richer announcement so neither needs the other.

**The caller needs an answer.** "May I open this chest?" is a question with one answer. A broadcast has no return value and many listeners. Use a direct call, an interface, or a single-cast delegate that returns a value.

**The reaction must happen later, or elsewhere.** A broadcast runs every handler now, on the caller's thread. When a listener's work would recurse back into the subject, or must run on another thread, or should be batched to the end of the frame, a queue between them is the tool, and a later world builds one.

**It fires in a hot loop.** Ten thousand projectiles each broadcasting on every tick pay the per-listener cost ten thousand times a frame, and a dynamic delegate pays a reflection lookup on top. Batch the news, or let the one system that cares read the data directly.

# Example

```cpp
// Before: two listeners on one delegate, and the result depends on which bound first.
// The crowd reads the score that the scoreboard writes in its own handler.
void ADojoArenaScoreboard::HandleFoeDefeated(ADojoP1TrainingFoe* Foe)
{
	Score += PointsPerFoe;
}

void ADojoArenaCrowd::HandleFoeDefeated(ADojoP1TrainingFoe* Foe)
{
	// Hidden coupling: correct only if the scoreboard's handler already ran.
	if (Scoreboard->GetScore() >= CheerThreshold) Cheer();
}

// After: the crowd listens to the scoreboard's own announcement, which fires after the score changes.
// The order is now written in the code instead of in the binding order.
void ADojoArenaCrowd::HandleScoreChanged(int32 NewScore)
{
	if (NewScore >= CheerThreshold) Cheer();
}
```

# Questions

```yaml
- id: when-not-answer-back
  type: multiple-choice
  prompt: "A chest must ask whether the player may open it, and the answer depends on the quest log. Which shape fits?"
  choices:
    - A multicast delegate OnOpenRequested that the quest log binds to
    - A direct call or an interface function on the quest log that returns a bool
    - A dynamic multicast delegate so a Blueprint can answer
    - Broadcasting the request every frame until someone answers
  answerIndex: 1
  explanation: A broadcast has no return value and any number of listeners, so it cannot give one clear answer. A question with an answer is a call.
- id: when-not-same-feature
  type: multiple-choice
  prompt: "Which of these is the weakest reason to add a delegate?"
  choices:
    - The bounty boards, the crowd, and the scoreboard all react when the arena champion falls
    - A level Blueprint needs to react to a lever without new C++
    - The weapon's own reload component tells the weapon's own ammo component it finished, and nothing else will ever care
    - A pickup must not include the quest system's header
  answerIndex: 2
  explanation: Two parts of one weapon that always change together gain nothing from a hidden link; the other three each have an unrelated or unknown listener.
- id: spot-order-coupling
  type: spot-the-bug
  prompt: Two handlers are bound to the same OnDoorOpened. Which line assumes the other handler already ran?
  code: |
    void ADojoDoorLight::HandleDoorOpened(ADojoDoor* Door)
    {
    	bLit = true;
    }
    void ADojoDoorChime::HandleDoorOpened(ADojoDoor* Door)
    {
    	if (DoorLight->IsLit()) PlayChime();
    }
  bugLine: 7
  fix: Make the chime depend only on the door's announcement, or have one listener do both steps, so the result never depends on binding order.
  explanation: A multicast list promises no order. The chime is secretly coupled to the light through it.
- id: hot-loop
  type: multiple-choice
  prompt: "Twenty thousand projectiles each broadcast OnMoved every frame, and one radar system listens. What is the better shape?"
  choices:
    - Keep it; delegates are free
    - Make OnMoved dynamic so Blueprint can help
    - Let the radar read the projectile positions once per frame from the system that owns them
    - Give each projectile two delegates instead of one
  answerIndex: 2
  explanation: One listener and a huge number of broadcasts per frame is all cost and no decoupling gain; a single read of the data is cheaper and just as clear.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when you would keep a direct call instead of adding a delegate.
  modelAnswer: When both ends belong to one feature and change together, so a reader has to follow both anyway, a direct call shows the link plainly and a delegate only hides it.
  rubric:
    - Names a case such as same feature, needs an answer, ordering, deferred work, or a hot loop
    - Gives the reason in terms of readability or cost, not taste
  explanation: "The test is the lens from lesson zero: does the layer make a likely change cheaper, or only make the code harder to follow?"
```
