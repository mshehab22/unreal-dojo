---
id: p19-firefly-meadow
title: Fireflies you can catch
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [data-locality]
skills: [data-locality, containers]
terms: [tarray, remove-at-swap, ustruct, fvector3f, tick, deltatime]
prerequisites: [p19-data-locality-card]
xp: 110
estimatedMinutes: 30
concepts:
  - Catchable fireflies are records in one packed array, with nothing dead for the loop to skip
  - Code outside the meadow names a firefly with a handle, and the handle must keep naming that firefly
  - A handle finds nothing once its firefly has been caught or has faded, even after new fireflies arrive
  - The step and the catch are given and stay as they are
  - The meadow's records stay small enough for its loop
---

# Brief

When you press Play with the setup below, the meadow lets four fireflies drift, a catch takes exactly the firefly it was asked for, and the others keep drifting where they were going.

`ADojoP19Meadow` holds catchable fireflies as `FDojoP19MeadowFly` records in one `UPROPERTY` array. Each frame its `Tick` calls the given `Step`: every firefly moves by its velocity and loses life, and every firefly whose life has run out is removed. `Catch` removes the firefly a handle names and returns true, or returns false when the handle names no firefly in the meadow. `IsAlive`, `GetPosition`, and `GetFireflyCount` read the meadow. All of that is given.

Yours are `AddFirefly`, `FindIndex`, and `RemoveFirefly`. `AddFirefly` puts a firefly in the meadow and returns an `FDojoP19FlyHandle` that names it. `FindIndex` returns where in the array the firefly a handle names is now, or `INDEX_NONE` when the meadow does not hold it. `RemoveFirefly` removes the firefly at an index and keeps the array packed: no gaps, every record in it a live firefly, and the order of the records does not matter. A handle finds its own firefly for as long as that firefly is in the meadow, and finds nothing once it has been caught or has faded, also after other fireflies have been added. You may add private members and fields to the records; `Step`, `Catch`, `IsAlive`, `GetPosition`, and `GetFireflyCount` stay as they are.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP19Meadow` and set Draw Debug to true in the Details panel. In the Level Blueprint, on Begin Play, call Add Firefly four times with spots 100 units apart along X, each with a velocity of 0, 0, 20 and a life of 30, and keep the four handles in a Dojo P19 Fly Handle array variable. Press Play: four points rise slowly. After a Delay of 2 seconds, call Catch with the last handle and print the answer: true, and one of the four points is gone. After another Delay of 1 second, call Catch with the same handle again and print the answer: false.

# Files

## DojoP19MeadowFly.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP19MeadowFly.generated.h"

/** One catchable firefly: where it is, where it is going, and how long it has left. */
USTRUCT()
struct FDojoP19MeadowFly
{
	GENERATED_BODY()

	/** Where the firefly is. */
	UPROPERTY()
	FVector3f Position = FVector3f::ZeroVector;

	/** Where it is going, in units per second. */
	UPROPERTY()
	FVector3f Velocity = FVector3f::ZeroVector;

	/** Seconds left before it fades. */
	UPROPERTY()
	float Life = 0.f;
};

/** Names one firefly in a meadow for code outside the meadow. */
USTRUCT(BlueprintType)
struct FDojoP19FlyHandle
{
	GENERATED_BODY()

	/** The meadow's name for the firefly; INDEX_NONE names none. */
	UPROPERTY(BlueprintReadOnly, Category = "Meadow")
	int32 Id = INDEX_NONE;
};
```

## DojoP19Meadow.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP19MeadowFly.h"
#include "DojoP19Meadow.generated.h"

/** A meadow of catchable fireflies: records in one packed array, named from outside by handles. */
UCLASS()
class ADojoP19Meadow : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and lets the meadow tick. */
	ADojoP19Meadow();

	/** Draws every firefly as a debug point while playing. */
	UPROPERTY(EditAnywhere, Category = "Meadow")
	bool bDrawDebug = false;

	/** Puts a firefly in the meadow and returns the handle that names it. */
	UFUNCTION(BlueprintCallable, Category = "Meadow")
	FDojoP19FlyHandle AddFirefly(FVector Where, FVector Velocity, float LifeSeconds);

	/** Removes the firefly Handle names; false when the meadow does not hold it. */
	UFUNCTION(BlueprintCallable, Category = "Meadow")
	bool Catch(FDojoP19FlyHandle Handle);

	/** True while the firefly Handle names is in the meadow. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	bool IsAlive(FDojoP19FlyHandle Handle) const;

	/** Where the firefly Handle names is, or zero when the meadow does not hold it. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	FVector GetPosition(FDojoP19FlyHandle Handle) const;

	/** How many fireflies are in the meadow. */
	UFUNCTION(BlueprintPure, Category = "Meadow")
	int32 GetFireflyCount() const;

	/** Moves every firefly, burns its life, and removes the ones that faded. */
	void Step(float DeltaSeconds);

	/** Steps the meadow by the frame's length and draws it when asked. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** Where in the array the firefly Handle names is now, or INDEX_NONE. */
	int32 FindIndex(FDojoP19FlyHandle Handle) const;

	/** Removes the firefly at Index, keeping the array packed. */
	void RemoveFirefly(int32 Index);

	/** Every firefly in the meadow, by value, with no gaps. */
	UPROPERTY()
	TArray<FDojoP19MeadowFly> Flies;
};
```

## DojoP19Meadow.cpp

```cpp
#include "DojoP19Meadow.h"

