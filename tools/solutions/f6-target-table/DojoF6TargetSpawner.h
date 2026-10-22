#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF6TargetSpawner.generated.h"

class ADojoF6Target;
class UDataTable;

/** Spawns range targets by the name of their row in a target table, so new kinds of target need a new row and no code. */
UCLASS()
class ADojoF6TargetSpawner : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoF6TargetSpawner();

	/** The target kinds; every row must be an FDojoF6TargetRow. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Spawner")
	TObjectPtr<UDataTable> Table;

	/** Spawns a target of the kind RowName names at Location; logs a warning and returns nullptr when there is no table or no such row. */
	UFUNCTION(BlueprintCallable, Category = "Spawner")
	ADojoF6Target* SpawnTarget(FName RowName, FVector Location);

	/** True when the table has a row named RowName. */
	UFUNCTION(BlueprintPure, Category = "Spawner")
	bool HasRow(FName RowName) const;

	/** Targets spawned so far. */
	UFUNCTION(BlueprintPure, Category = "Spawner")
	int32 GetSpawnedCount() const;

private:
	int32 SpawnedCount = 0;
};
