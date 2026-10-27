---
id: p12-blade-copies
title: Three blades, each tuned like the first
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [prototype]
skills: [prototype, object-model]
terms: [spawn-template, spawnactor, tobjectptr, beginplay]
prerequisites: [p12-copy-the-tuned-one]
xp: 50
estimatedMinutes: 15
concepts:
  - A blade spawned the plain way starts from its class defaults, so it never has the numbers a designer tuned on a placed blade
  - Passing the tuned blade as the spawn template makes the new blade start from its property values
  - The tuned blade is a real actor, so it is parked out of play, and its copies are woken
  - The layer depends on the blade class and its numbers; the blade knows nothing about the layer
---

# Brief

When you press Play with the setup below, three blades appear at X 0, 300, and 600, each with Damage 40, Swing Speed 90, an Arm Delay of 2, and an orange glow, while the blade the designer tuned stays out of play.

`ADojoP12Blade` is a swinging blade with four numbers: `Damage`, `SwingSpeed`, `ArmDelay`, and `GlowColor`. Its defaults are 10, 45, 1, and white. `ADojoP12BladeLayer` lays blades into the hall. A designer places one blade, tunes it, and picks it as the layer's `TunedBlade`; every blade the layer lays must start from that tuned blade's numbers, not from the defaults, and must appear exactly where it is laid, wherever the tuned blade itself stands.

The tuned blade is a real actor in the world, so the layer parks it (hidden, no collision) and keeps it only as a source of numbers. The layer depends on the blade; the blade knows nothing about the layer.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `LayBlade`. It spawns a blade of the tuned blade's class at `Where`, starting from the tuned blade, wakes it, remembers it, and returns it; it returns nullptr when there is no tuned blade.

## See it in the editor

Place a `DojoP12Blade` anywhere in the level, a little way from where the layer will stand, and in Details set Damage 40, Swing Speed 90, Arm Delay 2, and a bright orange Glow Color. Place a `DojoP12BladeLayer` and pick the blade as its Tuned Blade. In the Level Blueprint, on Begin Play, call Lay Blade on the layer three times with Where set to (0, 0, 0), (300, 0, 0), and (600, 0, 0). Press Play, then press F8 to eject from the player. In the World Outliner, select one of the new blades: Damage 40, Swing Speed 90, Arm Delay 2, the orange glow, and Actor Hidden In Game unchecked. Select the blade you tuned: its values are unchanged and Actor Hidden In Game is checked.

# Files

## DojoP12Blade.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP12Blade.generated.h"

/** A swinging blade in the trial hall: a handful of numbers that decide how it hurts. */
UCLASS()
class ADojoP12Blade : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP12Blade();

	/** Damage one hit deals. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blade", meta = (ClampMin = "0.0"))
	float Damage = 10.f; // @explain: These defaults live in the class default object, so a blade spawned the plain way always starts from them.

	/** How fast the blade swings, in degrees per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blade", meta = (ClampMin = "0.0"))
	float SwingSpeed = 45.f;

	/** Seconds after the blade appears before it starts to hurt. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blade", meta = (ClampMin = "0.0"))
	float ArmDelay = 1.f;

	/** The color the blade glows. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Blade")
	FLinearColor GlowColor = FLinearColor::White;

	/** Takes the blade out of play: hidden, with no collision. */
	UFUNCTION(BlueprintCallable, Category = "Blade")
	void Park();

	/** Puts the blade back in play: shown, with collision. */
	UFUNCTION(BlueprintCallable, Category = "Blade")
	void Wake();

	/** True while the blade is hidden and has no collision. */
	UFUNCTION(BlueprintPure, Category = "Blade")
	bool IsParked() const;
};
```

## DojoP12Blade.cpp

```cpp
#include "DojoP12Blade.h"

#include "Components/SceneComponent.h"

ADojoP12Blade::ADojoP12Blade()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP12Blade::Park()
{
	SetActorHiddenInGame(true);
	SetActorEnableCollision(false);
}

void ADojoP12Blade::Wake()
{
	SetActorHiddenInGame(false);
	SetActorEnableCollision(true);
}

