---
id: p14-start-lights
title: One set of start lights per track
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [singleton]
skills: [singleton, lifecycle]
terms: [beginplay, endplay, tactoriterator, world, play-in-editor, static-variable]
prerequisites: [p14-singleton-card]
xp: 110
estimatedMinutes: 30
concepts:
  - Only one set of start lights may run on a track, and a second set placed by mistake must stand down where everyone can see it
  - The rule is checked when the lights begin play, and the running set gives way when it ends play
  - A duplicate stays a duplicate; it does not take over later
  - The rule holds for each track on its own, and nothing about it is reachable from outside the lights
  - The countdown, given, works only on the running set
---

# Brief

When you press Play with the setup below, the first set of start lights on the track counts down from red to green, and a second set placed on the same track by mistake disappears and never counts down.

`ADojoP14StartLights` is a track's start lights. `BeginCountdown` turns running lights red and starts a countdown of `CountdownSeconds`, 3 by default; `Tick` turns them green when it ends; `IsGreen` says so. Lights that do not run refuse `BeginCountdown` and return false. All of that is given.

Yours are `BeginPlay` and `EndPlay`. Only one set of lights may run on each track, and a track is a world. When a set begins play and no other set is running in its world, it runs: `IsRunning` is true. When another set is already running there, the new set is a duplicate: `IsRunning` is false, `IsDuplicate` is true, and it hides itself in game, so a designer sees one set. When the running set ends play, for example because it is destroyed, it stops running, and a set that begins play after that can run. A duplicate stays a duplicate; it never takes over. No other class needs to know about this rule, and nothing outside the lights should be able to reach it.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP14StartLights` and give it a Static Mesh component in the Details panel (a sphere is enough) so you can see it. Place a second one beside it, with a sphere of its own. In the Level Blueprint, on Begin Play, call Begin Countdown on both and print the two results, then after a Delay of 4 seconds print Is Green on both. Press Play: one sphere is gone, the prints say true and false, then true and false. In the Play options, set Number of Players to 2 and play again: each player's window shows the same, one set of lights per track.

# Files

## DojoP14StartLights.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP14StartLights.generated.h"

/** A track's start lights. One set runs in each world; a second set placed in the same world by mistake hides itself and never counts down. */
UCLASS()
class ADojoP14StartLights : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and lets the lights tick. */
	ADojoP14StartLights();

	/** How long the lights stay red after a countdown begins. */
	UPROPERTY(EditAnywhere, Category = "Lights", meta = (ClampMin = "0.0"))
	float CountdownSeconds = 3.f;

	/** Turns the lights red and starts the countdown from the beginning; false, doing nothing, on lights that do not run. */
	UFUNCTION(BlueprintCallable, Category = "Lights")
	bool BeginCountdown();

	/** True once a countdown has run its full time. */
	UFUNCTION(BlueprintPure, Category = "Lights")
	bool IsGreen() const;

	/** True for the one set of lights that runs in its world. */
	UFUNCTION(BlueprintPure, Category = "Lights")
	bool IsRunning() const;

	/** True for lights that found another set already running in their world when they began play. */
	UFUNCTION(BlueprintPure, Category = "Lights")
	bool IsDuplicate() const;

	/** Counts a running countdown down. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Runs, or stands down as a hidden duplicate when another set already runs in this world. */
	virtual void BeginPlay() override;

	/** Stops running, so a set that begins play later in this world can run. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** True for the one set that runs in its world. */
	bool bRunning = false;

	/** True when another set already ran in this world at BeginPlay. */
	bool bDuplicate = false;

	/** True while the lights are red and counting. */
	bool bCounting = false;

	/** True once a countdown has finished. */
	bool bGreen = false;

	/** Seconds the current countdown has run. */
	float CountedSeconds = 0.f;
};
```

## DojoP14StartLights.cpp

