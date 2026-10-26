#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DojoP10WeaponKind.generated.h"

/** One kind of arena weapon as an asset: the numbers every weapon of this kind shares. Type Object pattern. */
UCLASS(BlueprintType)
class UDojoP10WeaponKind : public UPrimaryDataAsset
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
