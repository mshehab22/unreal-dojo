---
id: f5-choosing-a-channel
title: Choosing a channel, call, delegate, interface, timer, or Tick
order: 9
kind: concept
difficulty: 3
patterns: []
skills: [communication, planning]
terms: [delegate, uinterface, timer-manager, tick, cast]
prerequisites: [f5-tick-and-deltatime]
xp: 30
estimatedMinutes: 7
concepts:
  - Each channel answers a different question about who knows whom and when
  - Picking by direction of knowledge keeps classes reusable
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a pressure plate must open a gate, light two lamps, and tell a quest tracker, and designers will add more reactions later. Which channel should the plate use?"
choices:
  - Hold pointers to the gate, the lamps, and the tracker and call each
  - Broadcast an OnPressed event that each of them binds to
  - Tick and check every frame whether it is pressed
  - Cast the player to a specific class when it steps on
answerIndex: 1
explanation: The plate announces; the reactions bind themselves, so new ones need no change to the plate.
```

# Card

Every time two things must talk, pick the channel by asking who should know about whom, and when it happens.

- **Direct call**: A holds a reference to B and calls it. Right when A owns B or truly depends on it: a spawner calling its own spawned dummies, a rack lending its targets.
- **Delegate** (event): A announces, unknown listeners react. Right when the sender should not care who reacts: health changed, lever pulled, round over. Listeners bind in BeginPlay and unbind in EndPlay.
- **Interface**: A asks B to do something without knowing B's class. Right when many unrelated classes answer the same request: interact, take damage, save yourself.
- **Timer**: A reminds itself later, once or on repeat. Right for delays, rhythms, and cooldowns.
- **Tick**: A updates itself every frame. Right only for continuous change: movement, aiming, interpolation.

Two warning signs: a class full of casts to other classes (an interface or a delegate wants out), and a Tick that checks a condition every frame (an event or a timer wants out).

The boss of this world uses all five, and its rubric asks which channel each piece uses and why.

# Example

```cpp
// A pressure plate that only announces; it knows nothing about gates or lamps.
void ADojoF5Plate::HandleOverlap(AActor* Visitor)
{
	if (bPressed) return;

	bPressed = true;
	OnPressed.Broadcast(Visitor);

	// Rearms itself later, with no Tick.
	GetWorldTimerManager().SetTimer(RearmTimer, this, &ADojoF5Plate::Rearm, RearmSeconds, false);
}
```

# Questions

```yaml
- id: pick-channel-damage
  type: multiple-choice
  prompt: "A sword, an arrow, and a falling rock must all deal damage to barrels, enemies, and doors, none of which share a parent class. Which channel should the attacker use on whatever it hit?"
  choices: [A cast chain to every target class, An interface every damageable class implements, A delegate on the attacker, Tick on every target]
  answerIndex: 1
  explanation: The attacker asks the target to do something without knowing its class, which is exactly what an interface is for.
- id: fill-channel
  type: fill-blank
  prompt: "A turret that fires every 0.5 seconds without Tick uses a looping ___."
  acceptedAnswers: [timer]
  explanation: A looping timer is the rhythm with no per-frame cost.
- id: spot-tick-polling
  type: spot-the-bug
  prompt: This works but costs a check every frame for every gate in the level. Which line should become an event binding instead?
  code: |
    void ADojoF5Gate::Tick(float DeltaSeconds)
    {
    	Super::Tick(DeltaSeconds);
    	if (IsValid(Plate) && Plate->IsPressed()) Open();
    }
  bugLine: 4
  fix: Bind Open to the plate's OnPressed event in BeginPlay and turn the gate's Tick off.
  explanation: Polling every frame for a change that happens rarely is what events are for.
- id: pick-call
  type: multiple-choice
  prompt: "A rack lends its own targets and must raise one it owns. Which channel fits?"
  choices: [A direct call on its target, A delegate the target listens to, Tick on the target]
  answerIndex: 0
  explanation: The rack owns and knows its targets, so calling them directly is the honest dependency.
- id: explain-choice
  type: explain-in-one-sentence
  prompt: In one sentence, say how you decide between a delegate and a direct call.
  modelAnswer: Use a direct call when the caller owns or must know the callee, and a delegate when the sender should announce something without knowing or caring who reacts.
  rubric:
    - Ties direct calls to ownership or real dependency
    - Ties delegates to announcing to unknown listeners
  explanation: The direction of knowledge decides.
```