```cpp
#include "DojoP14StartLights.h"

#include "Components/SceneComponent.h"
#include "EngineUtils.h"

ADojoP14StartLights::ADojoP14StartLights()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP14StartLights::BeginPlay()
{
	Super::BeginPlay();
}

void ADojoP14StartLights::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Super::EndPlay(EndPlayReason);
}

bool ADojoP14StartLights::BeginCountdown()
{
	if (!bRunning) return false;

	bCounting = true;
	bGreen = false;
	CountedSeconds = 0.f;
	return true;
}

bool ADojoP14StartLights::IsGreen() const
{
	return bGreen;
}

bool ADojoP14StartLights::IsRunning() const
{
	return bRunning;
}

bool ADojoP14StartLights::IsDuplicate() const
{
	return bDuplicate;
}

void ADojoP14StartLights::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bCounting) return;

	CountedSeconds += DeltaSeconds;
	if (CountedSeconds < CountdownSeconds) return;

	bCounting = false;
	bGreen = true;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p14-start-lights/DojoP14StartLights.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_StartLights_OneSetRunsPerTrack, "Dojo.P14.StartLights.OneSetRunsPerTrack", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The first set on a track runs and counts down; a second set on the same track is a hidden duplicate that refuses to count. */
bool FDojo_P14_StartLights_OneSetRunsPerTrack::RunTest(const FString& Parameters)
{
	FDojoTestWorld Track;

	ADojoP14StartLights* First = Track.SpawnActor<ADojoP14StartLights>();
	ADojoP14StartLights* Second = Track.SpawnActor<ADojoP14StartLights>();
	if (!TestNotNull(TEXT("First set spawned"), First) || !TestNotNull(TEXT("Second set spawned"), Second)) return false;

	TestTrue(TEXT("The first set runs"), First->IsRunning());
	TestFalse(TEXT("The first set is no duplicate"), First->IsDuplicate());
	TestFalse(TEXT("The first set stays visible"), First->IsHidden());

	TestFalse(TEXT("The second set does not run"), Second->IsRunning());
	TestTrue(TEXT("The second set is a duplicate"), Second->IsDuplicate());
	TestTrue(TEXT("The duplicate hides"), Second->IsHidden());

	TestFalse(TEXT("The duplicate refuses a countdown"), Second->BeginCountdown());
	TestTrue(TEXT("The running set starts one"), First->BeginCountdown());
	Track.Tick(200);
	TestTrue(TEXT("The running set turns green"), First->IsGreen());
	TestFalse(TEXT("The duplicate never does"), Second->IsGreen());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_StartLights_ANewSetAfterTheOldLeaves, "Dojo.P14.StartLights.ANewSetAfterTheOldLeaves", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** When the running set is destroyed, a set placed afterwards runs; the old duplicate does not take over. */
bool FDojo_P14_StartLights_ANewSetAfterTheOldLeaves::RunTest(const FString& Parameters)
{
	FDojoTestWorld Track;

	ADojoP14StartLights* First = Track.SpawnActor<ADojoP14StartLights>();
	ADojoP14StartLights* Second = Track.SpawnActor<ADojoP14StartLights>();
	if (!TestNotNull(TEXT("First set spawned"), First) || !TestNotNull(TEXT("Second set spawned"), Second)) return false;

	First->Destroy();
	TestFalse(TEXT("The destroyed set no longer runs"), First->IsRunning());
	TestFalse(TEXT("The duplicate does not take over"), Second->IsRunning());

	ADojoP14StartLights* Third = Track.SpawnActor<ADojoP14StartLights>();
	if (!TestNotNull(TEXT("Third set spawned"), Third)) return false;
	TestTrue(TEXT("A set placed after the running one left runs"), Third->IsRunning());
	TestFalse(TEXT("And is no duplicate"), Third->IsDuplicate());

	ADojoP14StartLights* Fourth = Track.SpawnActor<ADojoP14StartLights>();
	if (!TestNotNull(TEXT("Fourth set spawned"), Fourth)) return false;
	TestTrue(TEXT("A set placed after that is a duplicate again"), Fourth->IsDuplicate());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_StartLights_TwoTracksEachRunTheirOwn, "Dojo.P14.StartLights.TwoTracksEachRunTheirOwn", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two tracks open at the same time, as with two players in Play In Editor: each track's first set runs, and each track's second set is its duplicate. */
bool FDojo_P14_StartLights_TwoTracksEachRunTheirOwn::RunTest(const FString& Parameters)
{
	FDojoTestWorld TrackA;
	FDojoTestWorld TrackB;

	ADojoP14StartLights* LightsA = TrackA.SpawnActor<ADojoP14StartLights>();
	ADojoP14StartLights* LightsB = TrackB.SpawnActor<ADojoP14StartLights>();
	if (!TestNotNull(TEXT("Track A's lights spawned"), LightsA) || !TestNotNull(TEXT("Track B's lights spawned"), LightsB)) return false;

	TestTrue(TEXT("Track A's first set runs"), LightsA->IsRunning());
	TestTrue(TEXT("Track B's first set runs too, while track A is still open"), LightsB->IsRunning());
	TestFalse(TEXT("Track B's first set is no duplicate"), LightsB->IsDuplicate());

	ADojoP14StartLights* ExtraB = TrackB.SpawnActor<ADojoP14StartLights>();
	if (!TestNotNull(TEXT("Track B's second set spawned"), ExtraB)) return false;
	TestTrue(TEXT("Track B's second set is a duplicate"), ExtraB->IsDuplicate());

	TestTrue(TEXT("Track B's lights count down"), LightsB->BeginCountdown());
	TrackB.Tick(200);
	TestTrue(TEXT("Track B's lights turn green"), LightsB->IsGreen());
	TestFalse(TEXT("Track A's lights were never started"), LightsA->IsGreen());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_StartLights_CountdownTakesItsTime, "Dojo.P14.StartLights.CountdownTakesItsTime", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Running lights stay red for their countdown and turn green when it ends; a new countdown turns them red again. */
bool FDojo_P14_StartLights_CountdownTakesItsTime::RunTest(const FString& Parameters)
{
	FDojoTestWorld Track;

	ADojoP14StartLights* Lights = Track.SpawnActor<ADojoP14StartLights>();
	if (!TestNotNull(TEXT("Lights spawned"), Lights)) return false;

	TestTrue(TEXT("The only set on the track runs"), Lights->IsRunning());
	TestTrue(TEXT("It accepts a countdown"), Lights->BeginCountdown());
	Track.Tick(170);
	TestFalse(TEXT("Red before 3 seconds"), Lights->IsGreen());
	Track.Tick(30);
	TestTrue(TEXT("Green after 3 seconds"), Lights->IsGreen());

	TestTrue(TEXT("A second countdown is accepted"), Lights->BeginCountdown());
	TestFalse(TEXT("And turns the lights red again"), Lights->IsGreen());
	Track.Tick(200);
	TestTrue(TEXT("Green again when it ends"), Lights->IsGreen());

	return true;
}

#endif
```

