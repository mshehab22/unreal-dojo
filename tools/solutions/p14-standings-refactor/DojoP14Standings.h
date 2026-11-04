#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP14Standings.generated.h"

/** Who is ahead in this world's race: how many checkpoints each driver has passed, in order. The engine makes one per world and destroys it with that world. */
UCLASS()
class UDojoP14Standings : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** Driver reached the checkpoint numbered Index; counted only when it is the next one they need. True when counted. */
	UFUNCTION(BlueprintCallable, Category = "Standings")
	bool Pass(FName Driver, int32 Index);

	/** How many checkpoints Driver has passed in order. */
	UFUNCTION(BlueprintPure, Category = "Standings")
	int32 GetPassed(FName Driver) const;

	/** The driver who has passed the most checkpoints, the first to get there on a tie; None before anyone has passed one. */
	UFUNCTION(BlueprintPure, Category = "Standings")
	FName GetLeader() const;

private:
	/** Checkpoints passed, by driver. */
	TMap<FName, int32> Passed;

	/** The driver ahead. */
	FName Leader;
};
