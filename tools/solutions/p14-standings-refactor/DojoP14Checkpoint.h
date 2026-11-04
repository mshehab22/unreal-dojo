#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP14Checkpoint.generated.h"

class UDojoP14Standings;

/** A checkpoint on the track. Drivers must reach the checkpoints in the order of their numbers, and each one reports to the standings of its own world. */
UCLASS()
class ADojoP14Checkpoint : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP14Checkpoint();

	/** Where this checkpoint comes in the race, from 0. */
	UPROPERTY(EditAnywhere, Category = "Checkpoint", meta = (ClampMin = "0"))
	int32 Index = 0;

	/** Driver reaches this checkpoint; true when it was the next one they needed. */
	UFUNCTION(BlueprintCallable, Category = "Checkpoint")
	bool Touch(FName Driver);

	/** The standings this checkpoint reports to, or nullptr outside a world. */
	UFUNCTION(BlueprintPure, Category = "Checkpoint")
	UDojoP14Standings* GetStandings() const;
};