# Hints

- The failing test is the only one with two tracks open at once. Read its message: which track's lights got the wrong answer, and what was true of the other track at that moment?
- Two tracks open at once are two worlds in one program, as with two players in Play In Editor. Whatever your lights consult to decide whether another set runs: is there one of it per track, or one for the whole program?
- Lights can ask their own world which actors it holds. Ask only the world these lights stand in whether a set other than this one is already running, and keep nothing that outlives the track.

# Rubric

- The first set of lights to begin play in a world runs, and every set that begins play there while it runs is a hidden duplicate that refuses a countdown.
- When the running set ends play it stops running, so a set that begins play later in that world can run; a duplicate never takes over.
- Two worlds open at once each have their own running set, and neither affects the other.
- The rule is enforced inside the lights, and nothing gives other code access to it from outside.
- Running lights count down for their CountdownSeconds and turn green; a new countdown turns them red again.
- The lights depend only on their own world; no other class knows about the rule.

# Alternative

A world subsystem could hold the one running set: lights claim it in `BeginPlay` and release it in `EndPlay`, and the subsystem refuses a second claim. That is the better home when other code needs to find the running lights, because they can ask the subsystem instead of searching. It is one more class for a rule only the lights care about, and it is easy to drift into giving the subsystem everything else about the race. Searching the world at `BeginPlay` costs a pass over the lights in the level, once per set, which is nothing for a handful of actors. An `ensure` or `check` on a duplicate is a third choice: loud in development, but a designer's mistake should not stop the game.

# Parsons

```yaml
- id: begin-play
  prompt: Put BeginPlay in order. A duplicate is marked before it hides.
  lines:
    - "void ADojoP14StartLights::BeginPlay()"
    - "{"
    - "	Super::BeginPlay();"
    - "	for (TActorIterator<ADojoP14StartLights> Other(GetWorld()); Other; ++Other)"
    - "	{"
    - "		if (*Other == this || !Other->IsRunning()) continue;"
    - "		bDuplicate = true;"
    - "		SetActorHiddenInGame(true);"
    - "		return;"
    - "	}"
    - "	bRunning = true;"
    - "}"
  distractors:
    - line: "	for (TActorIterator<ADojoP14StartLights> Other(GEngine->GetWorldContexts()[0].World()); Other; ++Other)"
      mistake: The first world context is whichever world the engine listed first, often the editor's own world, not the world these lights stand in; ask GetWorld() for the lights' own track.
```
