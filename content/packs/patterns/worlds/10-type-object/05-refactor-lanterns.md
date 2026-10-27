---
id: p10-lantern-refactor
title: Forty lanterns tuned one at a time
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [type-object]
skills: [type-object, refactoring]
terms: [primary-data-asset, data-asset, cdo, editanywhere, tobjectptr]
prerequisites: [p10-quiver-kinds]
xp: 100
estimatedMinutes: 25
concepts:
  - Tuning numbers set on every placed actor are a kind hiding in plain sight
  - Moving them into a kind asset makes one edit reach every lantern of that kind
  - Per-lantern state, fuel left and lit, stays on the lantern
  - A lantern with no kind falls back to the kind class's default object
---

# Brief

When you press Play after the refactor, every lantern burns exactly as before: 30 seconds of fuel, its name in orange while lit and gray once out. What changed is where a designer tunes them: one DA_OilLantern asset instead of forty Details panels.

`ADojoP10Lantern` was written with its name, fuel time, and glow color as `EditAnywhere` properties on the lantern itself. The arena now has forty of them placed along the walls, in three looks, and a balance pass means selecting every lantern of a look and editing each one. Someone already created `UDojoP10LanternKind`, an empty primary data asset class, as the place for those numbers.

Refactor the lantern into a typed object:

- Move `DisplayName`, `FuelSeconds`, and `GlowColor` from the lantern into `UDojoP10LanternKind`, as `EditDefaultsOnly` properties with the same defaults.
- Give the lantern `UPROPERTY(EditAnywhere) TObjectPtr<const UDojoP10LanternKind> Kind;` and read every tuning number through it.
- A lantern whose Kind is empty uses the kind class's defaults through `GetDefault<UDojoP10LanternKind>()`, so lanterns placed before the refactor still burn for 30 seconds.
- Fuel left and lit stay on the lantern, and the public functions keep their names.

## See it in the editor

Before the refactor, place three `DojoP10Lantern` actors and change Fuel Seconds on one: the others do not follow. After it, make a Data Asset of Dojo P10 Lantern Kind called DA_OilLantern and point all three lanterns' Kind at it. Set Fuel Seconds to 5 in the asset and press Play: all three go out after five seconds. Clear one lantern's Kind: it burns for the default 30.

# Files

## DojoP10LanternKind.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DojoP10LanternKind.generated.h"

/** One kind of arena lantern as an asset. Empty for now: the lantern still keeps its own numbers. */
UCLASS(BlueprintType)
class UDojoP10LanternKind : public UPrimaryDataAsset
{
	GENERATED_BODY()
};
```

## DojoP10Lantern.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP10Lantern.generated.h"

class UTextRenderComponent;

/** One lantern on the arena wall, with every tuning number set on the lantern itself. */
UCLASS()
class ADojoP10Lantern : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and lets the lantern tick. */
	ADojoP10Lantern();

	/** Shows the lantern's name, lit or out. */
	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UTextRenderComponent> Label;

	/** The name shown above the lantern. */
	UPROPERTY(EditAnywhere, Category = "Lantern")
	FText DisplayName = FText::FromString(TEXT("Oil Lantern"));

	/** Seconds a full lantern burns. */
	UPROPERTY(EditAnywhere, Category = "Lantern", meta = (ClampMin = "0.1"))
	float FuelSeconds = 30.f;

	/** Color of the label while lit. */
	UPROPERTY(EditAnywhere, Category = "Lantern")
	FColor GlowColor = FColor::Orange;

	/** Lights the lantern if it has fuel; returns whether it is lit. */
	UFUNCTION(BlueprintCallable, Category = "Lantern")
	bool Light();

	/** Fills the fuel back to FuelSeconds. */
	UFUNCTION(BlueprintCallable, Category = "Lantern")
	void Refuel();

	/** True while burning. */
	UFUNCTION(BlueprintPure, Category = "Lantern")
	bool IsLit() const;

	/** Seconds of fuel left in this lantern. */
	UFUNCTION(BlueprintPure, Category = "Lantern")
	float GetFuelLeft() const;

	/** Burns fuel while lit and goes out when it runs dry. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Fills the lantern. */
	virtual void BeginPlay() override;

private:
	/** Shows the name, in the glow color while lit and gray while out. */
	void RefreshLabel();

	float FuelLeft = 0.f;

	bool bLit = false;
};
```

