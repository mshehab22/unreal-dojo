#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM4Scatter.generated.h"

class UBoxComponent;

/** Spawns a number of actors at seeded random points across its area, skipping any point where the new actor would sit inside something it blocks. */
UCLASS()
class ADojoM4Scatter : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the area box as the root; the box has no collision, it only marks the floor. */
	ADojoM4Scatter();

	/** The floor to scatter over: points are taken across its X and Y at its own height. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Scatter")
	TObjectPtr<UBoxComponent> Area;

	/** What to spawn; nothing is spawned while it is empty. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Scatter")
	TSubclassOf<AActor> SpawnClass;

	/** How many points to try. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Scatter", meta = (ClampMin = "0"))
	int32 Count = 10;

	/** The same seed gives the same points. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Scatter")
	int32 Seed = 7;

	/** Tries Count points and spawns at each free one; returns how many actors appeared. */
	UFUNCTION(BlueprintCallable, Category = "Scatter")
	int32 Scatter();

	/** The actors this scatterer has spawned, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Scatter")
	TArray<AActor*> GetSpawned() const;

	/** How many points were refused because they were blocked. */
	UFUNCTION(BlueprintPure, Category = "Scatter")
	int32 GetSkipped() const;

private:
	UPROPERTY()
	TArray<TObjectPtr<AActor>> Spawned;

	int32 Skipped = 0;
};
