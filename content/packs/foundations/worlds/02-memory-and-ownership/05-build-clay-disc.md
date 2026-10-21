---
id: f2-clay-disc
title: A clay disc that leaves play on its own
order: 5
kind: build
scaffold: faded
difficulty: 2
patterns: []
skills: [memory, lifecycle]
terms: [destroy, isvalid, endplay, beginplay, ue-log]
prerequisites: [f2-destroy-and-lifetime]
xp: 60
estimatedMinutes: 15
concepts:
  - SetLifeSpan schedules an actor's own Destroy
  - EndPlay is where an actor learns why its play ended
---

# Brief

When you press Play, the CLAY label above the disc vanishes after 3 seconds and the output log says the disc fell; run `ke * Shatter` before then and it vanishes at once and the log says it shattered.

The header is complete, including a small enum for how the flight ended. In the source file every function has a comment naming its job; fill in:

1. `BeginPlay`: start the flight clock so the disc removes itself after `FlightSeconds`.
2. `Shatter`: mark the disc as shattered and remove it from play now. A second Shatter on a disc already on its way out does nothing.
3. `EndPlay`: when the reason is that the actor was destroyed, record the fate (shattered or fell) and log one line to `LogDojo`. Call the parent last.

First version: a disc could count its own seconds in Tick and call Destroy when the count passes FlightSeconds. That works, but it makes the engine call the disc every frame for nothing. The actor already has a lifespan setting that does the same with one call, and the engine destroys the actor for you when it runs out.

## See it in the editor

Place a `DojoF2ClayDisc` in the sandbox map and press Play. Watch the Outliner: the disc disappears after 3 seconds and the output log shows a line ending in "fell". Press Play again and run `ke * Shatter` within the 3 seconds: it disappears at once and the line ends in "shattered". Set Flight Seconds to 6 on the placed disc and the wait doubles.

# Files

## DojoF2ClayDisc.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF2ClayDisc.generated.h"

class UTextRenderComponent;

/** How a clay disc's flight ended. */
UENUM(BlueprintType)
enum class EDojoF2DiscFate : uint8
{
	EDF_Flying UMETA(DisplayName = "Flying"),
	EDF_Shattered UMETA(DisplayName = "Shattered"),
	EDF_Fell UMETA(DisplayName = "Fell")
};

/** A clay disc that removes itself after its flight time, or at once when shattered. */
UCLASS()
class ADojoF2ClayDisc : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF2ClayDisc();

	/** Floating text that marks the disc. */
	UPROPERTY(VisibleAnywhere, Category = "Disc")
	TObjectPtr<UTextRenderComponent> Label;

	/** Seconds the disc stays in play before it falls out of it. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Disc", meta = (ClampMin = "0.1"))
	float FlightSeconds = 3.f;

	/** Breaks the disc now and removes it from play. */
	UFUNCTION(BlueprintCallable, Category = "Disc")
	void Shatter();

	/** Flying while in play; Shattered or Fell once its play has ended. */
	UFUNCTION(BlueprintPure, Category = "Disc")
	EDojoF2DiscFate GetFate() const;

