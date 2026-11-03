---
id: p15-crier-trace
title: A crier, and a tracer slipped in front of the announcer
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [service-locator]
skills: [service-locator, null-object]
terms: [world-subsystem, uinterface, null-object, beginplay]
prerequisites: [p15-service-locator-card, p15-announcer-desk]
xp: 120
estimatedMinutes: 35
concepts:
  - A caller finds the desk of its world and announces through the interface, with no announcer class named in its code
  - A tracer implements the same interface, passes each line on, and can be slipped in front of any announcer
  - With no provider, the do-nothing announcer takes the line and the caller carries on
  - The caller depends on the desk and the interface; the announcers know nothing about the caller
---

# Brief

When you press Play with the setup below, a crier calls out lines through whichever announcer is in place, a tracer slipped in front of that announcer counts each line and loses none, and nothing breaks when no announcer was ever provided.

Two classes are yours.

`UDojoP15TracingAnnouncer` wraps another announcer. `Wrap` and the getters are given. `Announce` counts the line, then passes it unchanged to the announcer it wraps; with nothing wrapped it counts the line and drops it. Because it implements `IDojoP15Announcer` itself, it can be provided to the desk like any announcer, in front of whichever one was there.

`ADojoP15Crier` stands in the dojo. `CallOut` announces a line through the announcer the desk of its world has in place. With no desk it drops the line. A crier is placed once and then called out through many times during a match.

The crier depends on the desk and the interface, and on no announcer class. The announcers know nothing about the crier.

Compiles against earlier quests: p15-announcer-desk (`Quests/p15-announcer-desk/DojoP15Announcer.h`, `Quests/p15-announcer-desk/DojoP15AnnouncerDesk.h`).

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP15Crier`. In the Level Blueprint, on Begin Play, get the world subsystem Dojo P15 Announcer Desk and call Provide with a Construct Object from Class of Dojo P15 Recording Announcer (outer: the desk). On the keys 1, 2, and 3, call Call Out on the crier with the lines "One", "Two", and "Three". Press 1 and 2, then print the recording announcer's Lines (Get Provider, then Cast To Dojo P15 Recording Announcer, then Get Lines): "One", "Two". Now on key T make a Dojo P15 Tracing Announcer with Construct Object from Class, call Wrap with the desk's Get Provider, then call Provide on the desk with the tracer, and keep the tracer in a variable. Press 3, then print the tracer's Forwarded Count (1) and the recording announcer's Lines again ("One", "Two", "Three"): the line went through the tracer and on to the recording announcer.

# Files

## DojoP15TracingAnnouncer.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Quests/p15-announcer-desk/DojoP15Announcer.h"
#include "UObject/Object.h"
#include "DojoP15TracingAnnouncer.generated.h"

/** An announcer that wraps another one: it counts each line and passes it on unchanged, so it can be slipped in front of any announcer and taken out again. Service Locator pattern. */
UCLASS()
class UDojoP15TracingAnnouncer : public UObject, public IDojoP15Announcer
{
	GENERATED_BODY()

public:
	/** Sets the announcer that lines are passed on to; an object that does not implement the interface, or nullptr, leaves nothing wrapped. */
	UFUNCTION(BlueprintCallable, Category = "Announcer")
	void Wrap(UObject* Announcer);

	/** Counts Line, then passes it on to the wrapped announcer; with nothing wrapped, the line is counted and dropped. */
	virtual void Announce(const FString& Line) override;

	/** The announcer lines are passed on to, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Announcer")
	UObject* GetWrapped() const;

	/** How many lines have gone through. */
	UFUNCTION(BlueprintPure, Category = "Announcer")
	int32 GetForwardedCount() const;

private:
	/** The announcer behind this one. */
	UPROPERTY()
	TObjectPtr<UObject> Wrapped;

	/** Lines that have gone through. */
	int32 ForwardedCount = 0;
};
```

## DojoP15TracingAnnouncer.cpp

```cpp
#include "DojoP15TracingAnnouncer.h"

void UDojoP15TracingAnnouncer::Wrap(UObject* Announcer)
{
	Wrapped = IsValid(Announcer) && Announcer != this && Announcer->Implements<UDojoP15Announcer>() ? Announcer : nullptr;
}

void UDojoP15TracingAnnouncer::Announce(const FString& Line)
{
}

UObject* UDojoP15TracingAnnouncer::GetWrapped() const
{
	return Wrapped.Get();
}

int32 UDojoP15TracingAnnouncer::GetForwardedCount() const
{
	return ForwardedCount;
}
```

