---
id: p6-later-not-now
title: Not now, but soon
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [event-queue]
terms: [multicast-delegate, tick-groups, game-thread, tarray]
prerequisites: [p5-actions-as-values]
xp: 25
estimatedMinutes: 7
concepts:
  - A delegate runs every listener inside the sender's call, at the sender's moment
  - Sometimes that moment is wrong, because the sender is mid-change, on another thread, or one of many in a burst
  - Storing the news and handling it later lets the receiver pick the moment
  - News that waits must carry what the receiver needs, because the sender may be gone
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a fighter is knocked out and, inside its own KnockOut function, broadcasts a delegate. The scoreboard's handler responds by spawning a victory banner actor, and the crowd's handler destroys a nearby barrier. When do those spawn and destroy calls happen?"
choices:
  - At the end of the frame, after every actor has ticked
  - Right there, inside the fighter's KnockOut call, before it returns
  - On the next frame
  - On a background thread
answerIndex: 1
explanation: Broadcast calls every listener before it returns, so their spawning and destroying happens in the middle of the fighter's own code, whatever state the fighter and the world are in at that instant.
```

# Card

Since World 1 you have announced news with delegates: the sender broadcasts, every listener reacts, and the sender carries on once they have all finished. That is the right shape most of the time. But all of the listeners' work happens **inside the sender's call, at the sender's moment**, and sometimes that moment is a bad one.

**The sender is mid-change.** A fighter that announces its knockout and then destroys itself has listeners running while it is half torn down. A trap that announces a trigger from inside an overlap callback has listeners spawning and destroying actors while physics is still delivering overlaps.

**The sender is on another thread.** Work done on a worker thread (counting, pathfinding, generation) cannot call gameplay code that touches actors, because actors belong to the **game thread**. A delegate fired from the worker would run the listeners on the worker.

**The news comes in bursts.** Twenty hits in one frame, each announcing itself, make twenty rounds of listener work, where one round at the end of the frame, with all twenty in hand, could do it once.

**Store it, handle it later.** Instead of calling the listeners, the sender adds the news to a list and returns. The receiver empties that list at a moment it chooses: late in the frame (a late tick group such as `TG_PostUpdateWork`) or once per think interval.

**Waiting news must carry its own data.** By the time it is handled, the sender may have moved, changed, or been destroyed. So the stored news holds copies of what matters (names, teams, amounts, positions), not a pointer to look them up later.

# Example

```cpp
// Instant: listeners run inside the trap's overlap callback, mid-physics.
void ADojoArenaTrap::HandleOverlap(UPrimitiveComponent* Overlapped, AActor* Other, UPrimitiveComponent* OtherComponent, int32 BodyIndex, bool bFromSweep, const FHitResult& Sweep)
{
	OnTriggered.Broadcast(Other);
}

// Later: the trap stores a copy of what happened; the arena handles the list at the end of the frame.
void ADojoArenaTrap::HandleOverlapLater(UPrimitiveComponent* Overlapped, AActor* Other, UPrimitiveComponent* OtherComponent, int32 BodyIndex, bool bFromSweep, const FHitResult& Sweep)
{
	if (IsValid(Other)) Arena->PostTrapEvent({ GetFName(), Other->GetFName(), Other->GetActorLocation() });
}
```

# Questions

```yaml
- id: when-handled
  type: multiple-choice
  prompt: "With a multicast delegate, when does a listener's handler run relative to the sender's Broadcast call?"
  choices:
    - Before Broadcast returns, on the sender's thread
    - At the end of the frame
    - On the next frame
    - Whenever the listener ticks
  answerIndex: 0
  explanation: Broadcast walks its list and calls each handler right away, on whatever thread the sender is on.
- id: fill-copy
  type: fill-blank
  prompt: "News that will be handled later should carry a ___ of the data it needs, not a pointer back to the sender."
  acceptedAnswers: [copy, snapshot]
  explanation: The sender may be gone or changed by the time the news is handled.
- id: spot-pointer-later
  type: spot-the-bug
  prompt: These trap events are stored and handled at the end of the frame. Which line will read the wrong data when the triggering fighter has been destroyed in between?
  code: |
    void ADojoArenaReferee::HandleTrapEvents()
    {
    	for (const FDojoTrapEvent& Event : PendingTrapEvents)
    	{
    		const FName Victim = Event.VictimActor->GetFName();
    		Log(Event.TrapName, Victim);
    	}
    }
  bugLine: 5
  fix: Copy the victim's name into the event when it is posted and read that copy here.
  explanation: The event kept a pointer to an actor that may be gone by the time the list is handled; a copied name stays valid.
- id: worker-thread
  type: multiple-choice
  prompt: "A ticket counter on a worker thread finishes a report and wants the scoreboard actor to show it. What is the safe way?"
  choices:
    - Call the scoreboard's update function directly from the worker
    - Broadcast a delegate from the worker
    - Hand the report to the game thread through a thread-safe mailbox the scoreboard empties on its tick
    - Make the scoreboard tick on the worker thread
  answerIndex: 2
  explanation: Actors belong to the game thread. The worker leaves a copy of the report where the game thread can pick it up on its own schedule.
- id: explain-later
  type: explain-in-one-sentence
  prompt: In one sentence, say why a sender might store news for later instead of calling its listeners now.
  modelAnswer: Because the sender's moment can be the wrong one, mid-change, on another thread, or one of a burst, storing the news lets the receiver handle it at a moment it chooses, such as the end of the frame.
  rubric:
    - Names a reason the sender's moment is wrong, such as mid-change, another thread, or a burst
    - Says the receiver chooses when to handle it
  explanation: A delegate decides who hears; storing the news also decides when.
```