protected:
	/** Starts the flight clock. */
	virtual void BeginPlay() override;

	/** Records and logs how the flight ended. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override; // @explain: EndPlay runs for every way an actor leaves play, and its reason says which one this is.

private:
	EDojoF2DiscFate Fate = EDojoF2DiscFate::EDF_Flying;

	bool bWasShattered = false;
};
```

## DojoF2ClayDisc.cpp

```cpp
#include "DojoF2ClayDisc.h"

#include "Components/TextRenderComponent.h"
#include "Dojo.h"

ADojoF2ClayDisc::ADojoF2ClayDisc()
{
	PrimaryActorTick.bCanEverTick = false; // @explain: The lifespan runs on the world's timers, so the disc never needs a per-frame call.

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("CLAY")));
}

void ADojoF2ClayDisc::BeginPlay()
{
	Super::BeginPlay();

	// Your code: start the flight clock from FlightSeconds.
}

void ADojoF2ClayDisc::Shatter()
{
	// Your code: ignore a disc that is already on its way out.
	// Your code: remember that it shattered, then remove it from play.
}

EDojoF2DiscFate ADojoF2ClayDisc::GetFate() const
{
	return Fate;
}

void ADojoF2ClayDisc::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	// Your code: only when the reason is Destroyed, record the fate and log it.

	Super::EndPlay(EndPlayReason);
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/f2-clay-disc/DojoF2ClayDisc.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_ClayDisc_FallsAfterFlight, "Dojo.F2.ClayDisc.FallsAfterFlight", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Ticks just short of the flight time and then past it, and checks the disc leaves play and records that it fell. */
bool FDojo_F2_ClayDisc_FallsAfterFlight::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF2ClayDisc* Disc = TestWorld.SpawnActor<ADojoF2ClayDisc>();
	if (!TestNotNull(TEXT("Disc spawned"), Disc)) return false;

	TestEqual(TEXT("Flying at the start"), Disc->GetFate(), EDojoF2DiscFate::EDF_Flying);

	// 3 seconds at 60 frames per second is 180 frames; 170 is still in flight.
	TestWorld.Tick(170);
	TestTrue(TEXT("Still in play just before the flight time"), IsValid(Disc));

	TestWorld.Tick(20);
	TestFalse(TEXT("Gone from play after the flight time"), IsValid(Disc));

	// The memory stays until garbage collection runs, which these ticks never trigger, so the test may still read the fate.
	TestEqual(TEXT("A disc that ran out of time fell"), Disc->GetFate(), EDojoF2DiscFate::EDF_Fell);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_ClayDisc_ShatterIsImmediate, "Dojo.F2.ClayDisc.ShatterIsImmediate", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Shatters a disc mid-flight, twice, and checks it leaves play at once and records that it shattered. */
bool FDojo_F2_ClayDisc_ShatterIsImmediate::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF2ClayDisc* Disc = TestWorld.SpawnActor<ADojoF2ClayDisc>();
	if (!TestNotNull(TEXT("Disc spawned"), Disc)) return false;

	TestWorld.Tick(30);
	Disc->Shatter();
	TestFalse(TEXT("Gone from play right after Shatter"), IsValid(Disc));
	TestEqual(TEXT("A shattered disc says so"), Disc->GetFate(), EDojoF2DiscFate::EDF_Shattered);

	Disc->Shatter();
	TestEqual(TEXT("The fate is still Shattered after a second Shatter"), Disc->GetFate(), EDojoF2DiscFate::EDF_Shattered);

	return true;
}

#endif
```

# Hints

- Each body is one or two lines: a check of the current situation, then one engine call; the parent call in EndPlay stays where it is, at the end.
- The actor can schedule its own removal from a number of seconds, remove itself right now, and tell you whether it is already being removed; the reason passed to EndPlay has a value for "destroyed".
- All three calls are members of `AActor` in `GameFramework/Actor.h`; the reason values are in `Engine/EngineTypes.h`.

# Rubric

- BeginPlay sets the lifespan from the editable FlightSeconds, after Super::BeginPlay.
- Shatter marks the disc, destroys it, and does nothing for a disc already being destroyed.
- EndPlay records the fate and logs only when the reason is Destroyed, and calls Super::EndPlay last.
- No Tick is used to count the flight time.
- The disc owns its whole lifetime; nothing else has to remember to destroy it.

# Alternative

A disc that leaves play on a timer could hide itself instead of being destroyed, ready to be thrown again. That avoids the cost of spawning a new actor for every throw, which matters when a range throws dozens a minute, but it means some other object must own the discs and reset them. Destroying is the simple, correct default; the target rack later in this world shows the reuse version.

# Parsons

```yaml
- id: disc-end-play
  prompt: Put EndPlay in order.
  lines:
    - "void ADojoF2ClayDisc::EndPlay(const EEndPlayReason::Type EndPlayReason)"
    - "{"
    - "	if (EndPlayReason == EEndPlayReason::Destroyed)"
    - "	{"
    - "		Fate = bWasShattered ? EDojoF2DiscFate::EDF_Shattered : EDojoF2DiscFate::EDF_Fell;"
    - "	}"
    - "	Super::EndPlay(EndPlayReason);"
    - "}"
  distractors:
    - line: "	Super::BeginPlay();"
      mistake: EndPlay calls its own parent version; BeginPlay belongs to the start of play.
    - line: "	Destroy();"
      mistake: The actor is already leaving play when EndPlay runs; destroying it again from here does nothing useful.
```