bool ADojoP12Blade::IsParked() const
{
	return IsHidden() && !GetActorEnableCollision();
}
```

## DojoP12BladeLayer.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP12Blade.h"
#include "GameFramework/Actor.h"
#include "DojoP12BladeLayer.generated.h"

/** Lays blades in the trial hall, each one starting from a blade a designer tuned by hand. */
UCLASS()
class ADojoP12BladeLayer : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP12BladeLayer();

	/** The blade every laid blade starts from; place one in the level and pick it here. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Layer")
	TObjectPtr<ADojoP12Blade> TunedBlade;

	/** Uses Blade as the tuned blade and parks it so it stays out of play. */
	UFUNCTION(BlueprintCallable, Category = "Layer")
	void SetTunedBlade(ADojoP12Blade* Blade);

	/** Lays a new blade at Where that starts with the tuned blade's numbers, awake and in play; nullptr when there is no tuned blade. */
	UFUNCTION(BlueprintCallable, Category = "Layer")
	ADojoP12Blade* LayBlade(const FVector& Where);

	/** How many blades have been laid. */
	UFUNCTION(BlueprintPure, Category = "Layer")
	int32 GetLaidCount() const;

	/** The Index-th laid blade, or nullptr when there is none. */
	UFUNCTION(BlueprintPure, Category = "Layer")
	ADojoP12Blade* GetLaidBlade(int32 Index) const;

protected:
	/** Parks the tuned blade that was picked in the Details panel. */
	virtual void BeginPlay() override;

private:
	/** Every blade laid so far. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP12Blade>> LaidBlades; // @explain: A UPROPERTY array keeps the laid blades referenced, so the garbage collector does not treat them as unused.
};
```

## DojoP12BladeLayer.cpp

