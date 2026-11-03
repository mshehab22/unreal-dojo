---
id: p15-announcer-desk
title: One desk where the whole dojo finds its announcer
order: 2
kind: build
scaffold: worked
difficulty: 3
patterns: [service-locator]
skills: [service-locator, subsystems]
terms: [world-subsystem, uinterface, null-object, tobjectptr, cast]
prerequisites: [p15-who-do-i-call]
xp: 60
estimatedMinutes: 20
concepts:
  - The dojo's code speaks through a small interface, and any class that implements it can stand behind it
  - A world subsystem is the one place that holds the announcer in use and hands it out
  - A do-nothing announcer is in place from the start, so asking for an announcer never fails
  - Providing something that is not an announcer is refused and changes nothing
---

# Brief

When you press Play with the setup below, the desk holds the do-nothing announcer until a Level Blueprint provides a recording announcer, after which the desk holds that one; handing it something that is not an announcer is refused.

`IDojoP15Announcer` is the interface: one function, `Announce(Line)`. Three classes can stand behind it: `UDojoP15NullAnnouncer`, which drops every line and counts it, `UDojoP15RecordingAnnouncer`, which writes every line down, and whatever you provide later. `UDojoP15AnnouncerDesk` is a world subsystem: one exists in every game world, made by the engine, and it holds the announcer in use. `Locate` finds the desk of a world, `Get` hands out the announcer in place as the interface, and `GetProvider` names the object behind it.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `Provide`. Given a provider, it puts that object in place and returns true; given nullptr it puts the do-nothing announcer back and returns true; given an object that does not implement `IDojoP15Announcer` it returns false and leaves the desk as it was.

The desk depends on the interface only. The announcers know nothing about the desk, and the desk knows nothing about who will call it.

## See it in the editor

Open the Level Blueprint. On Begin Play, use Get World Subsystem with the class Dojo P15 Announcer Desk, call Get Provider on it, and print the result's display name: a Dojo P15 Null Announcer. Then call Provide with the result of Construct Object from Class (class Dojo P15 Recording Announcer, outer: the desk) and print the returned boolean: true. Call Get Provider again and print its display name: a Dojo P15 Recording Announcer. Finally call Provide with Get Player Controller (index 0), which is not an announcer, and print the boolean: false, and Get Provider still names the recording announcer.

# Files

## DojoP15Announcer.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "DojoP15Announcer.generated.h"

/** The reflected half of the announcer interface; it only exists so the engine can find the interface. */
UINTERFACE(MinimalAPI)
class UDojoP15Announcer : public UInterface
{
	GENERATED_BODY()
};

/** What anything that speaks a line for the dojo must offer; callers know this and nothing about the class behind it. */
class IDojoP15Announcer
{
	GENERATED_BODY()

public:
	/** Speaks Line in whatever way this announcer does. */
	virtual void Announce(const FString& Line) = 0;
};
```

## DojoP15NullAnnouncer.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP15Announcer.h"
#include "UObject/Object.h"
#include "DojoP15NullAnnouncer.generated.h"

/** The announcer that stands in when nobody has been provided: it takes every line and only counts it, so callers never meet a missing announcer. */
UCLASS()
class UDojoP15NullAnnouncer : public UObject, public IDojoP15Announcer
{
	GENERATED_BODY()

public:
	/** Counts Line and drops it. */
	virtual void Announce(const FString& Line) override;

	/** How many lines have been dropped. */
	int32 GetAbsorbedCount() const;

private:
	/** Lines dropped so far. */
	int32 AbsorbedCount = 0;
};
```

## DojoP15NullAnnouncer.cpp

```cpp
#include "DojoP15NullAnnouncer.h"

void UDojoP15NullAnnouncer::Announce(const FString& Line)
{
	AbsorbedCount++;
	UE_LOG(LogTemp, Verbose, TEXT("No announcer provided; dropped: %s"), *Line);
}

int32 UDojoP15NullAnnouncer::GetAbsorbedCount() const
{
	return AbsorbedCount;
}
```

## DojoP15RecordingAnnouncer.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP15Announcer.h"
#include "UObject/Object.h"
#include "DojoP15RecordingAnnouncer.generated.h"

/** An announcer that writes every line down instead of speaking it, so a test can read what was announced. */
UCLASS()
class UDojoP15RecordingAnnouncer : public UObject, public IDojoP15Announcer
{
	GENERATED_BODY()

public:
	/** Adds Line to the record. */
	virtual void Announce(const FString& Line) override;

	/** Every line announced so far, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Announcer")
	const TArray<FString>& GetLines() const;

private:
	/** The lines announced so far. */
	UPROPERTY()
	TArray<FString> Lines;
};
```

## DojoP15RecordingAnnouncer.cpp

```cpp
#include "DojoP15RecordingAnnouncer.h"

