#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF5Follower.generated.h"

/** Moves toward a target at a steady speed every frame, the same distance per second at any frame rate, and ticks only while it has a target. */
UCLASS()
class ADojoF5Follower : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root; the follower can tick but starts with ticking off. */
	ADojoF5Follower();

	/** Units per second. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Follower", meta = (ClampMin = "0.0"))
	float Speed = 600.f;

	/** The follower stops this far from its target. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Follower", meta = (ClampMin = "0.0"))
	float StopDistance = 50.f;

	/** Starts following Target and turns ticking on; nullptr stops and turns ticking off. */
	UFUNCTION(BlueprintCallable, Category = "Follower")
	void Follow(AActor* NewTarget);

	/** The actor being followed, or nullptr once it is gone. */
	UFUNCTION(BlueprintPure, Category = "Follower")
	AActor* GetTarget() const;

	/** True when within StopDistance of the target. */
	UFUNCTION(BlueprintPure, Category = "Follower")
	bool HasArrived() const;

	/** Moves up to Speed times DeltaSeconds toward the target, never closer than StopDistance; turns ticking off when the target is gone. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** Not owned: the target may be destroyed by anyone. */
	TWeakObjectPtr<AActor> Target;
};
