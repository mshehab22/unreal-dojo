---
id: p19-ember-refactor
title: Embers without objects
order: 5
kind: refactor
scaffold: stub
difficulty: 4
patterns: [data-locality]
skills: [data-locality, refactoring]
terms: [hot-cold-split, uobject, newobject, fvector3f, reflection, tarray]
prerequisites: [p19-firefly-meadow]
xp: 110
estimatedMinutes: 30
concepts:
  - An ember that is only numbers does not need to be a UObject
  - The fields the step reads every frame go in small hot records, and the rest go in cold records at the same index
  - The two arrays change together, so the record at an index in one always belongs with the record at that index in the other
  - The arrays are UPROPERTYs, so the reflection system can see them and a test can check their layout
  - Every reading function and a single ember's life stay exactly as they were
---

# Brief

After the refactor, the fire basket keeps its embers as plain records in two arrays instead of one object each, the records its step reads every frame are no larger than 32 bytes, and every ember rises, cools, and is counted exactly as before.

`ADojoP19Brazier` is a fire basket. `Kindle` throws up one ember at a spot with a velocity and a kind such as Spark or Ash; an ember lives `EmberSeconds`, 3 by default. Each frame `Step` moves every ember by its velocity, cools it by the frame's length, and removes every ember with no heat left. `GetEmberCount`, `GetHighestEmberZ`, `GetTotalHeat`, `CountEmbersOfKind`, and `GetHighestZOfKind` read the embers.

Today every ember is a `UDojoP19Ember`, made with `NewObject` and held in a `UPROPERTY` array of object pointers. Each one carries its position and velocity as `FVector`s, its heat, and the kind and time it was kindled, which only the readers ever look at. A summer evening kindles thousands of embers, and every one is an object for the garbage collector and a pointer to follow in the step.

Refactor the embers into plain data:

- No ember is an object, and none of the brazier's own properties is an array of object pointers. The brazier keeps two `UPROPERTY` arrays of `USTRUCT` records, named `Hot` and `Cold`.
- A `Hot` record holds only what the step reads and writes every frame, and is no larger than 32 bytes. In UE 5 an `FVector` is three doubles, 24 bytes; `FVector3f` is three floats, 12 bytes.
- A `Cold` record holds the rest. The record at an index in `Cold` always belongs to the ember at that index in `Hot`, after every kindle and every removal.
- `Kindle`, `Step`, and every reading function keep their names and signatures, and each ember rises, cools, and is counted exactly as before.

Three of the five tests pass on the starter and must pass after; two do not. Read their messages.

## See it in the editor

Place a `DojoP19Brazier`. In the Level Blueprint, on Begin Play, use Set Timer by Event with a looping time of 0.1 seconds to call Kindle at the brazier's location with a velocity of 0, 0, 150 and the kind Spark, and on Event Tick print Get Ember Count. Press Play: the count climbs to about 30 and holds there, as embers cool as fast as they are kindled. Type `obj gc` in the console to collect the embers that already went out, then `obj list class=DojoP19Ember`: before the refactor it lists about 30 objects, one per ember still up, and after it the console says it does not recognize the class, because the class is gone.

# Files

## DojoP19Ember.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP19Ember.generated.h"

/** One ember from the fire basket: where it is, where it is going, how hot it is, and what kind it is. */
UCLASS()
class UDojoP19Ember : public UObject
{
	GENERATED_BODY()

public:
	/** Where the ember is. */
	UPROPERTY()
	FVector Position = FVector::ZeroVector;

	/** Where it is going, in units per second. */
	UPROPERTY()
	FVector Velocity = FVector::ZeroVector;

	/** Seconds of heat left. */
	UPROPERTY()
	float Heat = 0.f;

	/** What kind of ember it is, such as Spark or Ash. */
	UPROPERTY()
	FName Kind;

