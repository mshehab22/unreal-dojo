#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM2Patrol.generated.h"

/** A block that swings between its start and a far end along its own forward, at a steady speed, forever. */
UCLASS()
class ADojoM2Patrol : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the root and an arrow that shows the path's direction, and turns ticking on. */
	ADojoM2Patrol();

	/** How far the far end is from the start, along the actor's forward at the moment play begins. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Patrol", meta = (ClampMin = "0"))
	float TravelDistance = 600.f;

	/** Units per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Patrol", meta = (ClampMin = "0"))
	float Speed = 300.f;

	/** How far along the path the block is: 0 at the start, TravelDistance at the far end. */
	UFUNCTION(BlueprintPure, Category = "Patrol")
	float GetOffsetAlongPath() const;

	/** How many times an end of the path has been reached. */
	UFUNCTION(BlueprintPure, Category = "Patrol")
	int32 GetEndsReached() const;

	/** Moves along the path by this frame's share of the speed, turning round at each end. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Remembers where the path starts and which way it runs. */
	virtual void BeginPlay() override;

private:
	FVector StartLocation = FVector::ZeroVector;

	FVector PathDirection = FVector::ForwardVector;

	float Offset = 0.f;

	bool bOutbound = true;

	int32 EndsReached = 0;
};