#include "Components/SceneComponent.h"
#include "DrawDebugHelpers.h"

ADojoP19Meadow::ADojoP19Meadow()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

FDojoP19FlyHandle ADojoP19Meadow::AddFirefly(FVector Where, FVector Velocity, float LifeSeconds)
{
	return FDojoP19FlyHandle();
}

bool ADojoP19Meadow::Catch(FDojoP19FlyHandle Handle)
{
	const int32 Index = FindIndex(Handle);
	if (Index == INDEX_NONE) return false;

	RemoveFirefly(Index);
	return true;
}

bool ADojoP19Meadow::IsAlive(FDojoP19FlyHandle Handle) const
{
	return FindIndex(Handle) != INDEX_NONE;
}

FVector ADojoP19Meadow::GetPosition(FDojoP19FlyHandle Handle) const
{
	const int32 Index = FindIndex(Handle);
	return Index == INDEX_NONE ? FVector::ZeroVector : FVector(Flies[Index].Position);
}

int32 ADojoP19Meadow::GetFireflyCount() const
{
	return Flies.Num();
}

void ADojoP19Meadow::Step(float DeltaSeconds)
{
	for (FDojoP19MeadowFly& Fly : Flies)
	{
		Fly.Position += Fly.Velocity * DeltaSeconds;
		Fly.Life -= DeltaSeconds;
	}

	for (int32 Index = Flies.Num() - 1; Index >= 0; --Index)
	{
		if (Flies[Index].Life <= 0.f) RemoveFirefly(Index);
	}
}

void ADojoP19Meadow::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Step(DeltaSeconds);

	if (!bDrawDebug) return;

	for (const FDojoP19MeadowFly& Fly : Flies)
	{
		DrawDebugPoint(GetWorld(), FVector(Fly.Position), 8.f, FColor::Yellow);
	}
}

int32 ADojoP19Meadow::FindIndex(FDojoP19FlyHandle Handle) const
{
	return INDEX_NONE;
}

void ADojoP19Meadow::RemoveFirefly(int32 Index)
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p19-firefly-meadow/DojoP19Meadow.h"
#include "Support/DojoTestWorld.h"