	/** When it was kindled, in world seconds. */
	UPROPERTY()
	double KindledAt = 0.0;
};
```

## DojoP19Brazier.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP19Brazier.generated.h"

class UDojoP19Ember;

/** A fire basket that throws up embers, which rise and cool until they go out. */
UCLASS()
class ADojoP19Brazier : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and lets the brazier tick. */
	ADojoP19Brazier();

	/** How long each ember lives. */
	UPROPERTY(EditAnywhere, Category = "Brazier", meta = (ClampMin = "0.1"))
	float EmberSeconds = 3.f;

	/** Throws up one ember at Where with Velocity. */
	UFUNCTION(BlueprintCallable, Category = "Brazier")
	void Kindle(FVector Where, FVector Velocity, FName Kind);

	/** How many embers are up. */
	UFUNCTION(BlueprintPure, Category = "Brazier")
	int32 GetEmberCount() const;

	/** The height of the highest ember, or 0 when none is up. */
	UFUNCTION(BlueprintPure, Category = "Brazier")
	float GetHighestEmberZ() const;

	/** The heat left in all embers together. */
	UFUNCTION(BlueprintPure, Category = "Brazier")
	float GetTotalHeat() const;

	/** How many embers of Kind are up. */
	UFUNCTION(BlueprintPure, Category = "Brazier")
	int32 CountEmbersOfKind(FName Kind) const;

	/** The height of the highest ember of Kind, or 0 when none is up. */
	UFUNCTION(BlueprintPure, Category = "Brazier")
	float GetHighestZOfKind(FName Kind) const;

	/** Moves and cools every ember by DeltaSeconds and removes the ones with no heat left. */
	void Step(float DeltaSeconds);

	/** Steps the embers by the frame's length. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** Every ember up now, one object each. */
	UPROPERTY()
	TArray<TObjectPtr<UDojoP19Ember>> Embers;
};
```

## DojoP19Brazier.cpp

