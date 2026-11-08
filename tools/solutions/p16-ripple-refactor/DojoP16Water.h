#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP16Water.generated.h"

class ADojoP16Ripple;

/** The harbor's water: every splash shows a ripple for RippleSeconds, and at most MaxRipples show at once, the oldest giving way to the newest. It keeps the ripples it spawns and shows them again: the Object Pool pattern. */
UCLASS()
class ADojoP16Water : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP16Water();

	/** How long each ripple shows. */
	UPROPERTY(EditAnywhere, Category = "Water", meta = (ClampMin = "0.1"))
	float RippleSeconds = 1.f;

	/** The most ripples that show at once, which is also the most the water ever spawns. */
	UPROPERTY(EditAnywhere, Category = "Water", meta = (ClampMin = "1"))
	int32 MaxRipples = 5;

	/** Shows a ripple at Where for RippleSeconds and returns it; when MaxRipples already show, the oldest gives way. */
	UFUNCTION(BlueprintCallable, Category = "Water")
	ADojoP16Ripple* Splash(const FVector& Where);

	/** Ripples showing now. */
	UFUNCTION(BlueprintPure, Category = "Water")
	int32 GetShowingCount() const;

protected:
	/** Destroys the ripples the water owns. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** A faded ripple, a new one while there is room, or else the one that has shown longest. */
	ADojoP16Ripple* TakeRipple();

	/** Every ripple the water has spawned, in the order they were last shown, so the first one showing is the oldest. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP16Ripple>> Ripples;
};
