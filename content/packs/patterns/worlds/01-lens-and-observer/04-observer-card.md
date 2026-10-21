---
id: p1-observer-card
title: What you just built has a name
order: 4
kind: concept
difficulty: 2
patterns: [observer]
skills: [observer]
terms: [multicast-delegate, dynamic-multicast-delegate, overlap-event, unbinding-delegates, broadcast]
prerequisites: [p1-bounty-board]
xp: 25
estimatedMinutes: 8
concepts:
  - Observer lets one object announce an event to any number of listeners it does not know
  - The subject keeps a list, not one slot, so listeners never displace each other
  - Notification is synchronous, so a slow or reentrant listener stalls the subject
  - Unreal's delegates are ready-made observer lists, and many engine events are subjects already
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the foe calls Broadcast, and three boards are bound. One board's handler does something slow, like saving a file. When does the line after Broadcast in TakeHit run?"
choices:
  - Right away; the boards run later on their own
  - After all three handlers have finished, including the slow one
  - On the next frame
  - Only if every handler succeeds
answerIndex: 1
explanation: Broadcast calls each bound function in turn, on the same thread, before it returns. The foe waits for its slowest listener.
```

# Card

The shape you built in the bounty board is the **Observer** pattern. One object, the **subject**, announces that something happened. Any number of **observers** have signed themselves up to hear it. The subject knows only that it holds a list of callbacks; it never knows what the observers are or what they do with the news. In the bounty board, the foe is the subject, `OnDefeated` is its list, and each board is an observer.

**Why it pays.** It is the lens from lesson zero applied to communication. Without it, every new reaction to a defeat (a side bounty, a crowd cheer, a quest step) is a change to the foe, and anyone reading the foe has to load all of them. With it, each reaction is a change to the reacting class only, and the foe can be read alone.

**A list, not a slot.** A single-cast delegate holds one binding; a second bind replaces the first. The subject holds a list so that observers never displace each other by signing up.

**It runs now.** `Broadcast` calls every observer before it returns, on the same thread. A slow observer slows the subject. An observer that triggers the same event again from inside its handler recurses. When the reaction must happen later or somewhere else, a queue is the right tool, and a later world builds one.

**Lifetime is the observer's job.** The subject can outlive any observer. Picture the arena removing a bounty board at the end of each round and spawning a fresh one. If the old board never unbinds, the foe's list gains a stale entry every round. If the binding held the board strongly (a plain lambda that captured it, for example), the old board would even keep counting defeats for a round that is over: a lapsed listener. Unreal's weak bindings (`AddUObject`, `AddWeakLambda`, dynamic bindings) skip a destroyed object, but the clean exit is still yours: remove the binding in `EndPlay`.

**The Unreal forms.** Native multicast delegates for C++ listeners; dynamic multicast delegates, `BlueprintAssignable`, for listeners in Blueprint, at the price of a reflection lookup per call and `UFUNCTION` handlers. The engine is full of subjects already: `OnComponentBeginOverlap`, `OnTakeAnyDamage`, `OnDestroyed`, and every Blueprint event dispatcher. Spotting them is half the skill.

# Example

```cpp
// The engine's own subject: a trigger box announces overlaps; the door decides what that means.
void ADojoArenaDoor::BeginPlay()
{
	Super::BeginPlay();

	if (IsValid(Trigger)) Trigger->OnComponentBeginOverlap.AddDynamic(this, &ADojoArenaDoor::HandleTriggerEntered);
}

void ADojoArenaDoor::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (IsValid(Trigger)) Trigger->OnComponentBeginOverlap.RemoveDynamic(this, &ADojoArenaDoor::HandleTriggerEntered);

	Super::EndPlay(EndPlayReason);
}

// A UFUNCTION, because the overlap delegate is dynamic and binds by name.
void ADojoArenaDoor::HandleTriggerEntered(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	Open();
}
```

# Questions

```yaml
- id: spot-it-overlap
  type: which-pattern
  prompt: "A trigger box's OnComponentBeginOverlap is bound by a door, a sound cue, and a tutorial prompt. None of them is known to the trigger box. Which pattern is the engine using?"
  choices: [observer, command, component, service-locator]
  answer: observer
  distractorNotes:
    - choice: command
      why: Nothing here is turned into an object to queue or undo; the trigger announces an event to whoever listens.
    - choice: component
      why: The trigger box is a component, which is why this looks right, but the question is how it tells others, and that is a delegate list.
    - choice: service-locator
      why: A locator helps a caller find one provider; here one announcer reaches many unknown listeners.
  explanation: Engine delegates such as overlap, hit, damage, and destroyed events are subjects that you observe.
- id: level-up-fan-out
  type: which-pattern
  prompt: "When the player levels up, the HUD, the music, the analytics logger, and the tutorial each react. The leveling code must not include any of their headers. Which pattern?"
  choices: [singleton, state, observer, command]
  answer: observer
  distractorNotes:
    - choice: singleton
      why: A global level manager that leveling calls is still one place that must know every reaction.
    - choice: state
      why: Leveling may change the player's state, but telling four systems about it is a notification problem.
    - choice: command
      why: Command wraps a request as an object; nothing here needs to be stored, queued, or undone.
  explanation: A multicast OnLevelUp on the leveling component lets each system bind itself, and adding a fifth never touches leveling.
- id: list-not-slot
  type: multiple-choice
  prompt: "Two observers bind to a single-cast delegate (DECLARE_DELEGATE) with BindUObject, one after the other. What happens when it fires?"
  choices:
    - Both run, in the order they bound
    - Only the second runs, because the second bind replaced the first
    - Only the first runs, because the slot was taken
    - The second bind fails to compile
  answerIndex: 1
  explanation: A single-cast delegate is one slot. A subject needs a list so that signing up never removes someone else.
- id: fill-subject
  type: fill-blank
  prompt: "In Observer, the object that announces and holds the list of listeners is called the ___."
  acceptedAnswers: [subject, Subject]
  explanation: The subject announces; the observers react. In the bounty board the foe was the subject.
- id: spot-lapsed
  type: spot-the-bug
  prompt: The arena removes its round bounty board at the end of every round and spawns a fresh one, while the champion foe lives on. Which line leaves a stale binding on the champion every round?
  code: |
    void ADojoRoundBoard::BeginPlay()
    {
    	Super::BeginPlay();
    	Champion->OnDefeated.AddUObject(this, &ADojoRoundBoard::HandleChampionDefeated);
    }
    void ADojoRoundBoard::EndPlay(const EEndPlayReason::Type EndPlayReason)
    {
    	Champion->OnDefeated.RemoveAll(Champion);
    	Super::EndPlay(EndPlayReason);
    }
  bugLine: 8
  fix: Pass the board itself to RemoveAll, so the bindings the board owns are the ones removed.
  explanation: RemoveAll removes the bindings that belong to the object you pass. The champion owns none of them, so every retired board leaves its entry in the list.
- id: explain-synchronous
  type: explain-in-one-sentence
  prompt: In one sentence, say what it means for the subject that Broadcast is synchronous.
  modelAnswer: Broadcast runs every observer's handler before it returns, on the same thread, so the subject waits for its slowest observer and an observer that triggers the event again recurses inside the subject.
  rubric:
    - Says the handlers run before Broadcast returns, or on the same thread
    - Names a consequence for the subject, such as waiting on a slow handler or recursion
  explanation: Observer removes knowledge, not time. Deferring work needs a different tool.
```
