---
id: p10-weapon-kinds
title: One weapon class and a kind asset per weapon
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [type-object]
skills: [type-object, object-model]
terms: [data-asset, primary-data-asset, tobjectptr, editanywhere, spawnactor]
prerequisites: [p10-a-class-per-weapon]
xp: 50
estimatedMinutes: 15
concepts:
  - A weapon kind is a primary data asset holding the numbers every weapon of that kind shares
  - A weapon points at its kind and keeps only its own durability
  - Shared numbers are read through the kind each time, so retuning the kind reaches every weapon of it
---

# Brief

When you press Play with the setup below, the label above each spear reads Training Spear, and `ke * Swing` three times deals 20, 20, and then 10 as the spear wears.

The armory now has one weapon class, `ADojoP10Weapon`, and one kind class, `UDojoP10WeaponKind`, a primary data asset. A kind holds what every weapon of that kind shares: its name, its damage, the durability a new one starts with, how much each swing wears it, and how worn it must be before its damage drops. A weapon points at its kind and keeps one number of its own, its durability, which starts at the kind's `MaxDurability`.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `Swing`. A weapon with no kind, or with no durability left, deals nothing. Otherwise it deals the kind's damage, scaled by the kind's `WornDamageScale` if the weapon is worn before this swing, and then loses the kind's `WearPerSwing`, never below zero. Read every number from the kind at the moment you need it.

## See it in the editor

In the Content Browser, right-click, choose Miscellaneous, Data Asset, pick Dojo P10 Weapon Kind, and name it DA_TrainingSpear. Open it and set Damage 20, Max Durability 30, and Wear Per Swing 10. Place two `DojoP10Weapon` actors and set Kind to DA_TrainingSpear on both. Press Play: both labels read Training Spear. Run `ke * Swing` three times and watch both wear together, because `ke *` swings every weapon. Stop, open DA_TrainingSpear, set Damage to 40, press Play again: both spears hit for 40, and no code changed.

# Files

## DojoP10WeaponKind.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DojoP10WeaponKind.generated.h"

/** One kind of arena weapon as an asset: the numbers every weapon of this kind shares. Type Object pattern. */
UCLASS(BlueprintType)
class UDojoP10WeaponKind : public UPrimaryDataAsset // @explain: A primary data asset class is a kind: designers make one asset of it per kind in the Content Browser, and the Asset Manager can find and load them by id.
{
	GENERATED_BODY()

public:
	/** The name shown above weapons of this kind. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon Kind")
	FText DisplayName = FText::FromString(TEXT("Practice Sword"));

	/** Damage of one swing while the weapon is in good condition. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon Kind", meta = (ClampMin = "0.0"))
	float Damage = 10.f;

	/** Durability a new weapon of this kind starts with. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon Kind", meta = (ClampMin = "1.0"))
	float MaxDurability = 100.f;

	/** Durability each swing costs. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon Kind", meta = (ClampMin = "0.0"))
	float WearPerSwing = 10.f;

	/** At or below this share of MaxDurability the weapon is worn. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon Kind", meta = (ClampMin = "0.0", ClampMax = "1.0"))
	float WornBelowShare = 0.5f;

	/** Damage is multiplied by this while the weapon is worn. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon Kind", meta = (ClampMin = "0.0", ClampMax = "1.0"))
	float WornDamageScale = 0.5f;
};
```

## DojoP10Weapon.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP10Weapon.generated.h"

class UDojoP10WeaponKind;
class UTextRenderComponent;

/** One weapon in the arena: its own durability, and everything else read from its kind. Type Object pattern. */
UCLASS()
class ADojoP10Weapon : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP10Weapon();

	/** Shows the kind's name, or "No kind". */
	UPROPERTY(VisibleAnywhere, Category = "Weapon")
	TObjectPtr<UTextRenderComponent> Label;

	/** What kind of weapon this is; shared with every weapon of the same kind. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Weapon")
	TObjectPtr<const UDojoP10WeaponKind> Kind; // @explain: Every spear points at the same Training Spear asset; const says a weapon only reads its kind and never changes it.

	/** Swings once and returns the damage dealt: the kind's damage, scaled down while worn, and nothing once broken or without a kind. Each swing wears this weapon only. */
	UFUNCTION(BlueprintCallable, Category = "Weapon")
	float Swing();

