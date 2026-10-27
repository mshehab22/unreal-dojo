#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM2Sled.generated.h"

/** A block that glides along a direction at a steady speed, measured in its own frame or in the world's. */
UCLASS()
class ADojoM2Sled : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the root and an arrow that shows the sled's forward, and turns ticking on. */
	ADojoM2Sled();

	/** Which way to glide; only the direction matters, not the length of this vector. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Sled")
	FVector Direction = FVector::ForwardVector;

	/** Units per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Sled", meta = (ClampMin = "0"))
	float Speed = 200.f;

	/** True: Direction is seen from the sled itself, so turning the sled turns its path. False: Direction is a direction in the world. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Sled")
	bool bLocalSpace = true;

	/** Total distance glided since play began. */
	UFUNCTION(BlueprintPure, Category = "Sled")
	float GetDistanceTravelled() const;

	/** Glides by this frame's share of the speed. */
	virtual void Tick(float DeltaSeconds) override;

private:
	float DistanceTravelled = 0.f;
};
