---
id: p15-gong-refactor
title: A gong that makes its own speaker
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [service-locator]
skills: [service-locator, refactoring]
terms: [world-subsystem, uinterface, createdefaultsubobject, null-object, beginplay]
prerequisites: [p15-crier-trace, p15-announcer-desk]
xp: 100
estimatedMinutes: 20
concepts:
  - A class that creates and names its own concrete speaker cannot be given a different one from outside
  - Finding the world's desk and announcing through the interface replaces the speaker the gong owns
  - The gong's counting and its public functions stay as they were
  - With nothing provided, the do-nothing announcer takes the line and the gong carries on
---

# Brief

After the refactor, striking the gong announces "Gong!" through whichever announcer the world's desk holds, a test can read the lines it announced, and counting strikes works exactly as before.

`ADojoP15Gong` was written before the desk existed. It makes its own `UDojoP15LoudSpeaker` in its constructor and calls `Shout` on it for every strike, so every strike is loud, in every test, with no way to listen to it or to silence it from outside.

Refactor the gong onto the desk:

- `Strike` still counts the strike, then finds the desk of its world and announces "Gong!" through the announcer the desk holds. With no desk it carries on silently.
- Remove the gong's own speaker: the member, the creation in the constructor, the forward declaration, and the include. `UDojoP15LoudSpeaker` stays in its files, unused.
- `Strike`, `GetStrikeCount`, and the way strikes are counted keep their names and results.

Compiles against earlier quests: p15-announcer-desk (`Quests/p15-announcer-desk/DojoP15AnnouncerDesk.h`).

One of the three tests passes on the starter and must pass after; the other two do not. Read their messages.

## See it in the editor

Place a `DojoP15Gong`. In the Level Blueprint, on Begin Play, get the world subsystem Dojo P15 Announcer Desk and call Provide with a Construct Object from Class of Dojo P15 Recording Announcer (outer: the desk), and keep it in a variable. On the G key, call Strike on the gong and print the gong's Strike Count and the recording announcer's Lines. Before the refactor the Lines stay empty while the Output Log fills with LOUD: GONG! lines. After it the Lines gain a "Gong!" for each strike and the Output Log stays quiet.

# Files

## DojoP15LoudSpeaker.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP15LoudSpeaker.generated.h"

/** A speaker that shouts a line into the Output Log; it knows nothing about the announcer interface. */
UCLASS()
class UDojoP15LoudSpeaker : public UObject
{
	GENERATED_BODY()

public:
	/** Writes Line to the Output Log in capitals. */
	void Shout(const FString& Line);

	/** How many lines this speaker has shouted. */
	int32 GetShoutCount() const;

private:
	/** Lines shouted so far. */
	int32 ShoutCount = 0;
};
```

## DojoP15LoudSpeaker.cpp

```cpp
#include "DojoP15LoudSpeaker.h"

void UDojoP15LoudSpeaker::Shout(const FString& Line)
{
	ShoutCount++;
	UE_LOG(LogTemp, Display, TEXT("LOUD: %s"), *Line.ToUpper());
}

int32 UDojoP15LoudSpeaker::GetShoutCount() const
{
	return ShoutCount;
}
```

## DojoP15Gong.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP15Gong.generated.h"

class UDojoP15LoudSpeaker;

/** The dojo gong: each strike is counted and announced as "Gong!". */
UCLASS()
class ADojoP15Gong : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root, the gong's own speaker, and turns ticking off. */
	ADojoP15Gong();

	/** Strikes the gong once: counts the strike and announces "Gong!". */
	UFUNCTION(BlueprintCallable, Category = "Gong")
	void Strike();

	/** How many times the gong has been struck. */
	UFUNCTION(BlueprintPure, Category = "Gong")
	int32 GetStrikeCount() const;

private:
	/** The speaker the gong shouts through. */
	UPROPERTY()
	TObjectPtr<UDojoP15LoudSpeaker> Speaker;

	/** Strikes so far. */
	int32 StrikeCount = 0;
};
```

## DojoP15Gong.cpp

