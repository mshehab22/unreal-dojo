---
id: f6-weapon-data
title: A blaster that reads its weapon from a data asset
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: []
skills: [data]
terms: [data-asset, tsoftobjectptr, uproperty, blueprintcallable]
prerequisites: [f6-data-assets]
xp: 50
estimatedMinutes: 12
concepts:
  - The numbers live in an asset; the class only reads them
  - Swapping the asset changes the behavior without a rebuild
---

# Brief

When you make two weapon data assets in the Content Browser, a pistol and a rifle, and drop either one onto a blaster's Weapon slot, the blaster fires with that weapon's damage and clip size, and editing an asset's numbers changes the blaster the next time it fires, with no code change and no rebuild.

Most of the code is written for you. Explain the marked lines, then fill the two gaps in `DojoF6Blaster.cpp`:

1. `Fire`: with no weapon or an empty clip, fire nothing and return 0; otherwise use one shot and return the weapon's damage.
2. `SetWeapon`: take the new weapon and fill the clip for it.

The blaster never copies the weapon's numbers into its own variables; it reads them from the asset each time. That is what lets one asset drive every blaster that holds it.

## See it in the editor

In the Content Browser, right-click, choose Miscellaneous, then Data Asset, and pick Dojo F6 Weapon Data. Make DA_Pistol (damage 1, clip 6) and DA_Rifle (damage 3, clip 4), and give each a mesh from the engine's basic shapes. Place a `DojoF6Blaster`, set its Weapon to DA_Pistol, press Play, eject with F8, and run `ke * Fire` seven times: the seventh returns nothing. Change DA_Pistol's damage while playing and fire again: the new number is used at once.

# Files

## DojoF6WeaponData.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DojoF6WeaponData.generated.h"

class UStaticMesh;

/** One weapon's numbers and look, kept in an asset so designers make and balance weapons without touching code. */
UCLASS(BlueprintType) // @explain: BlueprintType lets Blueprints hold and read these assets too.
class UDojoF6WeaponData : public UDataAsset
{
	GENERATED_BODY()

public:
	/** The name shown to the player. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Weapon")
	FText DisplayName;

	/** Damage dealt by one shot. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Weapon", meta = (ClampMin = "0.0"))
	float Damage = 1.f;

	/** Shots in a full clip. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Weapon", meta = (ClampMin = "1"))
	int32 ClipSize = 6;

	/** The weapon's mesh, held by path so it loads only when something shows it. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Weapon")
	TSoftObjectPtr<UStaticMesh> Mesh; // @explain: A soft reference, so loading the weapon asset does not drag its mesh into memory with it.
};
```

## DojoF6Blaster.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF6Blaster.generated.h"

class UDojoF6WeaponData;

/** Fires with whatever weapon asset it is given; every number it uses comes from that asset. */
UCLASS()
class ADojoF6Blaster : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoF6Blaster();

	/** The weapon asset this blaster fires with. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Blaster")
	TObjectPtr<UDojoF6WeaponData> Weapon; // @explain: A hard reference: whatever holds the blaster keeps the weapon asset loaded, which is right because it is needed every shot.

	/** Fires one shot and returns its damage; returns 0 with no weapon or an empty clip. */
	UFUNCTION(BlueprintCallable, Category = "Blaster")
	float Fire();

	/** Fills the clip to the weapon's clip size. */
	UFUNCTION(BlueprintCallable, Category = "Blaster")
	void Reload();

	/** Switches to another weapon asset and fills the clip for it. */
	UFUNCTION(BlueprintCallable, Category = "Blaster")
	void SetWeapon(UDojoF6WeaponData* NewWeapon);

	/** Shots left in the clip. */
	UFUNCTION(BlueprintPure, Category = "Blaster")
	int32 GetAmmo() const;

protected:
	/** Fills the clip for the weapon set in the editor. */
	virtual void BeginPlay() override;

private:
	int32 Ammo = 0; // @explain: The only state the blaster owns; damage and clip size stay in the asset.
};
```

## DojoF6Blaster.cpp

```cpp
#include "DojoF6Blaster.h"

#include "Components/SceneComponent.h"
#include "DojoF6WeaponData.h"

ADojoF6Blaster::ADojoF6Blaster()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoF6Blaster::BeginPlay()
{
	Super::BeginPlay();

	Reload();
}

float ADojoF6Blaster::Fire()
{
	// Your code: fire nothing without a weapon or with an empty clip.
	// Your code: use one shot and return the weapon's damage.
	return 0.f;
}

void ADojoF6Blaster::Reload()
{
	Ammo = IsValid(Weapon) ? Weapon->ClipSize : 0; // @explain: The clip size is read from the asset at the moment of reloading, never stored.
}

void ADojoF6Blaster::SetWeapon(UDojoF6WeaponData* NewWeapon)
{
	// Your code: take the new weapon and fill the clip for it.
}

