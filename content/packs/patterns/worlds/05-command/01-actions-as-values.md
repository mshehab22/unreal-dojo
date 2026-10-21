---
id: p5-actions-as-values
title: An action you can put in a drawer
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [command]
terms: [ustruct, tweakobjectptr, input-action, tarray]
prerequisites: [p4-read-while-writing]
xp: 25
estimatedMinutes: 7
concepts:
  - A function call happens once, now, to a fixed target; a written-down request can wait, move, repeat, or be taken back
  - The request carries what it needs, so whoever carries it out needs nothing else
  - A request that waits must hold its target weakly and check it when it runs
  - Enhanced Input already writes the player's intent down as Input Actions, separate from the keys
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: an arena announcer reads out each event the moment it happens by calling PlayLine directly. The producers now want the last ten announcements shown on a replay screen, and the option to repeat the latest one. What has to change first?"
choices:
  - Nothing, the direct calls can be replayed as they are
  - Each announcement has to become something stored, such as a value holding the line and who said it, instead of a call that is gone once made
  - The announcer needs a faster PlayLine
  - The replay screen needs to call PlayLine ten times per frame
answerIndex: 1
explanation: A function call leaves nothing behind once it returns. To list, repeat, or take back an action, the action itself has to exist as data.
```

# Card

Most game code acts by calling: the referee's button calls `AwardPoint`, the sergeant's script calls `Dummy->Block()`. A call is quick and clear, and it fixes three things at once: **what** happens, **to whom**, and **when**: right now, exactly once, to that target.

Lots of features want to pull those apart. A replay wants to run the same actions again later. A designer's tool wants to take actions back. A drill wants to queue moves and play them on a beat. An AI and a player want to send the same kinds of action to whatever they control. None of that is possible while the action exists only as a call.

**Write the request down.** Turn the action into a value: a small struct or object that names the action, holds its parameters, and says who it is for. Now it can sit in a list, wait for its moment, be read by a debug screen, be sent over the network, or be undone if it also remembers what it changed.

**Carry what you need.** The value should hold everything required to perform it: the move, the amount, the target. Then the code that runs it later needs no other context, and any piece of code can run it.

**Waiting has a price.** Something that waits can outlive its target. A request that holds an actor should hold it as a `TWeakObjectPtr` and check it when it runs, not when it was made.

**Unreal already does the first half.** Enhanced Input separates the player's intent from the key that expressed it: an **Input Action** such as "Dodge" is what gameplay listens to, and an Input Mapping Context decides which key produces it. Rebinding changes the mapping, not the gameplay code.

# Example

```cpp
// A request written down: what to do, how much, and for whom. It can wait in a list until its moment.
USTRUCT()
struct FDojoArenaAnnouncement
{
	GENERATED_BODY()

	UPROPERTY()
	FText Line;

	UPROPERTY()
	TWeakObjectPtr<AActor> AboutActor;
};

void ADojoArenaAnnouncer::Announce(const FDojoArenaAnnouncement& Announcement)
{
	History.Add(Announcement);
	Play(Announcement);
}

void ADojoArenaAnnouncer::RepeatLatest()
{
	if (History.Num() > 0) Play(History.Last());
}
```

# Questions

```yaml
- id: what-call-fixes
  type: multiple-choice
  prompt: "A direct function call fixes three things at once. Which set?"
  choices:
    - What happens, to whom, and when
    - Which thread, which module, and which header
    - The return type, the parameters, and the name
    - Who wrote it, who reviewed it, and who tested it
  answerIndex: 0
  explanation: Turning the action into a value is what lets each of those three vary on its own.
- id: fill-weak
  type: fill-blank
  prompt: "A queued request that targets an actor which might be destroyed before the request runs should hold it as a ___."
  acceptedAnswers: [TWeakObjectPtr, weak pointer, TWeakObjectPtr<AActor>]
  explanation: A weak pointer does not keep the actor alive and reads as empty once it is gone, so the request can check before acting.
- id: spot-check-when-made
  type: spot-the-bug
  prompt: This queued request should skip its target if the target was destroyed while the request waited. Which line checks at the wrong moment?
  code: |
    void ADojoArenaDirector::QueueCheer(AActor* Fan)
    {
    	if (!IsValid(Fan)) return;
    	Pending.Add({ Fan, ECheer::EC_Wave });
    }
    void ADojoArenaDirector::RunNext()
    {
    	const FDojoArenaCheer Next = Pending[0];
    	Pending.RemoveAt(0);
    	Next.Fan->PlayCheer(Next.Kind);
    }
  bugLine: 10
  fix: Check the fan is still valid right before playing the cheer, and drop the request if not.
  explanation: The check in QueueCheer only proves the fan existed when the request was made; by the time it runs, the fan may be gone.
- id: input-action
  type: multiple-choice
  prompt: "A player wants to move Dodge from the space bar to a mouse button. With Enhanced Input, what changes?"
  choices:
    - The character's dodge function
    - The Input Mapping Context that maps keys to the Dodge Input Action
    - The Dodge Input Action's name
    - Every Blueprint that dodges
  answerIndex: 1
  explanation: Gameplay listens to the Input Action; which key triggers it lives in the mapping context, so rebinding touches only the mapping.
- id: explain-value
  type: explain-in-one-sentence
  prompt: In one sentence, say what turning an action into a value makes possible.
  modelAnswer: Once the action is stored as data holding what to do and for whom, it can wait for later, be run by other code or on another target, be listed or sent, and be taken back if it remembers what it changed.
  rubric:
    - Says the action is stored as data or an object
    - Names at least two uses such as delaying, queuing, replaying, sending, or undoing
  explanation: A call is gone the moment it returns; a value stays around to be used again.
```
