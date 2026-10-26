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
	TObjectPtr<const UDojoP10WeaponKind> Kind;

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
	float Durability = 0.f;
};
