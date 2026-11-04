---
id: s6-senses-blackboard
title: Senses and the blackboard
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [ai]
terms: [ai-controller, ai-perception, ai-stimulus, blackboard]
prerequisites: [s6-guard-plan]
xp: 30
estimatedMinutes: 8
concepts:
  - Perception tells the controller about each sighting, each loss, and each noise as one event carrying a stimulus
  - Noises are reported by game code, and a noise with nobody behind it is never heard
  - A blackboard is a notice board of named keys that a Behavior Tree reads without knowing who wrote them
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a guard's sight config notices an intruder, and a few seconds later the intruder steps behind a wall. How often does the perception component's OnTargetPerceptionUpdated event fire for that intruder?"
choices:
  - Once, when the guard first sees the intruder and never again
  - Twice, once for seeing and once for losing
  - Every frame for as long as the intruder stays in view
  - Never, because that event is only for noises
answerIndex: 1
explanation: Sight sends news only when its answer changes, so the guard gets one update for the sighting and one, marked as no longer sensed, for the loss.
```

# Card

A guard that sees and hears needs four engine parts before any decision is made.

The **AI controller** is the brain that possesses a pawn. A pawn gets one through its AI Controller Class setting, and the controller, not the pawn, holds the senses and the decision logic. A player controller reads a keyboard; an AI controller reads the world.

**AI perception** is a component, `UAIPerceptionComponent`, usually added to the controller. Each sense is a config on it. A sight config has a radius, a longer radius for losing sight, and a cone; a hearing config has a range; and each config says whose actors it may notice, by friend, neutral, or enemy. The perception system does the checking on its own schedule and reports through the `OnTargetPerceptionUpdated` event, which passes the actor concerned and an `FAIStimulus`.

An **AI stimulus**, `FAIStimulus`, is one piece of that news:

- `WasSuccessfullySensed()` is true while the sense has the actor, and false in the update that says it was lost.
- `StimulusLocation` is where the sense noticed it, and for a loss it is the last place the actor was sensed.
- `Strength` says how strong it was, and `GetAge()` how long ago it happened.
- It holds only a sense id. Ask the perception system, with `UAIPerceptionSystem::GetSenseClassForStimulus`, whether it came from sight or hearing.

Sight sends one update when it starts seeing an actor and another when it loses it. Hearing hears only what game code reports: `UAISense_Hearing::ReportNoiseEvent(WorldContext, Location, Loudness, Instigator, MaxRange)`. Pass the actor that made the noise as the instigator. The update is about an actor, so a noise reported with no instigator is dropped.

A **blackboard** is the notice board a Behavior Tree reads. It is a set of named, typed keys, such as a Bool called `HasClue` or a Vector called `ClueLocation`, defined in a blackboard asset and held while the game runs by a `UBlackboardComponent` that the controller sets up when it runs a tree. Code writes a key with `SetValueAsBool` or `SetValueAsVector`, and the decisions in the tree only read keys, so a decision never needs to know where a fact came from.

A Behavior Tree is a root with branches below it, and each branch point is a composite node that decides which children run. A selector tries its children from left to right until one succeeds, and a sequence runs its children in order until one fails.

# Example

```cpp
// DojoExSentryController.cpp

/** Gives the controller a sight config that notices neutrals within 800 units. */
ADojoExSentryController::ADojoExSentryController()
{
	UAIPerceptionComponent* Senses = CreateDefaultSubobject<UAIPerceptionComponent>(TEXT("Senses"));
	SetPerceptionComponent(*Senses);

	UAISenseConfig_Sight* Sight = CreateDefaultSubobject<UAISenseConfig_Sight>(TEXT("Sight"));
	Sight->SightRadius = 800.f;
	Sight->LoseSightRadius = 900.f;
	Sight->PeripheralVisionAngleDegrees = 45.f;
	Sight->DetectionByAffiliation.bDetectNeutrals = true;
	Senses->ConfigureSense(*Sight);
}

/** Listens to the perception component once play begins. */
void ADojoExSentryController::BeginPlay()
{
	Super::BeginPlay();
	GetAIPerceptionComponent()->OnTargetPerceptionUpdated.AddDynamic(this, &ADojoExSentryController::HandleUpdate);
}

/** Logs each sighting and each loss with the place it happened. */
void ADojoExSentryController::HandleUpdate(AActor* Actor, FAIStimulus Stimulus)
{
	const TCHAR* Word = Stimulus.WasSuccessfullySensed() ? TEXT("seen") : TEXT("lost");
	UE_LOG(LogTemp, Log, TEXT("%s %s at %s"), *GetNameSafe(Actor), Word, *Stimulus.StimulusLocation.ToString());
}
```

# Questions

```yaml
- id: fill-sensed
  type: fill-blank
  prompt: "To tell whether a stimulus says the actor is still sensed or was just lost, call Stimulus.___()."
  acceptedAnswers: [WasSuccessfullySensed]
  explanation: WasSuccessfullySensed is true while the sense has the actor and false in the update that reports the loss.
- id: which-event
  type: multiple-choice
  prompt: A handler must know which sense produced an update and where it happened. Which perception event passes it an FAIStimulus?
  choices:
    - OnPerceptionUpdated, which passes the list of changed actors
    - GetCurrentlyPerceivedActors, which a handler calls on demand
    - OnTargetPerceptionUpdated, which reports one actor's change
    - OnComponentBeginOverlap, which reports touching
  answerIndex: 2
  explanation: OnTargetPerceptionUpdated passes one actor and its stimulus; OnPerceptionUpdated passes only a list of actors, with nothing to tell sight from hearing.
- id: spot-silent-noise
  type: spot-the-bug
  prompt: A door slam reports a noise 400 units from a guard whose hearing range is 1500, yet the guard never reacts. Which line is wrong?
  code: |
    void ADojoExDoor::Slam()
    {
    	UAISense_Hearing::ReportNoiseEvent(this, GetActorLocation(), 1.f, nullptr, 1500.f);
    }
  bugLine: 3
  fix: Pass the actor that made the noise as the instigator, so the update is about someone the guard can hear.
  explanation: "Perception reports are about actors, so a noise with a null instigator has nobody to be attributed to and is dropped before the guard hears it."
- id: why-keys
  type: multiple-choice
  prompt: A Behavior Tree reads a key such as ClueLocation from its blackboard instead of calling the perception component itself. Why is that useful?
  choices:
    - Because blackboard keys are always faster to read than any other kind of variable
    - Because perception can only be read from Blueprint graphs, never by a tree
    - Because a blackboard decides which of the tree's branches may run
    - The tree only knows keys, so anything that writes them can feed it
  answerIndex: 3
  explanation: The tree depends only on key names and types, so a memory component, a service, or a Blueprint can fill the keys without the tree changing.
- id: explain-loss
  type: explain-in-one-sentence
  prompt: In one sentence, say what the stimulus in an OnTargetPerceptionUpdated call tells a guard when sight loses an intruder.
  modelAnswer: It is marked as no longer sensed, and its location is the last place the intruder was sensed, so the guard still has somewhere to go and look.
  rubric:
    - Says the stimulus is marked as no longer sensed
    - Says the location is where the actor was last sensed
  explanation: A loss is still news with a place attached, which is what lets a guard search the last known position.
```