## DojoP15Crier.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP15Crier.generated.h"

/** A crier that stands in the dojo and calls lines out through whichever announcer is provided at that moment. Service Locator pattern. */
UCLASS()
class ADojoP15Crier : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP15Crier();

	/** Calls Line out through the announcer now in place; with no desk in the world, the line is dropped. */
	UFUNCTION(BlueprintCallable, Category = "Crier")
	void CallOut(const FString& Line);

protected:
	/** Starts the crier; there is nothing to prepare. */
	virtual void BeginPlay() override;
};
```

## DojoP15Crier.cpp

```cpp
#include "DojoP15Crier.h"

#include "Components/SceneComponent.h"
#include "Quests/p15-announcer-desk/DojoP15AnnouncerDesk.h"

ADojoP15Crier::ADojoP15Crier()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP15Crier::BeginPlay()
{
	Super::BeginPlay();
}

void ADojoP15Crier::CallOut(const FString& Line)
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/World.h"
#include "Quests/p15-announcer-desk/DojoP15AnnouncerDesk.h"
#include "Quests/p15-announcer-desk/DojoP15NullAnnouncer.h"
#include "Quests/p15-announcer-desk/DojoP15RecordingAnnouncer.h"
#include "Quests/p15-crier-trace/DojoP15Crier.h"
#include "Quests/p15-crier-trace/DojoP15TracingAnnouncer.h"
#include "Support/DojoTestWorld.h"
#include "UObject/Package.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_CrierTrace_TracerPassesLinesOn, "Dojo.P15.CrierTrace.TracerPassesLinesOn", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A tracer counts every line and passes it on unchanged and in order; with nothing wrapped it counts and drops; it refuses to wrap what is not an announcer. */
bool FDojo_P15_CrierTrace_TracerPassesLinesOn::RunTest(const FString& Parameters)
{
	UDojoP15RecordingAnnouncer* Record = NewObject<UDojoP15RecordingAnnouncer>(GetTransientPackage());
	UDojoP15TracingAnnouncer* Tracer = NewObject<UDojoP15TracingAnnouncer>(GetTransientPackage());

	Tracer->Wrap(Record);
	TestTrue(TEXT("The tracer wraps the recording announcer"), Tracer->GetWrapped() == Record);

	Tracer->Announce(TEXT("Alpha"));
	Tracer->Announce(TEXT("Beta"));
	TestEqual(TEXT("It counted both lines"), Tracer->GetForwardedCount(), 2);

	const TArray<FString> Expected = { TEXT("Alpha"), TEXT("Beta") };
	TestTrue(TEXT("And the wrapped announcer heard them in order"), Record->GetLines() == Expected);

	Tracer->Wrap(nullptr);
	Tracer->Announce(TEXT("Gamma"));
	TestEqual(TEXT("With nothing wrapped the line is still counted"), Tracer->GetForwardedCount(), 3);
	TestEqual(TEXT("And the old announcer heard nothing more"), Record->GetLines().Num(), 2);

	Tracer->Wrap(NewObject<UObject>(GetTransientPackage()));
	TestNull(TEXT("An object that is not an announcer is not wrapped"), Tracer->GetWrapped());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_CrierTrace_CrierCallsOutThroughTheDesk, "Dojo.P15.CrierTrace.CrierCallsOutThroughTheDesk", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A crier's lines reach the announcer the desk holds, in order, and none reach the do-nothing announcer. */
bool FDojo_P15_CrierTrace_CrierCallsOutThroughTheDesk::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(TestWorld.GetWorld());
	ADojoP15Crier* Crier = TestWorld.SpawnActor<ADojoP15Crier>();
	if (!TestNotNull(TEXT("The world has a desk"), Desk) || !TestNotNull(TEXT("Crier spawned"), Crier)) return false;

	UDojoP15RecordingAnnouncer* Record = NewObject<UDojoP15RecordingAnnouncer>(GetTransientPackage());
	Desk->Provide(Record);

	Crier->CallOut(TEXT("Bout one"));
	Crier->CallOut(TEXT("Bout two"));

	const TArray<FString> Expected = { TEXT("Bout one"), TEXT("Bout two") };
	TestTrue(TEXT("The recording announcer heard both lines in order"), Record->GetLines() == Expected);
	TestEqual(TEXT("The do-nothing announcer heard none"), Desk->GetNullAnnouncer()->GetAbsorbedCount(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_CrierTrace_NothingProvidedIsQuiet, "Dojo.P15.CrierTrace.NothingProvidedIsQuiet", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With nothing provided, the do-nothing announcer takes the line and the crier carries on. */
bool FDojo_P15_CrierTrace_NothingProvidedIsQuiet::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(TestWorld.GetWorld());
	ADojoP15Crier* Crier = TestWorld.SpawnActor<ADojoP15Crier>();
	if (!TestNotNull(TEXT("The world has a desk"), Desk) || !TestNotNull(TEXT("Crier spawned"), Crier)) return false;

	Crier->CallOut(TEXT("Anyone there?"));
	TestEqual(TEXT("The do-nothing announcer took the line"), Desk->GetNullAnnouncer()->GetAbsorbedCount(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_CrierTrace_ChangesReachTheCrier, "Dojo.P15.CrierTrace.ChangesReachTheCrier", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A crier made first keeps calling out through whatever the desk holds: a tracer slipped in front of the recording announcer, then a second recording announcer. */
bool FDojo_P15_CrierTrace_ChangesReachTheCrier::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(TestWorld.GetWorld());
	if (!TestNotNull(TEXT("The world has a desk"), Desk)) return false;

	UDojoP15RecordingAnnouncer* First = NewObject<UDojoP15RecordingAnnouncer>(GetTransientPackage());
	Desk->Provide(First);

	ADojoP15Crier* Crier = TestWorld.SpawnActor<ADojoP15Crier>();
	if (!TestNotNull(TEXT("Crier spawned"), Crier)) return false;

	Crier->CallOut(TEXT("One"));

	UDojoP15TracingAnnouncer* Tracer = NewObject<UDojoP15TracingAnnouncer>(GetTransientPackage());
	Tracer->Wrap(Desk->GetProvider());
	Desk->Provide(Tracer);

	Crier->CallOut(TEXT("Two"));
	TestEqual(TEXT("The tracer saw the line called out after it was slipped in"), Tracer->GetForwardedCount(), 1);
	TestEqual(TEXT("And passed it on to the first recording announcer"), First->GetLines().Num(), 2);

	UDojoP15RecordingAnnouncer* Second = NewObject<UDojoP15RecordingAnnouncer>(GetTransientPackage());
	Desk->Provide(Second);

	Crier->CallOut(TEXT("Three"));
	TestEqual(TEXT("The second recording announcer heard the line called out after it was provided"), Second->GetLines().Num(), 1);
	TestEqual(TEXT("The first heard nothing more"), First->GetLines().Num(), 2);
	TestEqual(TEXT("And neither did the tracer"), Tracer->GetForwardedCount(), 1);

	return true;
}

#endif
```

# Hints

- The failing test names what must keep working after the announcer in place is replaced. Read its message: which announcer got the line, and which should have?
- The crier is made once and called out through many times. Which of the things it knows can change between its first call and its second?
- Ask the desk for the announcer each time `CallOut` runs, and keep nothing between calls. In the tracer, count first, then pass the line on only if something is wrapped.

# Rubric

- The tracer counts every line it receives and passes each one on unchanged to the announcer it wraps, in order; with nothing wrapped it counts and drops.
- CallOut finds the desk of its world and announces through the desk's announcer, and drops the line without crashing when there is no desk.
- With no announcer provided, the do-nothing announcer takes the line.
- The crier and the tracer name no announcer class and create no announcer.
- The crier depends on the desk and the interface; the announcers and the tracer know nothing about the crier.
- Tracing can be put in and taken out without a change to the crier.

# Alternative

The desk could forward the call itself, with a function such as `Say(Line)`, so a caller never holds or even sees the announcer. That is the safest shape for callers and works from Blueprint, since a native interface cannot be called there; the cost is that the desk grows a function for every operation on the service. A different route is to hand each actor the announcer it should use when it is made, which shows every dependency in plain sight and needs a parameter everywhere. The tracer could also be a flag inside each announcer, but a separate wrapper can be put around any announcer, including ones written later.

# Parsons

```yaml
- id: call-out
  prompt: Put CallOut in order.
  lines:
    - "void ADojoP15Crier::CallOut(const FString& Line)"
    - "{"
    - "	UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(GetWorld());"
    - "	if (Desk == nullptr) return;"
    - "	Desk->Get().Announce(Line);"
    - "}"
  distractors:
    - line: "	UDojoP15AnnouncerDesk* Desk = NewObject<UDojoP15AnnouncerDesk>(this);"
      mistake: A subsystem is made by the engine, one per world; building one by hand gives a desk nobody else can find, with its own empty announcer.
```
