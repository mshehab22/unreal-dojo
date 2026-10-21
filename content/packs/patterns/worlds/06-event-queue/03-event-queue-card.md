---
id: p6-event-queue-card
title: A mailbox between sending and handling
order: 3
kind: concept
difficulty: 2
patterns: [event-queue]
skills: [event-queue]
terms: [tqueue, multicast-delegate, tick-groups, game-thread, timer-manager]
prerequisites: [p6-knockout-herald]
xp: 25
estimatedMinutes: 8
concepts:
  - Event Queue stores events or requests when they are sent and handles them later, at a moment the receiver chooses
  - Observer decouples who hears the news; Event Queue also decouples when it is handled
  - Queued items are self-contained copies, handled in order, in batches taken at a fixed point
  - Unreal provides TQueue for threads, plus engine-level queues such as timers and tasks sent to the game thread
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the herald's listener posts a new knockout while hearing one. Because Announce first moved the mailbox into a local batch, where does the new knockout go?"
choices:
  - Into the batch being announced, so it is heard straight away
  - Into the emptied mailbox, so it is heard at the next announcement
  - Nowhere; posting during an announcement is ignored
  - It replaces the knockout being announced
answerIndex: 1
explanation: The batch was taken before any listener ran, so anything posted during the announcement lands in the fresh mailbox and waits for the next round.
```

# Card

What the herald does is the **Event Queue** pattern. Senders post an event (something that happened) or a request (something to do) into a queue and return at once. The receiver takes items out later, at a moment it picks, and handles them in order.

**Observer plus time.** A delegate already hides who is listening. A queue also separates *when*: the sender's moment and the handling moment are no longer the same. That is what lets handling happen at the end of the frame, or on the game thread when the sender is a worker.

**Rules that keep a queue sane.**

- **Items carry their data.** A queued item is a copy of everything the handler needs, because the world may change before it is handled.
- **Take the batch, then handle it.** Move the waiting items out first and handle that batch, so items posted while handling (a handler that posts more news) wait for the next round instead of feeding the current one forever.
- **Handle at a fixed point.** One chosen moment per frame (a late tick group, a think interval), so every handler sees the world in the same state.

**Who reads.** One receiver that owns the queue (the herald), a broadcast where every listener hears each item (the herald's delegate at drain time), or a work queue where each item goes to one of several workers.

**The Unreal forms.** `TQueue` is a lock-free queue for handing items between threads: `EQueueMode::Spsc` for one writer and one reader, `EQueueMode::Mpsc` when many threads write and one reads. `TCircularQueue` is a fixed-capacity version. The engine also queues for you: the timer manager is a queue ordered by time, `AsyncTask(ENamedThreads::GameThread, ...)` queues work onto the game thread, and input events are buffered and handled once per frame.

# Example

```cpp
// A crowd mood system: any code posts reactions at any moment; the crowd handles them once, late in the frame.
void ADojoArenaCrowd::PostReaction(const FDojoArenaReaction& Reaction)
{
	PendingReactions.Add(Reaction);
}

void ADojoArenaCrowd::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	TArray<FDojoArenaReaction> Batch = MoveTemp(PendingReactions);
	PendingReactions.Reset();

	for (const FDojoArenaReaction& Reaction : Batch)
	{
		Excitement = FMath::Clamp(Excitement + Reaction.Strength, 0.f, 1.f);
	}
}
```

# Questions

```yaml
- id: worker-to-game
  type: which-pattern
  prompt: "Procedural workers build arena decorations on background threads. Finished pieces must be spawned as actors, which only the game thread may do. Which pattern describes the handoff?"
  choices: [event-queue, observer, singleton, command]
  answer: event-queue
  distractorNotes:
    - choice: observer
      why: A delegate fired from a worker runs its listeners on the worker, which is exactly what must not happen.
    - choice: singleton
      why: A global spawner the workers call is still called from the wrong thread at the wrong moment.
    - choice: command
      why: Each piece may well be a request object, but what solves the problem is the buffer between threads and the per-frame pace.
  explanation: Workers post finished pieces into a thread-safe queue, and the game thread takes them on its own tick.
- id: mailbox-brains
  type: which-pattern
  prompt: "Arena guards think twice a second. Between thinks they may be hit, hear a whistle, or see the player, and each guard should consider all of it, in order, at its next think. Which pattern?"
  choices: [state, observer, event-queue, update-method]
  answer: event-queue
  distractorNotes:
    - choice: state
      why: The guard's brain may well be a state machine, but the question is how news reaches it between thinks.
    - choice: observer
      why: A delegate would interrupt the guard the moment each thing happens, not at its next think.
    - choice: update-method
      why: Thinking on an interval is an update; what lets it see everything since the last think is a per-guard mailbox.
  explanation: Each guard keeps a mailbox; events are posted as they happen and the guard empties it when it thinks.
- id: spot-walk-the-mailbox
  type: spot-the-bug
  prompt: This crowd handles its reactions once per frame, and some handlers post new reactions. Which line lets a handler's new reaction be handled in the same round, or break the loop outright?
  code: |
    void ADojoArenaCrowd::HandleReactions()
    {
    	for (const FDojoArenaReaction& Reaction : PendingReactions)
    	{
    		ApplyReaction(Reaction);
    	}
    	PendingReactions.Reset();
    }
  bugLine: 3
  fix: Move PendingReactions into a local batch first, reset it, and loop over the batch.
  explanation: Walking the live list while handlers add to it changes the array under the loop; taking the batch first keeps this round fixed.
- id: fill-mpsc
  type: fill-blank
  prompt: "A TQueue that many worker threads add to while one thread takes from must use EQueueMode::___."
  acceptedAnswers: [Mpsc, MPSC]
  explanation: Mpsc is multiple producers, single consumer; Spsc allows only one writer.
- id: explain-event-queue
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Event Queue pattern.
  modelAnswer: Senders put events or requests into a queue and return at once, and the receiver takes them out later, at a moment it chooses, and handles them in order.
  rubric:
    - Says items are stored when sent and handled later
    - Says the receiver chooses when to handle them
  explanation: It is Observer with a buffer in time between the two sides.
```