	/** Durability left on this weapon. */
	UFUNCTION(BlueprintPure, Category = "Weapon")
	float GetDurability() const;

	/** True at or below the kind's worn share of its MaxDurability. */
	UFUNCTION(BlueprintPure, Category = "Weapon")
	bool IsWorn() const;

protected:
	/** Starts this weapon at its kind's MaxDurability and shows the kind's name. */
	virtual void BeginPlay() override;

private:
	/** This weapon's own durability; the only number that is not the kind's. */
	float Durability = 0.f; // @explain: The one number that is this weapon's own, because two spears of one kind wear at different rates.
};
```

## DojoP10Weapon.cpp

```cpp
#include "DojoP10Weapon.h"

#include "Components/TextRenderComponent.h"
#include "DojoP10WeaponKind.h"

ADojoP10Weapon::ADojoP10Weapon()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP10Weapon::BeginPlay()
{
	Super::BeginPlay();

	Durability = Kind ? Kind->MaxDurability : 0.f; // @explain: The kind supplies the starting value; from here on the durability belongs to this weapon.
	Label->SetText(Kind ? Kind->DisplayName : FText::FromString(TEXT("No kind")));
}

float ADojoP10Weapon::Swing()
{
	return 0.f;
}

float ADojoP10Weapon::GetDurability() const
{
	return Durability;
}

