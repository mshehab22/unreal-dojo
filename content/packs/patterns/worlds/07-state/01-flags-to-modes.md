---
id: p7-flags-to-modes
title: Flags that cannot agree
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [state]
terms: [uenum, finite-state-machine, tick, character-movement-component]
prerequisites: [p6-later-not-now]
xp: 25
estimatedMinutes: 7
concepts:
  - Several booleans describing one thing allow combinations that can never really happen
  - A thing that is always in exactly one of a few modes can store that as one value
  - The same input can mean different things, or nothing, depending on the mode
  - Work done on entering or leaving a mode belongs with that mode, not with every input that leads there
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: an arena gate is described by three booleans: bIsOpen, bIsOpening, and bIsLocked. How many combinations of the three can the code store, and how many describe a gate that could really exist?"
choices:
  - Three can be stored, three are real
  - Eight can be stored, and only about four are real
  - Eight can be stored, and all eight are real
  - Six can be stored, and six are real
answerIndex: 1
explanation: Three booleans give eight combinations, but a gate cannot be open and opening at once, or locked while opening. Every impossible combination is a bug waiting for an input that produces it.
```

# Card

Many things in a game are always doing exactly one of a few things. A prize kiosk is waiting, taking a choice, dropping a prize, or sold out. A drawbridge is down, rising, up, lowering, or jammed. A common first version describes that with booleans, one per idea: `bIsUp`, `bIsMoving`, `bIsJammed`. Each new idea adds a flag, and each flag doubles the combinations the code can hold, most of which describe something that cannot happen. Every input then needs guards against the bad ones, and the guard someone forgets is the bug.

**One mode, one value.** If the thing is always in exactly one mode, store exactly one value: a `UENUM` with a value per mode. Combinations that cannot happen cannot even be written down. The finite state machine spells this idea out: a fixed set of modes, exactly one current mode, inputs that arrive one at a time, and for each mode a rule for which inputs move it to which other mode.

**Ask the mode first.** The same input means different things in different modes. A token starts a choice when the kiosk is waiting, and is ignored while it is dropping a prize. So each input starts by asking which mode is current (a `switch` on the enum), and an input with no rule in that mode simply does nothing.

**Entering and leaving.** Some work belongs to arriving in a mode, whatever led there: starting the drop timer when dispensing begins, resetting a counter when aiming starts. Put that work in one place that runs on every change into the mode, instead of copying it into every input that can lead there.

**Unreal already does this in places.** The character movement component keeps one movement mode (walking, falling, swimming, flying, and custom modes) and reports changes through `OnMovementModeChanged`. Your gameplay objects deserve the same treatment.

# Example

```cpp
// Flags: four booleans, sixteen combinations, and a guard in every input.
void ADojoArenaGate::Open()
{
	if (bIsOpen || bIsOpening || bIsLocked || bIsBroken) return;
	bIsOpening = true;
}

// One mode: the gate is in exactly one of these, and each input asks which first.
UENUM()
enum class EDojoArenaGateMode : uint8
{
	EAGM_Closed,
	EAGM_Opening,
	EAGM_Open,
	EAGM_Locked
};

void ADojoArenaGate::OpenGate()
{
	if (Mode == EDojoArenaGateMode::EAGM_Closed) Mode = EDojoArenaGateMode::EAGM_Opening;
}
```

# Questions

```yaml
- id: flag-combinations
  type: multiple-choice
  prompt: "A drawbridge has the flags bIsUp, bIsMoving, and bIsJammed. Which combination is impossible for a real drawbridge but easy for the code to hold?"
  choices:
    - Up, not moving, not jammed
    - Not up, not moving, not jammed
    - Jammed and moving at the same time
    - Not up, moving, not jammed
  answerIndex: 2
  explanation: A jammed bridge cannot be travelling. With one mode value, Jammed and Raising are different values, so the bridge cannot be both.
- id: fill-mode
  type: fill-blank
  prompt: "A thing that is always in exactly one of a few modes should store its mode in one ___ rather than a boolean per idea."
  acceptedAnswers: [enum, UENUM, enum field, enum value]
  explanation: One enum value per mode leaves no room for combinations that cannot happen.
- id: spot-missing-guard
  type: spot-the-bug
  prompt: This turnstile uses flags. Which line lets it start turning while it is locked?
  code: |
    void ADojoArenaTurnstile::Push()
    {
    	if (bIsTurning) return;
    	bIsTurning = true;
    	TurnTimeLeft = TurnSeconds;
    }
  bugLine: 3
  fix: Also refuse the push while locked, or better, swap the flags for one mode and only start turning from the Ready mode.
  explanation: The guard checks one flag and forgets the other; with a single mode, Push would only act when the mode is Ready.
- id: entry-action
  type: multiple-choice
  prompt: "Three different inputs can put the kiosk into Dispensing, and each must start the drop timer. Where should starting the timer live?"
  choices:
    - Copied into each of the three inputs
    - In one place that runs whenever the kiosk enters Dispensing
    - In Tick, checked every frame
    - In the timer's own callback
  answerIndex: 1
  explanation: An entry action runs on every way into the mode, so a fourth input added later cannot forget it.
- id: explain-one-mode
  type: explain-in-one-sentence
  prompt: In one sentence, say why one mode value is safer than several booleans for something that is always in exactly one mode.
  modelAnswer: Booleans allow combinations that can never really happen and every input must guard against them, while one mode value can only hold real modes, so the impossible combinations cannot be stored at all.
  rubric:
    - Says booleans allow impossible combinations
    - Says one value can only hold real modes
  explanation: The safest bug is the one the data cannot represent.
```