int32 ADojoF6Blaster::GetAmmo() const
{
	return Ammo;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/DataAsset.h"
#include "Quests/f6-weapon-data/DojoF6Blaster.h"
#include "Quests/f6-weapon-data/DojoF6WeaponData.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoF6WeaponDataTest
{
	/** Makes a weapon asset in memory, the way the editor makes one in the Content Browser. */
	UDojoF6WeaponData* MakeWeapon(float Damage, int32 ClipSize)
	{
		UDojoF6WeaponData* Weapon = NewObject<UDojoF6WeaponData>();
		Weapon->Damage = Damage;
		Weapon->ClipSize = ClipSize;
		return Weapon;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F6_WeaponData_FiresFromTheAsset, "Dojo.F6.WeaponData.FiresFromTheAsset", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Fires a blaster with a pistol and a rifle asset and checks every number comes from the asset it holds. */
bool FDojo_F6_WeaponData_FiresFromTheAsset::RunTest(const FString& Parameters)
{
	using namespace DojoF6WeaponDataTest;

	FDojoTestWorld TestWorld;

	UDojoF6WeaponData* Pistol = MakeWeapon(1.f, 6);
	UDojoF6WeaponData* Rifle = MakeWeapon(3.f, 4);
	ADojoF6Blaster* Blaster = TestWorld.SpawnActor<ADojoF6Blaster>();
	ADojoF6Blaster* Spare = TestWorld.SpawnActor<ADojoF6Blaster>();
	if (!TestNotNull(TEXT("Blasters spawned"), Blaster) || !TestNotNull(TEXT("Spare spawned"), Spare)) return false;

	TestEqual(TEXT("No weapon, no shot"), Blaster->Fire(), 0.f);

	Blaster->SetWeapon(Pistol);
	TestEqual(TEXT("The pistol's clip is full"), Blaster->GetAmmo(), 6);

	float Total = 0.f;
	for (int32 Shot = 0; Shot < 6; Shot++)
	{
		Total += Blaster->Fire();
	}
	TestEqual(TEXT("Six pistol shots deal 6"), Total, 6.f);
	TestEqual(TEXT("The seventh shot fires nothing"), Blaster->Fire(), 0.f);
	TestEqual(TEXT("The clip is empty"), Blaster->GetAmmo(), 0);

	Blaster->Reload();
	TestEqual(TEXT("A reload fills the pistol's clip"), Blaster->GetAmmo(), 6);

	Blaster->SetWeapon(Rifle);
	TestEqual(TEXT("Switching fills the rifle's clip"), Blaster->GetAmmo(), 4);
	TestEqual(TEXT("A rifle shot deals 3"), Blaster->Fire(), 3.f);

	Rifle->Damage = 5.f;
	TestEqual(TEXT("An edited asset is used on the next shot"), Blaster->Fire(), 5.f);

	Spare->SetWeapon(Rifle);
	TestEqual(TEXT("Two blasters share one asset but keep their own clips"), Spare->GetAmmo(), 4);
	TestEqual(TEXT("The first blaster's clip is its own"), Blaster->GetAmmo(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F6_WeaponData_IsAnEditableAsset, "Dojo.F6.WeaponData.IsAnEditableAsset", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that the weapon is a data asset with a soft mesh, and that the blaster's slot is editable. */
bool FDojo_F6_WeaponData_IsAnEditableAsset::RunTest(const FString& Parameters)
{
	TestTrue(TEXT("The weapon is a data asset"), UDojoF6WeaponData::StaticClass()->IsChildOf(UDataAsset::StaticClass()));

	const FProperty* Mesh = UDojoF6WeaponData::StaticClass()->FindPropertyByName(TEXT("Mesh"));
	if (!TestNotNull(TEXT("Mesh is a UPROPERTY"), Mesh)) return false;
	TestTrue(TEXT("The mesh is a soft reference"), Mesh->IsA<FSoftObjectProperty>());

	const FProperty* Weapon = ADojoF6Blaster::StaticClass()->FindPropertyByName(TEXT("Weapon"));
	if (!TestNotNull(TEXT("Weapon is a UPROPERTY"), Weapon)) return false;
	TestTrue(TEXT("Designers can set the blaster's weapon"), Weapon->HasAnyPropertyFlags(CPF_Edit));

	return true;
}

#endif
```

# Hints

- Fire has one guard and two steps; SetWeapon has two steps, and one of them is already written as its own function.
- The guard checks the weapon with IsValid and the clip with Ammo; SetWeapon stores the pointer, then calls Reload so the clip size comes from the new asset.
- `UDataAsset` is in `Engine/DataAsset.h`; `IsValid` is in `UObject/Object.h`.

# Rubric

- Fire returns 0 and uses nothing without a weapon or with an empty clip.
- Fire uses one shot and returns the asset's damage, read at the moment of firing.
- SetWeapon stores the new asset and fills the clip from it, through Reload.
- The blaster stores no copy of the damage or clip size.
- The weapon class derives from UDataAsset and its mesh is a soft reference.

# Alternative

The same numbers could sit as UPROPERTYs on the blaster itself, set per instance in Details or in Blueprint child classes such as BP_Pistol and BP_Rifle. That works for two weapons, but every new weapon is a new class, and the numbers end up scattered across Blueprints. A data asset keeps every weapon as one small asset that any blaster, pickup, shop, or HUD can point at. A Data Table is the other common home for numbers; the data tables card compares the two.

# Parsons

```yaml
- id: blaster-fire
  prompt: Put Fire in order.
  lines:
    - "float ADojoF6Blaster::Fire()"
    - "{"
    - "	if (!IsValid(Weapon) || Ammo <= 0) return 0.f;"
    - "	Ammo--;"
    - "	return Weapon->Damage;"
    - "}"
  distractors:
    - line: "	Damage = Weapon->Damage;"
      mistake: Copying the damage into the blaster means an edited asset is not used until something copies it again.
```
