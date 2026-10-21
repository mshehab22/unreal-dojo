---
id: p3-update-method-when-not
title: When nothing needs to happen every frame
order: 6
kind: concept
difficulty: 2
patterns: [update-method]
skills: [update-method, architecture]
terms: [tick, timer-manager, primary-actor-tick, multicast-delegate]
prerequisites: [p3-arena-refactor]
xp: 25
estimatedMinutes: 6
concepts:
  - A thing that waits for an event should listen for it, not check every frame
  - Work that happens on a schedule belongs on a timer, not in a per-frame countdown
  - Idle things should stop ticking or tick at an interval; thousands of small things belong in one walk
  - Order between updates is set on purpose with prerequisites, never left to placement
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: an arena door must open when a lever is pulled. One version checks the lever's IsPulled every frame in the door's Tick. Another binds to the lever's OnPulled delegate. The lever is pulled once in a ten-minute level. How many times does each version run its check?"
choices:
  - About the same, once per pull
  - The ticking door checks tens of thousands of times; the listening door runs once
  - The listening door runs every frame too
  - The ticking door runs once, because Tick stops after the door opens
answerIndex: 1
explanation: At 60 frames per second for ten minutes, Tick runs about 36,000 times to catch one change. A delegate runs the reaction exactly when the change happens.
```

# Card

Per-frame updates are for things that change continuously. Lesson zero's question still applies: does each Tick earn its cost?

**Waiting for something? Listen, do not poll.** A door that checks a lever every frame, a quest step that checks a kill count every frame: these run thousands of times to catch one change. Bind to the subject's delegate instead, as you did in World 1, and react once.

**Something on a schedule? Use a timer.** "Every three seconds, flare" or "after two seconds, close" belongs on the timer manager (`SetTimer`). A countdown in Tick is extra state, extra code, and a Tick that runs for nothing between firings.

**Idle? Stop ticking.** A drone parked in a closet does not need its update called. Switch it off with `SetActorTickEnabled(false)` and back on when the player comes near, or slow it with `SetActorTickInterval` when a few updates a second are enough. Hundreds of idle tickers add up.

**Thousands of tiny things? Not one actor each.** Each ticking actor pays the engine's per-object costs. Sparks, embers, and crowd agents belong in one owner's array, walked once per frame, or in the engine's Mass framework or a Niagara system.

**Never trust placement for order.** If B must read A after A moved, make it explicit with a tick prerequisite or tick group. When the walk itself changes the crowd, let newcomers wait a frame and sweep removals after the walk.

**Changes only when someone acts?** A shop screen whose prices change only when the player buys or sells has no continuous behavior to slice. Its little animations may tick; the pricing rules run when the purchase happens.

# Example

```cpp
// Polling: the door asks every frame for a change that happens once.
void ADojoArenaDoor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bOpen && IsValid(Lever) && Lever->IsPulled()) Open();
}

// Listening: the door does nothing until the lever announces, and needs no Tick at all.
void ADojoArenaDoor::BeginPlay()
{
	Super::BeginPlay();

	if (IsValid(Lever)) Lever->OnPulled.AddUObject(this, &ADojoArenaDoor::HandleLeverPulled);
}
```

# Questions

```yaml
- id: when-not-schedule
  type: multiple-choice
  prompt: "A brazier should flare for one second every five seconds. Which is the plainest design?"
  choices:
    - A countdown in the brazier's Tick
    - A looping timer that starts the flare, and a second timer that ends it
    - A manager that ticks all braziers and counts frames
    - A fixed-step bank inside the brazier
  answerIndex: 1
  explanation: The flare is an event on a schedule, which is what timers are for; nothing about it changes continuously.
- id: when-not-idle
  type: multiple-choice
  prompt: "Two hundred drones sit in sealed rooms until the player opens a door, and each still runs its Tick every frame. What is the first fix?"
  choices:
    - Make Tick faster
    - Switch their ticking off while sealed and back on when the door opens
    - Move them all into the level Blueprint's Event Tick
    - Delete their Tick and poll from the door
  answerIndex: 1
  explanation: An idle thing has no per-frame behavior, so its update should not run. SetActorTickEnabled turns it off and on.
- id: spot-polling
  type: spot-the-bug
  prompt: This quest marker should light up once when the third foe falls. Which line makes it check every frame for news it could be told?
  code: |
    void ADojoArenaQuestMarker::Tick(float DeltaSeconds)
    {
    	Super::Tick(DeltaSeconds);
    	if (!bLit && Board->GetDefeatsHeard() >= 3) LightUp();
    }
  bugLine: 4
  fix: Remove the check from Tick and bind to the board's or foes' announcement, lighting up when it arrives.
  explanation: The marker reacts to an event, so it should listen for it; polling runs every frame for a change that happens once.
- id: when-not-shop
  type: multiple-choice
  prompt: "In the arena's armory shop, prices drop when the player sells an item of the same kind. Where should the price rule run?"
  choices:
    - In every shop item's Tick, checking whether something was sold
    - In the function that handles the sale
    - In a fixed-step bank
    - In a manager's Tick that walks every item
  answerIndex: 1
  explanation: Prices change only when a sale happens, so there is no per-frame behavior; the rule runs in the sale itself.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when a thing should not have a per-frame update.
  modelAnswer: When it does not change continuously, because it waits for an event, acts on a schedule, or is idle, a delegate, a timer, or switching ticking off does the job without running code every frame.
  rubric:
    - Names a case such as waiting for an event, a schedule, idleness, or change only on a player action
    - Names the better tool or the per-frame cost avoided
  explanation: Tick is for continuous change; everything else has a cheaper and clearer tool.
```