bool ADojoP10Weapon::IsWorn() const
{
	return Kind && Durability <= Kind->MaxDurability * Kind->WornBelowShare;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Quests/p10-weapon-kinds/DojoP10Weapon.h"
#include "Quests/p10-weapon-kinds/DojoP10WeaponKind.h"
#include "Support/DojoTestWorld.h"

namespace DojoP10WeaponTest
{
	/** A short-lived kind: 20 damage, 30 durability, 10 wear a swing, worn at half, worn swings at half damage. */
	UDojoP10WeaponKind* MakeTrainingSpear()
	{
		UDojoP10WeaponKind* Kind = NewObject<UDojoP10WeaponKind>();
		Kind->DisplayName = FText::FromString(TEXT("Training Spear"));
		Kind->Damage = 20.f;
		Kind->MaxDurability = 30.f;
		Kind->WearPerSwing = 10.f;
		Kind->WornBelowShare = 0.5f;
		Kind->WornDamageScale = 0.5f;
		return Kind;
	}

	/** Spawns a weapon with Kind set before its BeginPlay. */
	ADojoP10Weapon* SpawnWeapon(FDojoTestWorld& TestWorld, const UDojoP10WeaponKind* Kind)
	{
		ADojoP10Weapon* Weapon = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP10Weapon>(ADojoP10Weapon::StaticClass(), FTransform::Identity);
		Weapon->Kind = Kind;
		Weapon->FinishSpawning(FTransform::Identity);
		return Weapon;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P10_WeaponKinds_SwingsWearTheWeapon, "Dojo.P10.WeaponKinds.SwingsWearTheWeapon", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A spear deals full damage, then half once worn, then nothing once broken; the label shows its kind's name. */
bool FDojo_P10_WeaponKinds_SwingsWearTheWeapon::RunTest(const FString& Parameters)
{
	using namespace DojoP10WeaponTest;

	FDojoTestWorld TestWorld;

	ADojoP10Weapon* Spear = SpawnWeapon(TestWorld, MakeTrainingSpear());
	if (!TestNotNull(TEXT("Spear spawned"), Spear)) return false;

	TestEqual(TEXT("The label shows the kind's name"), Spear->Label->Text.ToString(), FString(TEXT("Training Spear")));
	TestEqual(TEXT("A new spear has the kind's durability"), Spear->GetDurability(), 30.f);

	TestEqual(TEXT("First swing: full damage"), Spear->Swing(), 20.f);
	TestEqual(TEXT("Second swing: still full"), Spear->Swing(), 20.f);
	TestTrue(TEXT("At 10 of 30 the spear is worn"), Spear->IsWorn());
	TestEqual(TEXT("Third swing: worn, half damage"), Spear->Swing(), 10.f);
	TestEqual(TEXT("The spear is broken"), Spear->GetDurability(), 0.f);
	TestEqual(TEXT("A broken spear deals nothing"), Spear->Swing(), 0.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P10_WeaponKinds_OneKindManyWeapons, "Dojo.P10.WeaponKinds.OneKindManyWeapons", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two spears share one kind: wear stays with each spear, and retuning the kind reaches both. */
bool FDojo_P10_WeaponKinds_OneKindManyWeapons::RunTest(const FString& Parameters)
{
	using namespace DojoP10WeaponTest;

	FDojoTestWorld TestWorld;

	UDojoP10WeaponKind* Kind = MakeTrainingSpear();
	ADojoP10Weapon* First = SpawnWeapon(TestWorld, Kind);
	ADojoP10Weapon* Second = SpawnWeapon(TestWorld, Kind);
	if (!TestNotNull(TEXT("First spawned"), First) || !TestNotNull(TEXT("Second spawned"), Second)) return false;

	First->Swing();
	First->Swing();
	TestEqual(TEXT("The first spear wore down"), First->GetDurability(), 10.f);
	TestEqual(TEXT("The second spear did not"), Second->GetDurability(), 30.f);
	TestEqual(TEXT("And the kind did not"), Kind->MaxDurability, 30.f);

	Kind->Damage = 40.f;
	TestEqual(TEXT("A retuned kind reaches a fresh spear"), Second->Swing(), 40.f);
	TestEqual(TEXT("And a worn one, scaled"), First->Swing(), 20.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P10_WeaponKinds_NoKindNoSwing, "Dojo.P10.WeaponKinds.NoKindNoSwing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A weapon with no kind says so and deals nothing; the kind class is a primary data asset. */
bool FDojo_P10_WeaponKinds_NoKindNoSwing::RunTest(const FString& Parameters)
{
	using namespace DojoP10WeaponTest;

	FDojoTestWorld TestWorld;

	ADojoP10Weapon* Weapon = SpawnWeapon(TestWorld, nullptr);
	if (!TestNotNull(TEXT("Weapon spawned"), Weapon)) return false;

	TestEqual(TEXT("The label says it has no kind"), Weapon->Label->Text.ToString(), FString(TEXT("No kind")));
	TestEqual(TEXT("A weapon with no kind deals nothing"), Weapon->Swing(), 0.f);
	TestTrue(TEXT("Weapon kinds are primary data assets"), UDojoP10WeaponKind::StaticClass()->IsChildOf(UPrimaryDataAsset::StaticClass()));

	return true;
}

#endif
```

# Hints

- Guard first: no kind, or no durability left, returns zero before anything else happens.
- Decide the damage before you take the wear. The swing that makes the spear worn still hits at full damage; the next one does not.
- Durability is the weapon's; everything else is `Kind->` something. Do not copy the kind's numbers into the weapon.

# Rubric

- Swing deals nothing without a kind or without durability left.
- Swing deals the kind's damage, scaled by the kind's worn scale when the weapon is worn before the swing, and then wears the weapon by the kind's wear, never below zero.
- Every shared number is read through the kind when it is needed; the weapon keeps only its durability.
- A swing never changes the kind.
- Two weapons of one kind wear separately, and retuning the kind reaches both.

# Alternative

Each kind could be a Blueprint child of the weapon class that only changes default values, BP_TrainingSpear and so on. The engine then keeps one default object per Blueprint class, which works as a kind. It costs a class per kind, a Blueprint compile per change, and a kind cannot be swapped on a weapon that already exists. Data assets keep kinds as plain data that many systems can read, such as a shop listing every weapon kind without spawning one. Blueprint children are the better fit once kinds need their own behavior, which the when-not quest covers.

# Parsons

```yaml
- id: swing
  prompt: Put Swing in order.
  lines:
    - "float ADojoP10Weapon::Swing()"
    - "{"
    - "	if (!Kind || Durability <= 0.f) return 0.f;"
    - "	const float Dealt = IsWorn() ? Kind->Damage * Kind->WornDamageScale : Kind->Damage;"
    - "	Durability = FMath::Max(0.f, Durability - Kind->WearPerSwing);"
    - "	return Dealt;"
    - "}"
  distractors:
    - line: "	const_cast<UDojoP10WeaponKind*>(Kind.Get())->MaxDurability -= Kind->WearPerSwing;"
      mistake: Wearing the kind wears every weapon of that kind at once, and in the editor the loaded asset stays changed after play stops.
```
