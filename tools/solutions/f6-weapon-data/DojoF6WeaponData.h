#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DojoF6WeaponData.generated.h"

class UStaticMesh;

/** One weapon's numbers and look, kept in an asset so designers make and balance weapons without touching code. */
UCLASS(BlueprintType)
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
	TSoftObjectPtr<UStaticMesh> Mesh;
};
