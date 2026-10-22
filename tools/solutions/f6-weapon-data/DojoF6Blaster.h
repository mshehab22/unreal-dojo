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
	TObjectPtr<UDojoF6WeaponData> Weapon;

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
	int32 Ammo = 0;
};