```cpp
#include "DojoP15Gong.h"

#include "Components/SceneComponent.h"
#include "DojoP15LoudSpeaker.h"

ADojoP15Gong::ADojoP15Gong()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	Speaker = CreateDefaultSubobject<UDojoP15LoudSpeaker>(TEXT("Speaker"));
}

void ADojoP15Gong::Strike()
{
	StrikeCount++;
	Speaker->Shout(TEXT("Gong!"));
}

int32 ADojoP15Gong::GetStrikeCount() const
{
	return StrikeCount;
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
#include "Quests/p15-gong-refactor/DojoP15Gong.h"
#include "Support/DojoTestWorld.h"
#include "UObject/Package.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_GongRefactor_StrikesAreCounted, "Dojo.P15.GongRefactor.StrikesAreCounted", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Every strike is counted once, whatever is or is not provided. */
bool FDojo_P15_GongRefactor_StrikesAreCounted::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP15Gong* Gong = TestWorld.SpawnActor<ADojoP15Gong>();
	if (!TestNotNull(TEXT("Gong spawned"), Gong)) return false;

	TestEqual(TEXT("A new gong has not been struck"), Gong->GetStrikeCount(), 0);
	Gong->Strike();
	Gong->Strike();
	Gong->Strike();
	TestEqual(TEXT("Three strikes are counted"), Gong->GetStrikeCount(), 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_GongRefactor_StrikesAreAnnouncedThroughTheDesk, "Dojo.P15.GongRefactor.StrikesAreAnnouncedThroughTheDesk", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Each strike is announced as "Gong!" by the announcer the desk holds, and a second announcer takes over when it is provided. */
bool FDojo_P15_GongRefactor_StrikesAreAnnouncedThroughTheDesk::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(TestWorld.GetWorld());
	ADojoP15Gong* Gong = TestWorld.SpawnActor<ADojoP15Gong>();
	if (!TestNotNull(TEXT("The world has a desk"), Desk) || !TestNotNull(TEXT("Gong spawned"), Gong)) return false;

	UDojoP15RecordingAnnouncer* First = NewObject<UDojoP15RecordingAnnouncer>(GetTransientPackage());
	Desk->Provide(First);
	Gong->Strike();
	Gong->Strike();

	const TArray<FString> Expected = { TEXT("Gong!"), TEXT("Gong!") };
	TestTrue(TEXT("The recording announcer heard two gongs"), First->GetLines() == Expected);

	UDojoP15RecordingAnnouncer* Second = NewObject<UDojoP15RecordingAnnouncer>(GetTransientPackage());
	Desk->Provide(Second);
	Gong->Strike();
	TestEqual(TEXT("A newly provided announcer hears the next strike"), Second->GetLines().Num(), 1);
	TestEqual(TEXT("And the first hears nothing more"), First->GetLines().Num(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_GongRefactor_NothingProvidedIsAbsorbed, "Dojo.P15.GongRefactor.NothingProvidedIsAbsorbed", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With nothing provided, the do-nothing announcer takes the line and the strike is still counted. */
bool FDojo_P15_GongRefactor_NothingProvidedIsAbsorbed::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(TestWorld.GetWorld());
	ADojoP15Gong* Gong = TestWorld.SpawnActor<ADojoP15Gong>();
	if (!TestNotNull(TEXT("The world has a desk"), Desk) || !TestNotNull(TEXT("Gong spawned"), Gong)) return false;

	Gong->Strike();
	TestEqual(TEXT("The strike was counted"), Gong->GetStrikeCount(), 1);
	TestEqual(TEXT("The do-nothing announcer took the line"), Desk->GetNullAnnouncer()->GetAbsorbedCount(), 1);

	return true;
}

#endif
```

# Hints

- `StrikesAreCounted` passes before and after; keep it passing. The other two tests say the refactor is done.
- The desk of a world is found with `UDojoP15AnnouncerDesk::Locate(GetWorld())`; the announcer in place comes from `Get()`.
- Delete the constructor line that creates the speaker, the member, and the include of the speaker's header. The gong then has nothing left that names a speaker class.

# Rubric

- Strike counts the strike and announces "Gong!" through the announcer the world's desk holds.
- The gong no longer creates, owns, or names a concrete speaker class, and its header no longer includes the speaker's.
- With nothing provided the do-nothing announcer takes the line, and with no desk the gong carries on.
- Strike, GetStrikeCount, and the strike count keep their names and results.
- The gong depends on the desk and the interface; the announcers know nothing about the gong.

# Alternative

The gong could broadcast a multicast delegate such as `OnStruck`, and an announcer, or anything else, could subscribe to it. Then the gong would not know about announcers at all, which is the loosest coupling of the three, at the price of setup code that wires the subscribers in. Another route is to give the gong an `EditAnywhere` property holding the announcer to use, which is the most visible dependency and has to be set for every gong in every level.