## DojoP10Lantern.cpp

```cpp
#include "DojoP10Lantern.h"

#include "Components/TextRenderComponent.h"

ADojoP10Lantern::ADojoP10Lantern()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP10Lantern::BeginPlay()
{
	Super::BeginPlay();

	Refuel();
}

bool ADojoP10Lantern::Light()
{
	if (FuelLeft > 0.f) bLit = true;

	RefreshLabel();
	return bLit;
}

void ADojoP10Lantern::Refuel()
{
	FuelLeft = FuelSeconds;
	RefreshLabel();
}

bool ADojoP10Lantern::IsLit() const
{
	return bLit;
}

float ADojoP10Lantern::GetFuelLeft() const
{
	return FuelLeft;
}

void ADojoP10Lantern::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bLit) return;

	FuelLeft = FMath::Max(0.f, FuelLeft - DeltaSeconds);
	if (FuelLeft > 0.f) return;

	bLit = false;
	RefreshLabel();
}

void ADojoP10Lantern::RefreshLabel()
{
	Label->SetText(DisplayName);
	Label->SetTextRenderColor(bLit ? GlowColor : FColor::Silver);
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/DataAsset.h"
#include "Engine/World.h"
#include "Quests/p10-lantern-refactor/DojoP10Lantern.h"
#include "Quests/p10-lantern-refactor/DojoP10LanternKind.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoP10LanternTest
{
	/** Ticks until the world's time reaches Seconds. */
	void TickUntil(FDojoTestWorld& TestWorld, float Seconds)
	{
		while (TestWorld.GetWorld()->GetTimeSeconds() < Seconds) TestWorld.Tick(1);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P10_LanternRefactor_BurnsOutAfterItsFuel, "Dojo.P10.LanternRefactor.BurnsOutAfterItsFuel", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A lantern burns 30 seconds, goes out, cannot relight empty, and relights after a refuel; unlit, it keeps its fuel. */
bool FDojo_P10_LanternRefactor_BurnsOutAfterItsFuel::RunTest(const FString& Parameters)
{
	using namespace DojoP10LanternTest;

	FDojoTestWorld TestWorld;

	ADojoP10Lantern* Lantern = TestWorld.SpawnActor<ADojoP10Lantern>();
	if (!TestNotNull(TEXT("Lantern spawned"), Lantern)) return false;

	const float Start = TestWorld.GetWorld()->GetTimeSeconds();
	TestEqual(TEXT("A new lantern is full"), Lantern->GetFuelLeft(), 30.f);
	TestWorld.Tick(120);
	TestEqual(TEXT("An unlit lantern burns nothing"), Lantern->GetFuelLeft(), 30.f);

	TestTrue(TEXT("It lights"), Lantern->Light());
	const float Lit = TestWorld.GetWorld()->GetTimeSeconds();
	TickUntil(TestWorld, Lit + 29.f);
	TestTrue(TEXT("Still lit at 29 seconds"), Lantern->IsLit());

	TickUntil(TestWorld, Lit + 30.5f);
	TestFalse(TEXT("Out at 30 seconds"), Lantern->IsLit());
	TestEqual(TEXT("With no fuel"), Lantern->GetFuelLeft(), 0.f);
	TestFalse(TEXT("An empty lantern does not light"), Lantern->Light());

	Lantern->Refuel();
	TestTrue(TEXT("A refuelled lantern lights"), Lantern->Light());
	TestTrue(TEXT("Time passed in the test"), TestWorld.GetWorld()->GetTimeSeconds() > Start);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P10_LanternRefactor_OneKindTunesEveryLantern, "Dojo.P10.LanternRefactor.OneKindTunesEveryLantern", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The lantern has a Kind property of the lantern kind class; two lanterns given a 5 second kind both burn out at 5 seconds. */
bool FDojo_P10_LanternRefactor_OneKindTunesEveryLantern::RunTest(const FString& Parameters)
{
	using namespace DojoP10LanternTest;

	FDojoTestWorld TestWorld;

	const FObjectPropertyBase* KindProperty = CastField<FObjectPropertyBase>(ADojoP10Lantern::StaticClass()->FindPropertyByName(TEXT("Kind")));
	if (!TestNotNull(TEXT("The lantern has an object property named Kind"), KindProperty)) return false;
	TestTrue(TEXT("Kind holds a lantern kind"), KindProperty->PropertyClass && KindProperty->PropertyClass->IsChildOf(UDojoP10LanternKind::StaticClass()));
	TestTrue(TEXT("The lantern kind is a primary data asset"), UDojoP10LanternKind::StaticClass()->IsChildOf(UPrimaryDataAsset::StaticClass()));

	UDojoP10LanternKind* Short = NewObject<UDojoP10LanternKind>();
	FProperty* FuelProperty = UDojoP10LanternKind::StaticClass()->FindPropertyByName(TEXT("FuelSeconds"));
	if (!TestNotNull(TEXT("The kind has FuelSeconds"), FuelProperty)) return false;
	*FuelProperty->ContainerPtrToValuePtr<float>(Short) = 5.f;

	TArray<ADojoP10Lantern*> Lanterns;
	for (int32 Index = 0; Index < 2; Index++)
	{
		ADojoP10Lantern* Lantern = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP10Lantern>(ADojoP10Lantern::StaticClass(), FTransform::Identity);
		KindProperty->SetObjectPropertyValue_InContainer(Lantern, Short);
		Lantern->FinishSpawning(FTransform::Identity);
		Lantern->Light();
		Lanterns.Add(Lantern);
	}

	TickUntil(TestWorld, TestWorld.GetWorld()->GetTimeSeconds() + 5.5f);
	TestFalse(TEXT("The first lantern burned out on its kind's fuel"), Lanterns[0]->IsLit());
	TestFalse(TEXT("And so did the second"), Lanterns[1]->IsLit());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P10_LanternRefactor_NoTuningOnTheLantern, "Dojo.P10.LanternRefactor.NoTuningOnTheLantern", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The lantern declares no editable number or color of its own; tuning lives on its kind. */
bool FDojo_P10_LanternRefactor_NoTuningOnTheLantern::RunTest(const FString& Parameters)
{
	for (TFieldIterator<FProperty> It(ADojoP10Lantern::StaticClass(), EFieldIteratorFlags::ExcludeSuper); It; ++It)
	{
		const bool bEditable = It->HasAnyPropertyFlags(CPF_Edit) && !It->HasAnyPropertyFlags(CPF_EditConst);
		const bool bTuning = It->IsA<FFloatProperty>() || It->IsA<FDoubleProperty>() || It->IsA<FIntProperty>() || It->IsA<FStructProperty>();
		TestFalse(FString::Printf(TEXT("%s is tuning; it belongs on the lantern kind"), *It->GetName()), bEditable && bTuning);
	}

	return true;
}

#endif
```

# Hints

- `BurnsOutAfterItsFuel` passes before and after; it is your safety net. The other two tests tell you the refactor is done: one looks for a `Kind` property of the kind class, the other for tuning still editable on the lantern.
- Add a small private helper on the lantern that returns `Kind` when set and `GetDefault<UDojoP10LanternKind>()` otherwise, and use it everywhere a number was read.
- The lantern's header can forward-declare the kind class; include its header in the lantern's source file.

# Rubric

- The kind class holds the name, the fuel time, and the glow color, with the old defaults.
- The lantern has a Kind property and no editable tuning of its own.
- Every tuning number is read through the kind, or through the kind class's defaults when Kind is empty.
- Fuel left and lit stay on each lantern; lanterns of one kind burn and go out independently.
- The public functions and the burn behavior are unchanged.

# Alternative

The tuning could move into a data table with a row per look, as the quivers did. Lanterns have few fields and three looks, so either works; an asset per look gives each kind its own Content Browser entry that other systems, such as a lighting pass, can reference directly. Another option leaves the numbers on the lantern and makes a Blueprint child per look that only changes defaults. That also gives one place per look to tune, but a lantern's look then can only change by replacing the actor with another class.