```cpp
#include "DojoP19Brazier.h"

#include "Components/SceneComponent.h"
#include "DojoP19Ember.h"
#include "Engine/World.h"

ADojoP19Brazier::ADojoP19Brazier()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP19Brazier::Kindle(FVector Where, FVector Velocity, FName Kind)
{
	UDojoP19Ember* Ember = NewObject<UDojoP19Ember>(this);
	Ember->Position = Where;
	Ember->Velocity = Velocity;
	Ember->Heat = EmberSeconds;
	Ember->Kind = Kind;
	Ember->KindledAt = GetWorld()->GetTimeSeconds();
	Embers.Add(Ember);
}

int32 ADojoP19Brazier::GetEmberCount() const
{
	return Embers.Num();
}

float ADojoP19Brazier::GetHighestEmberZ() const
{
	float Highest = 0.f;
	bool bAny = false;
	for (const UDojoP19Ember* Ember : Embers)
	{
		if (!bAny || Ember->Position.Z > Highest) Highest = Ember->Position.Z;
		bAny = true;
	}
	return Highest;
}

float ADojoP19Brazier::GetTotalHeat() const
{
	float Total = 0.f;
	for (const UDojoP19Ember* Ember : Embers)
	{
		Total += Ember->Heat;
	}
	return Total;
}

int32 ADojoP19Brazier::CountEmbersOfKind(FName Kind) const
{
	int32 Count = 0;
	for (const UDojoP19Ember* Ember : Embers)
	{
		if (Ember->Kind == Kind) Count++;
	}
	return Count;
}

float ADojoP19Brazier::GetHighestZOfKind(FName Kind) const
{
	float Highest = 0.f;
	bool bAny = false;
	for (const UDojoP19Ember* Ember : Embers)
	{
		if (Ember->Kind != Kind) continue;
		if (!bAny || Ember->Position.Z > Highest) Highest = Ember->Position.Z;
		bAny = true;
	}
	return Highest;
}

void ADojoP19Brazier::Step(float DeltaSeconds)
{
	for (UDojoP19Ember* Ember : Embers)
	{
		Ember->Position += Ember->Velocity * DeltaSeconds;
		Ember->Heat -= DeltaSeconds;
	}

	for (int32 Index = Embers.Num() - 1; Index >= 0; --Index)
	{
		if (Embers[Index]->Heat <= 0.f) Embers.RemoveAt(Index);
	}
}

void ADojoP19Brazier::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Step(DeltaSeconds);
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p19-ember-refactor/DojoP19Brazier.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoP19EmberTest
{
	/** Spawns a brazier that only steps when a test tells it to. */
	ADojoP19Brazier* SpawnBrazier(FDojoTestWorld& TestWorld)
	{
		ADojoP19Brazier* Brazier = TestWorld.SpawnActor<ADojoP19Brazier>();
		if (Brazier) Brazier->SetActorTickEnabled(false);
		return Brazier;
	}

	/** How many elements the brazier's array property named Name holds, or INDEX_NONE when it has no such array. */
	int32 ArrayLength(ADojoP19Brazier* Brazier, FName Name)
	{
		const FArrayProperty* Array = FindFProperty<FArrayProperty>(ADojoP19Brazier::StaticClass(), Name);
		if (!Array) return INDEX_NONE;
		FScriptArrayHelper Helper(Array, Array->ContainerPtrToValuePtr<void>(Brazier));
		return Helper.Num();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Embers_EmbersRiseAndCool, "Dojo.P19.Embers.EmbersRiseAndCool", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Three embers rise by their velocities and cool by one second in a one second step. Passes before and after the refactor. */
bool FDojo_P19_Embers_EmbersRiseAndCool::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP19Brazier* Brazier = DojoP19EmberTest::SpawnBrazier(TestWorld);
	if (!TestNotNull(TEXT("Brazier spawned"), Brazier)) return false;

	Brazier->Kindle(FVector::ZeroVector, FVector(0.f, 0.f, 100.f), TEXT("Spark"));
	Brazier->Kindle(FVector::ZeroVector, FVector(0.f, 0.f, 200.f), TEXT("Spark"));
	Brazier->Kindle(FVector::ZeroVector, FVector(0.f, 0.f, 300.f), TEXT("Ash"));
	Brazier->Step(1.f);

	TestEqual(TEXT("Three embers are up"), Brazier->GetEmberCount(), 3);
	TestTrue(TEXT("The fastest rose to 300"), FMath::IsNearlyEqual(Brazier->GetHighestEmberZ(), 300.f, 0.01f));
	TestTrue(TEXT("Each has 2 of its 3 seconds of heat left, 6 in all"), FMath::IsNearlyEqual(Brazier->GetTotalHeat(), 6.f, 0.001f));
	TestEqual(TEXT("Two are Sparks"), Brazier->CountEmbersOfKind(TEXT("Spark")), 2);
	TestTrue(TEXT("The highest Spark is at 200"), FMath::IsNearlyEqual(Brazier->GetHighestZOfKind(TEXT("Spark")), 200.f, 0.01f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Embers_EachEmberKeepsItsKind, "Dojo.P19.Embers.EachEmberKeepsItsKind", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The first ember goes out while two later ones stay up: each survivor is still its own kind, at its own height. Passes before and after the refactor. */
bool FDojo_P19_Embers_EachEmberKeepsItsKind::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP19Brazier* Brazier = DojoP19EmberTest::SpawnBrazier(TestWorld);
	if (!TestNotNull(TEXT("Brazier spawned"), Brazier)) return false;

	Brazier->Kindle(FVector::ZeroVector, FVector(0.f, 0.f, 50.f), TEXT("Spark"));
	Brazier->Step(1.5f);
	Brazier->Kindle(FVector::ZeroVector, FVector(0.f, 0.f, 100.f), TEXT("Ash"));
	Brazier->Kindle(FVector::ZeroVector, FVector(0.f, 0.f, 300.f), TEXT("Cinder"));
	Brazier->Step(2.f);

	TestEqual(TEXT("The Spark went out after its 3 seconds; two embers are up"), Brazier->GetEmberCount(), 2);
	TestEqual(TEXT("No Spark is left"), Brazier->CountEmbersOfKind(TEXT("Spark")), 0);
	TestEqual(TEXT("One Ash is up"), Brazier->CountEmbersOfKind(TEXT("Ash")), 1);
	TestEqual(TEXT("One Cinder is up"), Brazier->CountEmbersOfKind(TEXT("Cinder")), 1);
	TestTrue(TEXT("The Ash is at its own height, 200"), FMath::IsNearlyEqual(Brazier->GetHighestZOfKind(TEXT("Ash")), 200.f, 0.01f));
	TestTrue(TEXT("The Cinder is at its own height, 600"), FMath::IsNearlyEqual(Brazier->GetHighestZOfKind(TEXT("Cinder")), 600.f, 0.01f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Embers_CooledEmbersGoOut, "Dojo.P19.Embers.CooledEmbersGoOut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Embers with no heat left are gone, and the readers report an empty brazier. Passes before and after the refactor. */
bool FDojo_P19_Embers_CooledEmbersGoOut::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP19Brazier* Brazier = DojoP19EmberTest::SpawnBrazier(TestWorld);
	if (!TestNotNull(TEXT("Brazier spawned"), Brazier)) return false;

	Brazier->Kindle(FVector::ZeroVector, FVector(0.f, 0.f, 100.f), TEXT("Spark"));
	Brazier->Kindle(FVector::ZeroVector, FVector(0.f, 0.f, 100.f), TEXT("Ash"));
	Brazier->Step(3.1f);

	TestEqual(TEXT("Both went out"), Brazier->GetEmberCount(), 0);
	TestEqual(TEXT("No heat is left"), Brazier->GetTotalHeat(), 0.f);
	TestEqual(TEXT("The highest ember of none is at 0"), Brazier->GetHighestEmberZ(), 0.f);
	TestEqual(TEXT("No Ash is counted"), Brazier->CountEmbersOfKind(TEXT("Ash")), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Embers_NoObjectPerEmber, "Dojo.P19.Embers.NoObjectPerEmber", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The brazier's own properties include no array of object pointers, so no ember is an object. Fails on the starter. */
bool FDojo_P19_Embers_NoObjectPerEmber::RunTest(const FString& Parameters)
{
	// Only the brazier's own properties: AActor, its parent, has object pointer arrays of its own, such as its components.
	for (TFieldIterator<FArrayProperty> Array(ADojoP19Brazier::StaticClass(), EFieldIterationFlags::None); Array; ++Array)
	{
		TestFalse(FString::Printf(TEXT("The array %s holds no object pointers, so no ember is an object"), *Array->GetName()), Array->Inner->IsA<FObjectPropertyBase>());
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Embers_HotRecordsStaySmall, "Dojo.P19.Embers.HotRecordsStaySmall", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The brazier has a Hot array of records no larger than 32 bytes and a Cold array of records, and both always hold one record per ember. Fails on the starter. */
bool FDojo_P19_Embers_HotRecordsStaySmall::RunTest(const FString& Parameters)
{
	using namespace DojoP19EmberTest;

	const FArrayProperty* Hot = FindFProperty<FArrayProperty>(ADojoP19Brazier::StaticClass(), TEXT("Hot"));
	const FArrayProperty* Cold = FindFProperty<FArrayProperty>(ADojoP19Brazier::StaticClass(), TEXT("Cold"));
	if (!TestNotNull(TEXT("The brazier has a UPROPERTY array named Hot"), Hot) || !TestNotNull(TEXT("The brazier has a UPROPERTY array named Cold"), Cold)) return false;

	const FStructProperty* HotRecord = CastField<FStructProperty>(Hot->Inner);
	if (!TestNotNull(TEXT("Hot holds struct records"), HotRecord)) return false;
	const int32 HotBytes = HotRecord->Struct->GetStructureSize();
	TestTrue(FString::Printf(TEXT("A hot record is no larger than 32 bytes; it is %d"), HotBytes), HotBytes <= 32);
	TestNotNull(TEXT("Cold holds struct records"), CastField<FStructProperty>(Cold->Inner));

	FDojoTestWorld TestWorld;
	ADojoP19Brazier* Brazier = SpawnBrazier(TestWorld);
	if (!TestNotNull(TEXT("Brazier spawned"), Brazier)) return false;

	for (int32 Index = 0; Index < 5; ++Index) Brazier->Kindle(FVector::ZeroVector, FVector(0.f, 0.f, 100.f), TEXT("Spark"));
	TestEqual(TEXT("Five kindled embers make five hot records"), ArrayLength(Brazier, TEXT("Hot")), 5);
	TestEqual(TEXT("And five cold records"), ArrayLength(Brazier, TEXT("Cold")), 5);

	Brazier->Step(2.f);
	for (int32 Index = 0; Index < 2; ++Index) Brazier->Kindle(FVector::ZeroVector, FVector(0.f, 0.f, 100.f), TEXT("Ash"));
	Brazier->Step(1.5f);
	TestEqual(TEXT("The five first embers went out, leaving two"), Brazier->GetEmberCount(), 2);
	TestEqual(TEXT("Two hot records"), ArrayLength(Brazier, TEXT("Hot")), 2);
	TestEqual(TEXT("And two cold records, removed together with the hot ones"), ArrayLength(Brazier, TEXT("Cold")), 2);

	return true;
}

#endif
```