void UDojoP15RecordingAnnouncer::Announce(const FString& Line)
{
	Lines.Add(Line);
}

const TArray<FString>& UDojoP15RecordingAnnouncer::GetLines() const
{
	return Lines;
}
```

## DojoP15AnnouncerDesk.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP15Announcer.h"
#include "DojoP15NullAnnouncer.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP15AnnouncerDesk.generated.h"

/** One per world: holds the announcer that is currently provided and hands it to anyone who asks, so callers need no more than the interface. */
UCLASS()
class UDojoP15AnnouncerDesk : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** Makes the do-nothing announcer and provides it, so the desk is never empty. */
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	/** The desk of LevelWorld, or nullptr when there is no world. */
	static UDojoP15AnnouncerDesk* Locate(const UWorld* LevelWorld); // @explain: Callers find the desk through the world and never build one; the engine creates a world subsystem for every game world.

	/** Makes Provider the announcer; nullptr puts the do-nothing announcer back. Returns false, changing nothing, when Provider does not implement the announcer interface. */
	UFUNCTION(BlueprintCallable, Category = "Announcer")
	bool Provide(UObject* Provider);

	/** The announcer now in place, as the interface; never empty. */
	IDojoP15Announcer& Get() const; // @explain: The desk gives out the interface, so a caller can speak a line without knowing which class stands behind it.

	/** The object now in place, for code that must wrap or restore it. */
	UFUNCTION(BlueprintPure, Category = "Announcer")
	UObject* GetProvider() const;

	/** The do-nothing announcer this desk owns. */
	UDojoP15NullAnnouncer* GetNullAnnouncer() const;

private:
	/** The announcer in place; any object that implements the interface. */
	UPROPERTY()
	TObjectPtr<UObject> Current; // @explain: A UPROPERTY keeps the provider alive for the garbage collector, and the interface is found again with a cast each time it is needed.

	/** The do-nothing announcer, made once. */
	UPROPERTY()
	TObjectPtr<UDojoP15NullAnnouncer> Silent;
};
```

## DojoP15AnnouncerDesk.cpp

