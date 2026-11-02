#pragma once

#include "CoreMinimal.h"
#include "DojoP12Blade.h"
#include "GameFramework/Actor.h"
#include "DojoP12BladeLayer.generated.h"

/** Lays blades in the trial hall, each one starting from a blade a designer tuned by hand. Prototype pattern, object form. */
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
