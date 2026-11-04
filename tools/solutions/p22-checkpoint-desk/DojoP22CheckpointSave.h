#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "DojoP22CheckpointSave.generated.h"

/** What one checkpoint remembers: the gate, the spot, and the runner's health. */
UCLASS()
class UDojoP22CheckpointSave : public USaveGame
{
	GENERATED_BODY()

public:
	/** The gate the checkpoint belongs to. */
	UPROPERTY()
	FName Gate;

	/** Where the runner comes back. */
	UPROPERTY()
	FVector Where = FVector::ZeroVector;

	/** The runner's health when it was saved. */
	UPROPERTY()
	int32 Health = 0;
};
