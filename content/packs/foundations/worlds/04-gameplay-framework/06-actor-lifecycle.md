---
id: f4-actor-lifecycle
title: Constructor, OnConstruction, BeginPlay, and EndPlay
order: 6
kind: concept
difficulty: 2
patterns: []
skills: [framework, lifecycle]
terms: [on-construction, beginplay, endplay, super, cdo]
prerequisites: [f4-carrier]
xp: 25
estimatedMinutes: 7
concepts:
  - Each lifecycle step has one job and runs at a known moment
  - OnConstruction runs in the editor too, so designers see its results while editing
  - Every override calls its Super version
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a fence actor lays out its posts in OnConstruction. A designer drags the fence across the level in the editor without pressing Play. Do the posts follow and update?"
choices:
  - No, OnConstruction only runs when play starts
  - Yes, OnConstruction runs again in the editor when the actor is placed, moved, or edited
  - Only after the level is saved
  - Only if BeginPlay also calls it
answerIndex: 1
explanation: OnConstruction is the C++ side of the construction script, which the editor reruns whenever the actor changes.
```

# Card

An actor passes through four steps, and each one has a single job.

1. **Constructor**: builds the class default object and every instance's starting parts. Create components with `CreateDefaultSubobject`, set default values, nothing that needs a world.
2. **OnConstruction(Transform)**: runs when the actor is placed, moved, or has a property edited in the editor, and once more when it is spawned during play, before BeginPlay. It sees the designer's edited values and the actor's transform, so it is the place to lay out things that depend on them: posts along a fence, lights along a corridor. Whatever it builds must be rebuilt cleanly each time, because it runs again and again.
3. **BeginPlay**: play has started and the actor is in a world with other actors. Start timers, find other actors, bind to events.
4. **EndPlay(Reason)**: the actor is leaving play, for any reason. Undo what BeginPlay set up.

Every override of these engine functions calls its parent with `Super::`: first in BeginPlay and OnConstruction, last in EndPlay. Skipping `Super::BeginPlay()` silently breaks the parent's setup, including Blueprint BeginPlay events and components' own BeginPlay.

Components have the same rhythm: `BeginPlay` and `EndPlay` on `UActorComponent`, and `OnRegister` when the component joins its world.

# Example

```cpp
// Lays out one light every LightSpacing along the corridor, in the editor as well as in play.
void ADojoF4Corridor::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);

	ClearLights();
	for (int32 Index = 0; Index < LightCount; ++Index)
	{
		AddLightAt(FVector(LightSpacing * Index, 0.f, 250.f));
	}
}

void ADojoF4Corridor::BeginPlay()
{
	Super::BeginPlay();

	// Needs a running world, so it waits for play.
	GetWorldTimerManager().SetTimer(FlickerTimer, this, &ADojoF4Corridor::Flicker, 2.f, true);
}
```

# Questions

```yaml
- id: where-layout
  type: multiple-choice
  prompt: "A row of lanterns along a bridge should update in the editor as a designer changes the lantern count. Which function lays them out?"
  choices: [The constructor, OnConstruction, BeginPlay, EndPlay]
  answerIndex: 1
  explanation: OnConstruction sees the edited count and reruns in the editor.
- id: fill-super
  type: fill-blank
  prompt: "The first line of an override of BeginPlay is ___::BeginPlay();"
  acceptedAnswers: [Super]
  explanation: Super calls the parent class's version, which sets up components and Blueprint events.
- id: spot-onconstruction-leftovers
  type: spot-the-bug
  prompt: Every time the designer nudges this fence in the editor, more posts pile up on top of the old ones. Which line is missing its counterpart?
  code: |
    void ADojoF4Fence::OnConstruction(const FTransform& Transform)
    {
    	Super::OnConstruction(Transform);
    	for (int32 Index = 0; Index < PostCount; ++Index) AddPost(Index);
    }
  bugLine: 4
  fix: Destroy the posts from the previous construction before adding new ones.
  explanation: OnConstruction runs again on every move or edit, so whatever it builds must be cleared first.
- id: endplay-order
  type: multiple-choice
  prompt: "Where does Super::EndPlay go in an override of EndPlay?"
  choices:
    - First, before the actor's own cleanup
    - Last, after the actor's own cleanup
    - It is not needed in EndPlay
  answerIndex: 1
  explanation: The actor undoes its own setup while its parent's state is still intact, then lets the parent finish.
- id: explain-onconstruction
  type: explain-in-one-sentence
  prompt: In one sentence, say how OnConstruction differs from BeginPlay.
  modelAnswer: OnConstruction runs whenever the actor is built or changed, in the editor too, to lay things out from its properties and transform, while BeginPlay runs once when play starts and is where gameplay setup belongs.
  rubric:
    - Says OnConstruction also runs in the editor or on every change
    - Says BeginPlay runs once at the start of play
  explanation: Layout in OnConstruction, behavior in BeginPlay.
```