```cpp
#include "DojoP12BladeLayer.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"

ADojoP12BladeLayer::ADojoP12BladeLayer()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP12BladeLayer::BeginPlay()
{
	Super::BeginPlay();

	SetTunedBlade(TunedBlade); // @explain: A blade picked in Details is a real actor in the level, so it is parked the moment play starts.
}

void ADojoP12BladeLayer::SetTunedBlade(ADojoP12Blade* Blade)
{
	TunedBlade = Blade;
	if (IsValid(TunedBlade)) TunedBlade->Park(); // @explain: Parking keeps the tuned blade out of play but still alive, so its numbers stay available to copy.
}

ADojoP12Blade* ADojoP12BladeLayer::LayBlade(const FVector& Where)
{
	return nullptr;
}

int32 ADojoP12BladeLayer::GetLaidCount() const
{
	return LaidBlades.Num();
}

ADojoP12Blade* ADojoP12BladeLayer::GetLaidBlade(int32 Index) const
{
	return LaidBlades.IsValidIndex(Index) ? LaidBlades[Index].Get() : nullptr;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/World.h"
#include "Quests/p12-blade-copies/DojoP12Blade.h"
#include "Quests/p12-blade-copies/DojoP12BladeLayer.h"
#include "Support/DojoTestWorld.h"

namespace DojoP12BladeTest
{
	/** The glow the tuned blade gets: a bright orange. */
	const FLinearColor TunedGlow(1.f, 0.4f, 0.f);

	/** Spawns a blade at Place tuned to Damage 40, Swing Speed 90, Arm Delay 2, and an orange glow. */
	ADojoP12Blade* SpawnTunedBlade(FDojoTestWorld& TestWorld, const FVector& Place)
	{
		ADojoP12Blade* Blade = TestWorld.GetWorld()->SpawnActor<ADojoP12Blade>(Place, FRotator::ZeroRotator);
		if (Blade)
		{
			Blade->Damage = 40.f;
			Blade->SwingSpeed = 90.f;
			Blade->ArmDelay = 2.f;
			Blade->GlowColor = TunedGlow;
		}
		return Blade;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P12_BladeCopies_CopiesCarryTheTuning, "Dojo.P12.BladeCopies.CopiesCarryTheTuning", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Three blades laid from a tuned one all carry its numbers and are separate actors. */
bool FDojo_P12_BladeCopies_CopiesCarryTheTuning::RunTest(const FString& Parameters)
{
	using namespace DojoP12BladeTest;

	FDojoTestWorld TestWorld;

	ADojoP12Blade* Tuned = SpawnTunedBlade(TestWorld, FVector(1000.f, 1000.f, 500.f));
	ADojoP12BladeLayer* Layer = TestWorld.SpawnActor<ADojoP12BladeLayer>();
	if (!TestNotNull(TEXT("Tuned blade spawned"), Tuned) || !TestNotNull(TEXT("Layer spawned"), Layer)) return false;

	Layer->SetTunedBlade(Tuned);
	for (int32 Index = 0; Index < 3; Index++) Layer->LayBlade(FVector(Index * 300.f, 0.f, 0.f));

	TestEqual(TEXT("Three blades laid"), Layer->GetLaidCount(), 3);
	for (int32 Index = 0; Index < 3; Index++)
	{
		const ADojoP12Blade* Laid = Layer->GetLaidBlade(Index);
		if (!TestNotNull(TEXT("A laid blade exists"), Laid)) return false;

		TestTrue(TEXT("It is a new actor, not the tuned blade"), Laid != Tuned);
		TestEqual(TEXT("Damage comes from the tuned blade"), Laid->Damage, 40.f);
		TestEqual(TEXT("Swing speed comes from the tuned blade"), Laid->SwingSpeed, 90.f);
		TestEqual(TEXT("Arm delay comes from the tuned blade"), Laid->ArmDelay, 2.f);
		TestEqual(TEXT("The glow comes from the tuned blade"), Laid->GlowColor, TunedGlow);
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P12_BladeCopies_CopiesStandWhereTheyAreLaid, "Dojo.P12.BladeCopies.CopiesStandWhereTheyAreLaid", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Each blade stands where it was laid, even though the tuned blade stands far from the origin. */
bool FDojo_P12_BladeCopies_CopiesStandWhereTheyAreLaid::RunTest(const FString& Parameters)
{
	using namespace DojoP12BladeTest;

	FDojoTestWorld TestWorld;

	ADojoP12Blade* Tuned = SpawnTunedBlade(TestWorld, FVector(1000.f, 1000.f, 500.f));
	ADojoP12BladeLayer* Layer = TestWorld.SpawnActor<ADojoP12BladeLayer>();
	if (!TestNotNull(TEXT("Tuned blade spawned"), Tuned) || !TestNotNull(TEXT("Layer spawned"), Layer)) return false;

	Layer->SetTunedBlade(Tuned);
	for (int32 Index = 0; Index < 3; Index++)
	{
		const ADojoP12Blade* Laid = Layer->LayBlade(FVector(Index * 300.f, 0.f, 0.f));
		if (!TestNotNull(TEXT("A blade is laid"), Laid)) return false;

		TestEqual(TEXT("It stands where it was laid, not offset by where the tuned blade stands"), Laid->GetActorLocation(), FVector(Index * 300.f, 0.f, 0.f), 0.5f);
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P12_BladeCopies_TunedStaysOutOfPlay, "Dojo.P12.BladeCopies.TunedStaysOutOfPlay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The tuned blade stays parked and where it was, the laid blades are awake, and a later edit to the tuned blade reaches only later blades. */
bool FDojo_P12_BladeCopies_TunedStaysOutOfPlay::RunTest(const FString& Parameters)
{
	using namespace DojoP12BladeTest;

	FDojoTestWorld TestWorld;

	ADojoP12Blade* Tuned = SpawnTunedBlade(TestWorld, FVector(1000.f, 1000.f, 500.f));
	ADojoP12BladeLayer* Layer = TestWorld.SpawnActor<ADojoP12BladeLayer>();
	if (!TestNotNull(TEXT("Tuned blade spawned"), Tuned) || !TestNotNull(TEXT("Layer spawned"), Layer)) return false;

	Layer->SetTunedBlade(Tuned);
	const ADojoP12Blade* First = Layer->LayBlade(FVector(0.f, 0.f, 0.f));
	if (!TestNotNull(TEXT("First blade laid"), First)) return false;

	TestTrue(TEXT("The tuned blade is parked"), Tuned->IsParked());
	TestTrue(TEXT("And has not moved"), Tuned->GetActorLocation().Equals(FVector(1000.f, 1000.f, 500.f), 0.5f));
	TestFalse(TEXT("A laid blade is not parked"), First->IsParked());
	TestFalse(TEXT("A laid blade is shown"), First->IsHidden());
	TestTrue(TEXT("A laid blade collides"), First->GetActorEnableCollision());

	Tuned->Damage = 60.f;
	const ADojoP12Blade* Second = Layer->LayBlade(FVector(300.f, 0.f, 0.f));
	if (!TestNotNull(TEXT("Second blade laid"), Second)) return false;

	TestEqual(TEXT("The blade laid before the edit keeps its damage"), First->Damage, 40.f);
	TestEqual(TEXT("The blade laid after the edit has the new damage"), Second->Damage, 60.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P12_BladeCopies_PlainSpawnsUseDefaults, "Dojo.P12.BladeCopies.PlainSpawnsUseDefaults", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Tuning one blade does not touch the class defaults, and a blade spawned the plain way still starts from them; with no tuned blade nothing is laid. */
bool FDojo_P12_BladeCopies_PlainSpawnsUseDefaults::RunTest(const FString& Parameters)
{
	using namespace DojoP12BladeTest;

	FDojoTestWorld TestWorld;

	ADojoP12Blade* Tuned = SpawnTunedBlade(TestWorld, FVector::ZeroVector);
	ADojoP12BladeLayer* Layer = TestWorld.SpawnActor<ADojoP12BladeLayer>();
	if (!TestNotNull(TEXT("Tuned blade spawned"), Tuned) || !TestNotNull(TEXT("Layer spawned"), Layer)) return false;

	TestNull(TEXT("With no tuned blade, nothing is laid"), Layer->LayBlade(FVector::ZeroVector));
	TestEqual(TEXT("And nothing is counted"), Layer->GetLaidCount(), 0);

	Layer->SetTunedBlade(Tuned);
	Layer->LayBlade(FVector(300.f, 0.f, 0.f));

	const ADojoP12Blade* Plain = TestWorld.SpawnActor<ADojoP12Blade>();
	if (!TestNotNull(TEXT("Plain blade spawned"), Plain)) return false;

	TestEqual(TEXT("A plain blade has the default damage"), Plain->Damage, 10.f);
	TestEqual(TEXT("The class default is unchanged"), GetDefault<ADojoP12Blade>()->Damage, 10.f);
	TestEqual(TEXT("The class default swing speed is unchanged"), GetDefault<ADojoP12Blade>()->SwingSpeed, 45.f);
	TestEqual(TEXT("One blade was laid"), Layer->GetLaidCount(), 1);

	return true;
}

#endif
```

