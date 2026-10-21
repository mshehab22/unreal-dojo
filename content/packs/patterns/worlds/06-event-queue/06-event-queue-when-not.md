---
id: p6-event-queue-when-not
title: When now is the right moment
order: 6
kind: concept
difficulty: 2
patterns: [event-queue]
skills: [event-queue, architecture]
terms: [multicast-delegate, tqueue, game-thread]
prerequisites: [p6-keg-refactor]
xp: 25
estimatedMinutes: 6
concepts:
  - If listeners can safely react at once, a delegate is simpler and immediate
  - A sender that needs an answer cannot get one from a queue
  - A big shared queue is global state, and its feedback loops are quiet
  - A queue drained without a budget or a capacity hides runaway producers
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a health bar should show the player's new health on the same frame they are hit. A teammate routes every health change through a queue the HUD drains at the end of the next frame. What does the player notice?"
choices:
  - Nothing, queues are free
  - The bar lags a frame behind every hit, for no gain
  - The bar updates faster
  - The bar updates twice per hit
answerIndex: 1
explanation: Nothing about the health change needs to wait, so the queue only adds delay. A delegate the bar binds to updates it on the same frame.
```

# Card

A queue is the heaviest of the communication tools in this pack. It earns its place only when the moment of handling really must differ from the moment of sending.

**Listeners can react safely now.** If nothing is mid-change, nothing is on another thread, and one event per frame is fine, a delegate does the same job with no delay and no stored copies. A health bar, a door that opens when its lever is pulled, a light that flashes on a single hit: react now.

**The sender needs an answer.** "May I enter this zone?" has to return yes or no to the caller. A queue takes the question away and answers later, if at all. Use a call, or an interface the caller can ask.

**A big shared queue is a global.** One arena-wide queue every system posts to and every system reads from is global state with extra steps: anyone can post anything, and the source of an event is hard to trace. Prefer small queues owned by one receiver.

**Loops hide in queues.** A handler that posts the event it is handling, or that sets off a chain that posts it back, will not overflow the stack the way a delegate loop does; it quietly keeps the queue busy every frame. Log what you post, and guard handlers against posting their own kind of event.

**Bound it.** A producer that outruns the receiver grows the queue forever. Give the receiver a budget per tick, a capacity, or a policy to drop or merge, and make a full queue visible.

**The engine already queues.** Timers, tasks sent to the game thread, and input buffering are queues you do not need to write again.

# Example

```cpp
// The right tool here is a delegate: the bar should change on the same frame, and nothing is mid-change.
void UDojoArenaHealthBar::Bind(UDojoArenaHealthComponent* Health)
{
	if (IsValid(Health)) Health->OnHealthChanged.AddUObject(this, &UDojoArenaHealthBar::HandleHealthChanged);
}
```

# Questions

```yaml
- id: when-not-answer
  type: multiple-choice
  prompt: "A gate asks the referee whether a fighter may enter the ring right now, and must open or stay shut on the same frame. What fits?"
  choices:
    - Post the question to the referee's queue and check for an answer next frame
    - Call a function on the referee that returns yes or no
    - Broadcast a delegate and wait
    - A global event bus
  answerIndex: 1
  explanation: The gate needs an answer now. A queue only delivers the question later and has no way to return a reply.
- id: when-not-instant
  type: multiple-choice
  prompt: "Which of these needs an event queue least?"
  choices:
    - Worker threads handing finished results to the game thread
    - A pressure plate that should light its own lamp the instant it is stepped on
    - Guards that consider everything that happened between thinks
    - A burst of fifty hit reports in one frame that should be handled as one batch
  answerIndex: 1
  explanation: The plate and its lamp can react at once with a direct call or a delegate; the others need the handling moment to differ from the sending moment.
- id: spot-quiet-loop
  type: spot-the-bug
  prompt: This crowd queue never empties, frame after frame, though nothing new happens in the arena. Which line keeps it busy?
  code: |
    void ADojoArenaCrowd::ApplyReaction(const FDojoArenaReaction& Reaction)
    {
    	Excitement += Reaction.Strength;
    	if (Excitement > 0.5f) PostReaction(Reaction);
    }
  bugLine: 4
  fix: Do not post the same kind of reaction from its own handler; compute any follow-up effect here directly, or post a different, one-off event.
  explanation: The handler re-posts the reaction it is handling, so every round produces the next round's work; a queue hides this loop instead of crashing.
- id: when-not-global
  type: multiple-choice
  prompt: "A teammate proposes one arena-wide event queue that every system posts to and reads from. What is the main risk?"
  choices:
    - It is too slow for any game
    - It becomes global state where any system can post anything and the source of an event is hard to trace
    - TQueue cannot hold structs
    - Events can only be posted from the game thread
  answerIndex: 1
  explanation: A shared bus couples everything to everything through the queue. Small queues owned by one receiver keep the flow readable.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when a delegate is a better choice than an event queue.
  modelAnswer: When listeners can safely react at the moment the news happens, on the same thread and one event at a time, a delegate does the job with no delay and no stored copies.
  rubric:
    - Says the listeners can react immediately and safely
    - Names the cost the queue would add, such as delay, copies, or complexity
  explanation: A queue is worth its delay only when the handling moment must differ from the sending moment.
```
