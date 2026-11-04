#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP16RocketRack.generated.h"

class ADojoP16Rocket;

/** Spawns a fixed set of rockets once when play begins, lends them out, and takes them back. The rockets know nothing about the rack. */
UCLASS()
class ADojoP16RocketRack : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root, turns ticking off, and picks the C++ rocket class. */
	ADojoP16RocketRack();

	/** The rocket class the rack spawns. */
	UPROPERTY(EditAnywhere, Category = "Rack")
	TSubclassOf<ADojoP16Rocket> RocketClass;

	/** How many rockets the rack spawns when play begins, which is the most it can ever lend at once. */
	UPROPERTY(EditAnywhere, Category = "Rack", meta = (ClampMin = "1"))
	int32 RocketCount = 4;

	/** Lends a resting rocket at Where, reset and back in play; nullptr when every rocket is out. */
	UFUNCTION(BlueprintCallable, Category = "Rack")
	ADojoP16Rocket* Acquire(const FVector& Where);

	/** Takes back a rocket this rack lent out and puts it out of play, ready to lend again. False, changing nothing, for any rocket the rack has not lent. */
	UFUNCTION(BlueprintCallable, Category = "Rack")
	bool Release(ADojoP16Rocket* Rocket);

	/** Rockets waiting in the rack. */
	UFUNCTION(BlueprintPure, Category = "Rack")
	int32 GetRestingCount() const;

	/** Rockets lent out now. */
	UFUNCTION(BlueprintPure, Category = "Rack")
	int32 GetLentCount() const;

protected:
	/** Spawns every rocket the rack will ever use, out of play. */
	virtual void BeginPlay() override;

	/** Destroys the rockets the rack owns. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Rockets waiting to be lent, out of play. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP16Rocket>> Resting;

	/** Rockets lent out now, in play. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP16Rocket>> Lent;
};