# Hints

- The two failing tests read the brazier's own layout through the reflection system. Read their messages: which array holds objects, and which arrays does the test look for?
- A position and a velocity as two `FVector`s are already 48 bytes. Which vector type keeps them, with the heat, inside 32?
- Every kindle adds to both arrays and every removal takes from both at the same index. Which test fails if one of the two arrays is removed from differently?

# Rubric

- No ember is an object: the brazier keeps two UPROPERTY arrays of USTRUCT records, Hot and Cold, and no array of object pointers.
- A Hot record holds only what the step reads and writes, and is no larger than 32 bytes.
- A Cold record holds the kind and the kindling time, and the record at each index in Cold belongs to the ember at that index in Hot after every kindle and every removal.
- The step's moving loop reads only the Hot array.
- Kindle, Step, and every reading function keep their names and signatures, and each ember rises, cools, and is counted exactly as before.
- The brazier depends on its records; the records point at nothing.

# Alternative

The cold records could live in a `TMap` keyed by an ember ID instead of a second array at the same index. That is easier to keep correct when embers are removed in many places, but every reader then pays a lookup, and the IDs need the same care as the meadow's handles. With one place that removes embers, two arrays changed together are simpler and faster. If even the cold data were never read by gameplay, it could go away entirely; the kind is kept because the readers need it. And if a fire basket only ever shows its embers and nothing reads them, a Niagara system is the better home for them than any array of your own.
