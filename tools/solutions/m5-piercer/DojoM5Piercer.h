#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM5Piercer.generated.h"

/** Fires one shot along its forward that passes through thin things and stops at the first solid one. */
UCLASS()
class ADojoM5Piercer : public AActor
{
	GENERATED_BODY()

public:
	/** Creates a scene root and an arrow that shows the way the shot flies. */
	ADojoM5Piercer();

	/** How far the shot flies, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Piercer", meta = (ClampMin = "1"))
	float Reach = 2000.f;

	/** Fires once: finds everything the shot passes through, in order, and what stops it. Replaces the last shot's results. */
	UFUNCTION(BlueprintCallable, Category = "Piercer")
	void Fire();

	/** How many things the last shot passed through. */
	UFUNCTION(BlueprintPure, Category = "Piercer")
	int32 GetPiercedCount() const;

	/** The Index-th thing the last shot passed through, nearest first, or nullptr when there is none. */
	UFUNCTION(BlueprintPure, Category = "Piercer")
	AActor* GetPiercedAt(int32 Index) const;

	/** The solid thing that stopped the last shot, or nullptr when it flew its whole reach. */
	UFUNCTION(BlueprintPure, Category = "Piercer")
	AActor* GetStoppedBy() const;

	/** How far the last shot flew: the distance to the solid thing that stopped it, or the whole reach. */
	UFUNCTION(BlueprintPure, Category = "Piercer")
	float GetShotLength() const;

private:
	TArray<TWeakObjectPtr<AActor>> Pierced;

	TWeakObjectPtr<AActor> StoppedBy;

	float ShotLength = 0.f;
};
