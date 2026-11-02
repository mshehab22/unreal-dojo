---
id: m1-triggers-and-events
title: Triggers, trigger events, and the action instance
order: 8
kind: concept
difficulty: 3
patterns: []
skills: [input]
terms: [input-trigger, etriggerevent, finputactioninstance]
prerequisites: [m1-pause-context]
xp: 30
estimatedMinutes: 10
concepts:
  - A trigger decides when input counts; the trigger events are the moments a state change is announced
  - A Hold trigger announces Started, Ongoing, Triggered, and then either Completed or Canceled
  - A handler that takes the action instance can read how long the action has been going
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: an action has a Hold trigger with a one second threshold. The player presses the key and lets go after half a second. Which event does the action announce when the key is released?"
choices:
  - Triggered
  - Completed
  - Canceled
  - Nothing, because the hold never finished
answerIndex: 2
explanation: The action began to be evaluated but never reached Triggered, so letting go is announced as Canceled.
```

# Card

With no triggers, an action counts whenever its value is not zero. A **trigger** (`UInputTrigger`) changes that rule. Each trigger looks at the value and the time so far and reports a **state**: nothing, ongoing, or triggered. The action turns changes of state into **trigger events**, which are what `BindAction` listens for:

| Event | When |
|---|---|
| `Started` | Evaluation begins: the state goes from nothing to ongoing, or straight to triggered |
| `Ongoing` | Every frame the state stays ongoing |
| `Triggered` | The state is triggered: once for a one-shot trigger, every frame otherwise |
| `Completed` | The state goes from triggered back to nothing |
| `Canceled` | The state goes from ongoing back to nothing: the input stopped before the trigger was satisfied |

The common triggers: **Pressed** fires once when the key goes down; **Released** once when it comes up; **Down** is the default, firing every frame the key is down; **Hold** is ongoing until the key has been held for `HoldTimeThreshold` seconds and then triggered; **Hold And Release** triggers on release after that time; **Tap** triggers only if the key is released within a short time; **Repeated Tap** needs several taps; **Pulse** triggers again at a fixed interval while held; **Chorded Action** counts only while another action is also active. The old Combo trigger is deprecated in 5.8. A trigger can sit on one key's mapping or on the action itself.

Only triggers that take time can be ongoing, so only they announce `Ongoing` and `Canceled`. With a Hold trigger, a key released early is `Canceled`, and a key released after the threshold is `Completed`, because by then it was triggered. Holding the key past the threshold fires `Triggered` on every frame unless the trigger's `bIsOneShot` is set.

A handler can ask for more than the value. If it takes a **`const FInputActionInstance&`**, it can call `GetValue()`, `GetElapsedTime()`, the seconds the action has been started, ongoing, or triggered, and `GetTriggeredTime()`, the seconds it has been triggered. That is how a charge bar can follow how long a key has been held:

```cpp
EnhancedInput->BindAction(ChargeAction, ETriggerEvent::Ongoing, this, &ADojoCannon::Charging);

void ADojoCannon::Charging(const FInputActionInstance& Instance)
{
	Charge = FMath::Clamp(Instance.GetElapsedTime() / FullChargeSeconds, 0.f, 1.f);
}
```

# Example

```cpp
UInputTriggerHold* Hold = NewObject<UInputTriggerHold>(ChargeContext);
Hold->HoldTimeThreshold = 1.5f;

FEnhancedActionKeyMapping& Mapping = ChargeContext->MapKey(ChargeAction, EKeys::LeftMouseButton);
Mapping.Triggers.Add(Hold);
```

# Questions

```yaml
- id: fill-event
  type: fill-blank
  prompt: "A Hold trigger's key is released after the threshold was reached. The action announces ETriggerEvent::___."
  acceptedAnswers: [Completed]
  explanation: It had reached Triggered, so going back to nothing is Completed. Canceled is for letting go early.
- id: ongoing-needs-time
  type: multiple-choice
  prompt: "Which trigger can make an action announce Ongoing?"
  choices:
    - Pressed
    - Released
    - Down
    - Hold
  answerIndex: 3
  explanation: Only triggers that take time have an ongoing state; Pressed, Released, and Down answer at once.
- id: wrong-time
  type: spot-the-bug
  prompt: The charge bar fills to full the moment the key goes down and never shows anything in between. Which line is wrong?
  code: |
    void ADojoCannon::Charging(const FInputActionInstance& Instance)
    {
    	Charge = FMath::Clamp(Instance.GetValue().Get<float>() / FullChargeSeconds, 0.f, 1.f);
    }
  bugLine: 3
  fix: Divide the elapsed time, Instance.GetElapsedTime(), by FullChargeSeconds; the value of a key is only ever 0 or 1.
  explanation: GetValue says how hard the key is pressed, not for how long, so the bar saw a 1 on the first frame.
- id: one-shot
  type: multiple-choice
  prompt: "A Hold trigger's threshold passes and the key stays down for three more seconds. With bIsOneShot off, how often does Triggered fire?"
  choices:
    - Once, when the threshold is reached
    - On every frame the key stays down
    - Never; only Completed fires
  answerIndex: 1
  explanation: A Hold trigger stays triggered while the key is held. Turn on one-shot to get a single Triggered.
- id: which-trigger
  type: multiple-choice
  prompt: "A heavy attack should happen when the player releases the key after holding it for at least half a second. Which trigger fits without any extra code?"
  choices:
    - Pressed
    - Hold And Release
    - Pulse
    - Tap
  answerIndex: 1
  explanation: Hold And Release triggers on release once the key has been held for its threshold.
- id: explain-events
  type: explain-in-one-sentence
  prompt: In one sentence, say the difference between Completed and Canceled.
  modelAnswer: Completed means the trigger had been satisfied before the input ended, while Canceled means the input ended before the trigger was satisfied.
  rubric:
    - Says Completed comes after the trigger was reached
    - Says Canceled is the input stopping early
  explanation: Completed follows Triggered; Canceled follows Ongoing.
```