namespace DojoP19MeadowTest
{
	/** Spawns a meadow that only steps when a test tells it to. */
	ADojoP19Meadow* SpawnMeadow(FDojoTestWorld& TestWorld)
	{
		ADojoP19Meadow* Meadow = TestWorld.SpawnActor<ADojoP19Meadow>();
		if (Meadow) Meadow->SetActorTickEnabled(false);
		return Meadow;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Meadow_FirefliesDriftAndFade, "Dojo.P19.Meadow.FirefliesDriftAndFade", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Fireflies drift by their velocity, and the one whose life runs out first leaves the meadow while the other stays. */
bool FDojo_P19_Meadow_FirefliesDriftAndFade::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP19Meadow* Meadow = DojoP19MeadowTest::SpawnMeadow(TestWorld);
	if (!TestNotNull(TEXT("Meadow spawned"), Meadow)) return false;

	const FDojoP19FlyHandle Long = Meadow->AddFirefly(FVector(0.f, 0.f, 100.f), FVector(0.f, 0.f, 10.f), 2.f);
	const FDojoP19FlyHandle Short = Meadow->AddFirefly(FVector(100.f, 0.f, 100.f), FVector(100.f, 0.f, 0.f), 1.f);
	TestEqual(TEXT("Two fireflies are in the meadow"), Meadow->GetFireflyCount(), 2);
	TestTrue(TEXT("Each handle finds its firefly"), Meadow->IsAlive(Long) && Meadow->IsAlive(Short));

	Meadow->Step(0.5f);
	TestTrue(TEXT("The short-lived firefly drifted 50 units along X"), Meadow->GetPosition(Short).Equals(FVector(150.f, 0.f, 100.f), 0.01f));
	TestTrue(TEXT("The long-lived one rose 5 units"), Meadow->GetPosition(Long).Equals(FVector(0.f, 0.f, 105.f), 0.01f));

	Meadow->Step(0.6f);
	TestEqual(TEXT("After 1.1 seconds the short-lived firefly has faded"), Meadow->GetFireflyCount(), 1);
	TestFalse(TEXT("Its handle finds nothing"), Meadow->IsAlive(Short));
	TestTrue(TEXT("The long-lived one is still found"), Meadow->IsAlive(Long));
	TestTrue(TEXT("Where it drifted to"), Meadow->GetPosition(Long).Equals(FVector(0.f, 0.f, 111.f), 0.01f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Meadow_ACatchTakesOneFirefly, "Dojo.P19.Meadow.ACatchTakesOneFirefly", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Catching the newest of three fireflies takes it and only it; a second catch of it and a handle naming nothing are refused. */
bool FDojo_P19_Meadow_ACatchTakesOneFirefly::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP19Meadow* Meadow = DojoP19MeadowTest::SpawnMeadow(TestWorld);
	if (!TestNotNull(TEXT("Meadow spawned"), Meadow)) return false;

	const FDojoP19FlyHandle A = Meadow->AddFirefly(FVector(0.f, 0.f, 100.f), FVector::ZeroVector, 10.f);
	const FDojoP19FlyHandle B = Meadow->AddFirefly(FVector(100.f, 0.f, 100.f), FVector::ZeroVector, 10.f);
	const FDojoP19FlyHandle C = Meadow->AddFirefly(FVector(200.f, 0.f, 100.f), FVector::ZeroVector, 10.f);

	TestTrue(TEXT("Catching the newest firefly succeeds"), Meadow->Catch(C));
	TestEqual(TEXT("Two are left"), Meadow->GetFireflyCount(), 2);
	TestFalse(TEXT("The caught firefly's handle finds nothing"), Meadow->IsAlive(C));
	TestFalse(TEXT("Catching it again is refused"), Meadow->Catch(C));
	TestFalse(TEXT("A handle that names no firefly is refused"), Meadow->Catch(FDojoP19FlyHandle()));
	TestTrue(TEXT("The first is still where it was"), Meadow->GetPosition(A).Equals(FVector(0.f, 0.f, 100.f), 0.01f));
	TestTrue(TEXT("The second is still where it was"), Meadow->GetPosition(B).Equals(FVector(100.f, 0.f, 100.f), 0.01f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Meadow_EveryHandleKeepsItsFirefly, "Dojo.P19.Meadow.EveryHandleKeepsItsFirefly", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Four fireflies, and the first is caught: its handle finds nothing, even after a fifth arrives, and every other handle still finds its own firefly, also after another one fades. */
bool FDojo_P19_Meadow_EveryHandleKeepsItsFirefly::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP19Meadow* Meadow = DojoP19MeadowTest::SpawnMeadow(TestWorld);
	if (!TestNotNull(TEXT("Meadow spawned"), Meadow)) return false;

	const FDojoP19FlyHandle A = Meadow->AddFirefly(FVector(0.f, 0.f, 100.f), FVector::ZeroVector, 10.f);
	const FDojoP19FlyHandle B = Meadow->AddFirefly(FVector(100.f, 0.f, 100.f), FVector::ZeroVector, 1.f);
	const FDojoP19FlyHandle C = Meadow->AddFirefly(FVector(200.f, 0.f, 100.f), FVector::ZeroVector, 10.f);
	const FDojoP19FlyHandle D = Meadow->AddFirefly(FVector(300.f, 0.f, 100.f), FVector::ZeroVector, 10.f);

	TestTrue(TEXT("Catching the first firefly succeeds"), Meadow->Catch(A));
	TestFalse(TEXT("The first firefly's handle finds nothing once it is caught"), Meadow->IsAlive(A));
	TestTrue(TEXT("The fourth firefly's handle still finds it"), Meadow->IsAlive(D));
	TestTrue(TEXT("At the fourth firefly's own spot, 300 along X"), Meadow->GetPosition(D).Equals(FVector(300.f, 0.f, 100.f), 0.01f));
	TestTrue(TEXT("The second still at 100"), Meadow->GetPosition(B).Equals(FVector(100.f, 0.f, 100.f), 0.01f));
	TestTrue(TEXT("The third still at 200"), Meadow->GetPosition(C).Equals(FVector(200.f, 0.f, 100.f), 0.01f));

	const FDojoP19FlyHandle E = Meadow->AddFirefly(FVector(400.f, 0.f, 100.f), FVector::ZeroVector, 10.f);
	TestFalse(TEXT("A fifth firefly does not bring the first one's handle back"), Meadow->IsAlive(A));
	TestTrue(TEXT("The fifth is found at 400"), Meadow->GetPosition(E).Equals(FVector(400.f, 0.f, 100.f), 0.01f));

	Meadow->Step(1.5f);
	TestEqual(TEXT("The second firefly faded, leaving three"), Meadow->GetFireflyCount(), 3);
	TestFalse(TEXT("The faded firefly's handle finds nothing"), Meadow->IsAlive(B));
	TestTrue(TEXT("The third still at 200"), Meadow->GetPosition(C).Equals(FVector(200.f, 0.f, 100.f), 0.01f));
	TestTrue(TEXT("The fourth still at 300"), Meadow->GetPosition(D).Equals(FVector(300.f, 0.f, 100.f), 0.01f));
	TestTrue(TEXT("The fifth still at 400"), Meadow->GetPosition(E).Equals(FVector(400.f, 0.f, 100.f), 0.01f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Meadow_ABusyEveningStaysPacked, "Dojo.P19.Meadow.ABusyEveningStaysPacked", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A hundred fireflies with ten different lives: after 1.1 seconds the thirty shortest-lived have faded and seventy remain. */
bool FDojo_P19_Meadow_ABusyEveningStaysPacked::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP19Meadow* Meadow = DojoP19MeadowTest::SpawnMeadow(TestWorld);
	if (!TestNotNull(TEXT("Meadow spawned"), Meadow)) return false;

	for (int32 Index = 0; Index < 100; ++Index)
	{
		Meadow->AddFirefly(FVector(10.f * Index, 0.f, 100.f), FVector(0.f, 0.f, 5.f), 0.5f + 0.25f * (Index % 10));
	}
	TestEqual(TEXT("A hundred fireflies are in the meadow"), Meadow->GetFireflyCount(), 100);

	for (int32 Frame = 0; Frame < 11; ++Frame) Meadow->Step(0.1f);
	TestEqual(TEXT("The thirty with lives of 0.5, 0.75, and 1 second have faded, and seventy remain"), Meadow->GetFireflyCount(), 70);

	for (int32 Frame = 0; Frame < 30; ++Frame) Meadow->Step(0.1f);
	TestEqual(TEXT("After 4.1 seconds even the longest lives, 2.75 seconds, have run out, and none remain"), Meadow->GetFireflyCount(), 0);

	return true;
}

#endif
```

# Hints

- The failing test catches the first of four fireflies. Read its messages: which handle found nothing, and which found a firefly that was not its own?
- Keeping the array packed moved a record when you removed one from the middle. Which firefly moved, and what did its handle still say about where it was?
- A handle needs a name for its firefly that does not change when the firefly moves in the array; the meadow then needs a way from that name to where the firefly is now.

# Rubric

- AddFirefly puts a firefly in the meadow and returns a handle that names it.
- RemoveFirefly keeps the array packed: no gaps, and every record in it is a live firefly.
- A handle finds its own firefly for as long as that firefly is in the meadow.
- A handle finds nothing once its firefly is caught or has faded, also after other fireflies are added.
- Step, Catch, IsAlive, GetPosition, and GetFireflyCount are unchanged.
- The records the step walks stay small, with nothing in them that points elsewhere.

# Alternative

An index into a packed array is not a name: removing from the middle moves the last record into the gap, so the index of that record changes, and the index of the removed one now belongs to somebody else. A handle that stores the index works until the first removal and then quietly names the wrong firefly. A stable handle stores an ID that never changes, and the meadow keeps a table from each ID to the index where that firefly is now, updated whenever a record moves and cleared when it leaves. A table that only grows costs four bytes per firefly ever added; to reuse its slots, add a serial number to the handle and bump it whenever a slot is reused, so an old handle with the old number finds nothing. Mass Entity's `FMassEntityHandle` is exactly that, an index and a serial number. `TSparseArray` is another answer: its indices never move, but it leaves holes the loop has to skip, which is what packing was meant to avoid.

# Parsons

```yaml
- id: meadow-step
  prompt: "Put the given Step in order. First move every firefly and burn its life, moving before burning, then walk the array from the back and remove the faded ones."
  lines:
    - "void ADojoP19Meadow::Step(float DeltaSeconds)"
    - "{"
    - "	for (FDojoP19MeadowFly& Fly : Flies)"
    - "	{"
    - "		Fly.Position += Fly.Velocity * DeltaSeconds;"
    - "		Fly.Life -= DeltaSeconds;"
    - "	}"
    - "	for (int32 Index = Flies.Num() - 1; Index >= 0; --Index)"
    - "	{"
    - "		if (Flies[Index].Life <= 0.f) RemoveFirefly(Index);"
    - "	}"
    - "}"
  distractors:
    - line: "		Fly.Life -= 1.f;"
      mistake: Taking a whole second each step makes a firefly's life depend on the frame rate; subtract the step's own length, DeltaSeconds.
```