# Hints

- `FActorSpawnParameters` has a field that names an actor to start from instead of the class defaults. Which world function takes those parameters, and which class does it need? The tuned blade knows its own class.
- A copy takes the template's property values, and that includes where its root component sits. If the tuned blade stands somewhere other than the origin, a copy can end up offset by that place from where you laid it. What can you do to the new blade after it exists?
- The tuned blade is parked, and parked is just two more property values. What does a copy of a parked blade start as?

# Rubric

- LayBlade spawns through `FActorSpawnParameters::Template` with the tuned blade, so a new blade starts with its numbers instead of the class defaults.
- It spawns the tuned blade's own class, so a Blueprint child of the blade works as a template too.
- The new blade appears exactly where it is laid, wherever the tuned blade stands; the tuned blade's own place is not copied into the result.
- The laid blade is awake and in play, the tuned blade stays parked, and a later edit to the tuned blade reaches only blades laid after it.
- It returns nullptr without a tuned blade, and every laid blade is counted and kept.
- The layer depends on the blade; the blade has no reference to the layer. Nothing writes to the class default object.

# Alternative

The layer could spawn a plain blade and copy the four numbers across one by one. That works today, and it is the smaller change, but the list of copied fields has to grow with the blade, and anything it forgets silently falls back to the default. A third way is a Blueprint child class per kind of blade, which suits kinds that stay forever and that designers want to find by name in the Content Browser; it costs an asset for each variation, where a template costs only one tuned actor.

# Parsons

```yaml
- id: lay-blade
  prompt: Put LayBlade in order.
  lines:
    - "ADojoP12Blade* ADojoP12BladeLayer::LayBlade(const FVector& Where)"
    - "{"
    - "	UWorld* LevelWorld = GetWorld();"
    - "	if (!LevelWorld || !IsValid(TunedBlade)) return nullptr;"
    - "	FActorSpawnParameters Parameters;"
    - "	Parameters.Template = TunedBlade;"
    - "	ADojoP12Blade* Laid = LevelWorld->SpawnActor<ADojoP12Blade>(TunedBlade->GetClass(), Where, FRotator::ZeroRotator, Parameters);"
    - "	if (!Laid) return nullptr;"
    - "	Laid->SetActorLocation(Where);"
    - "	Laid->Wake();"
    - "	LaidBlades.Add(Laid);"
    - "	return Laid;"
    - "}"
  distractors:
    - line: "	GetMutableDefault<ADojoP12Blade>()->Damage = TunedBlade->Damage;"
      mistake: This writes the tuned blade's damage into the class default object, so every blade spawned anywhere afterwards starts with it; the template carries the numbers to the copy without touching the class.
```