```cpp
#include "DojoP15AnnouncerDesk.h"

#include "Engine/World.h"

void UDojoP15AnnouncerDesk::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	Silent = NewObject<UDojoP15NullAnnouncer>(this); // @explain: A subsystem is not an actor, so it makes its helper object with NewObject and owns it; nothing outside can end its life.
	Current = Silent;
}

UDojoP15AnnouncerDesk* UDojoP15AnnouncerDesk::Locate(const UWorld* LevelWorld)
{
	return LevelWorld ? LevelWorld->GetSubsystem<UDojoP15AnnouncerDesk>() : nullptr;
}

bool UDojoP15AnnouncerDesk::Provide(UObject* Provider)
{
	return false;
}

IDojoP15Announcer& UDojoP15AnnouncerDesk::Get() const
{
	IDojoP15Announcer* Announcer = Cast<IDojoP15Announcer>(Current.Get());
	check(Announcer != nullptr);
	return *Announcer;
}

UObject* UDojoP15AnnouncerDesk::GetProvider() const
{
	return Current.Get();
}

UDojoP15NullAnnouncer* UDojoP15AnnouncerDesk::GetNullAnnouncer() const
{
	return Silent.Get();
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
#include "Support/DojoTestWorld.h"
#include "UObject/Package.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_AnnouncerDesk_NothingProvidedIsQuiet, "Dojo.P15.AnnouncerDesk.NothingProvidedIsQuiet", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Every world has a desk, it starts with the do-nothing announcer, and asking it to announce is safe and counted. */
bool FDojo_P15_AnnouncerDesk_NothingProvidedIsQuiet::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(TestWorld.GetWorld());
	if (!TestNotNull(TEXT("The world has a desk"), Desk)) return false;

	TestTrue(TEXT("Locating twice gives the same desk"), UDojoP15AnnouncerDesk::Locate(TestWorld.GetWorld()) == Desk);
	TestNull(TEXT("No world, no desk"), UDojoP15AnnouncerDesk::Locate(nullptr));
	TestNotNull(TEXT("The desk owns a do-nothing announcer"), Desk->GetNullAnnouncer());
	TestTrue(TEXT("It is the one in place"), Desk->GetProvider() == Desk->GetNullAnnouncer());

	Desk->Get().Announce(TEXT("Round one"));
	Desk->Get().Announce(TEXT("Round two"));
	TestEqual(TEXT("The do-nothing announcer counted both lines"), Desk->GetNullAnnouncer()->GetAbsorbedCount(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_AnnouncerDesk_ProvidedAnnouncerHearsEverything, "Dojo.P15.AnnouncerDesk.ProvidedAnnouncerHearsEverything", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A provided announcer takes over: it hears every line in order, and the do-nothing announcer hears none. */
bool FDojo_P15_AnnouncerDesk_ProvidedAnnouncerHearsEverything::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(TestWorld.GetWorld());
	if (!TestNotNull(TEXT("The world has a desk"), Desk)) return false;

	UDojoP15RecordingAnnouncer* Record = NewObject<UDojoP15RecordingAnnouncer>(GetTransientPackage());
	TestTrue(TEXT("Providing an announcer succeeds"), Desk->Provide(Record));
	TestTrue(TEXT("The desk now holds it"), Desk->GetProvider() == Record);

	Desk->Get().Announce(TEXT("Begin"));
	Desk->Get().Announce(TEXT("Hit"));
	Desk->Get().Announce(TEXT("End"));

	const TArray<FString> Expected = { TEXT("Begin"), TEXT("Hit"), TEXT("End") };
	TestTrue(TEXT("It heard all three lines in order"), Record->GetLines() == Expected);
	TestEqual(TEXT("The do-nothing announcer heard none"), Desk->GetNullAnnouncer()->GetAbsorbedCount(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P15_AnnouncerDesk_ReplacingAndResetting, "Dojo.P15.AnnouncerDesk.ReplacingAndResetting", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A second announcer replaces the first, nullptr puts the do-nothing announcer back, and an object that is not an announcer is refused. */
bool FDojo_P15_AnnouncerDesk_ReplacingAndResetting::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	UDojoP15AnnouncerDesk* Desk = UDojoP15AnnouncerDesk::Locate(TestWorld.GetWorld());
	if (!TestNotNull(TEXT("The world has a desk"), Desk)) return false;

	UDojoP15RecordingAnnouncer* First = NewObject<UDojoP15RecordingAnnouncer>(GetTransientPackage());
	UDojoP15RecordingAnnouncer* Second = NewObject<UDojoP15RecordingAnnouncer>(GetTransientPackage());

	Desk->Provide(First);
	Desk->Get().Announce(TEXT("One"));
	Desk->Provide(Second);
	Desk->Get().Announce(TEXT("Two"));
	TestEqual(TEXT("The first heard only the first line"), First->GetLines().Num(), 1);
	TestEqual(TEXT("The second heard only the second"), Second->GetLines().Num(), 1);

	TestTrue(TEXT("Providing nullptr succeeds"), Desk->Provide(nullptr));
	TestTrue(TEXT("It puts the do-nothing announcer back"), Desk->GetProvider() == Desk->GetNullAnnouncer());
	Desk->Get().Announce(TEXT("Three"));
	TestEqual(TEXT("And that announcer counts the line"), Desk->GetNullAnnouncer()->GetAbsorbedCount(), 1);

	Desk->Provide(First);
	UObject* NotAnAnnouncer = NewObject<UObject>(GetTransientPackage());
	TestFalse(TEXT("An object that is not an announcer is refused"), Desk->Provide(NotAnAnnouncer));
	TestTrue(TEXT("And the desk is unchanged"), Desk->GetProvider() == First);

	return true;
}

#endif
```

# Hints

- Three cases: no provider at all, an object that carries the announcer interface, and an object that does not. Which of them should change `Current`?
- `UObject::Implements<UDojoP15Announcer>()` asks whether an object implements the interface. The `U` class is the reflected half, not the `I` class.
- The do-nothing announcer is already made and stored in `Silent`; putting it back is one assignment.

# Rubric

- Provide with nullptr or a pointer that is no longer valid puts the do-nothing announcer back and returns true.
- Provide checks the object against the announcer interface before accepting it, and one that fails the check is refused with false and no change.
- A valid announcer becomes the one Get hands out, replacing the one before it, and the do-nothing announcer is left alone.
- Provide makes no announcer of its own, so the desk never depends on a concrete announcer class.
- The desk depends on the interface only, and an announcer knows nothing about the desk.

# Alternative

The desk could keep a `TScriptInterface<IDojoP15Announcer>` instead of a plain object pointer and a cast. That reads more clearly at the call site and cannot hold an object that fails the interface check, at the cost of one more type to learn; it is the usual choice once an interface is used in many places. Another option is to skip the desk and pass the announcer into every actor that needs it, which is the most honest about who depends on what, and costs a parameter in every constructor and every spawn.

# Parsons

```yaml
- id: provide
  prompt: Put Provide in order.
  lines:
    - "bool UDojoP15AnnouncerDesk::Provide(UObject* Provider)"
    - "{"
    - "	if (!IsValid(Provider))"
    - "	{"
    - "		Current = Silent;"
    - "		return true;"
    - "	}"
    - "	if (!Provider->Implements<UDojoP15Announcer>()) return false;"
    - "	Current = Provider;"
    - "	return true;"
    - "}"
  distractors:
    - line: "	Current = NewObject<UDojoP15RecordingAnnouncer>(this);"
      mistake: The desk would build a concrete announcer itself and ignore the one it was given, so it would depend on that class and nothing could replace it.
```
