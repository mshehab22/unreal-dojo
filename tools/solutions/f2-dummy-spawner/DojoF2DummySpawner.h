#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF2DummySpawner.generated.h"

class ADojoF1TrainingDummy;

/** Spawns training dummies of whatever class a designer picks, each one further along a line. */
UCLASS()
class ADojoF2DummySpawner : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root, sets the default dummy class, and turns ticking off. */
	ADojoF2DummySpawner();

	/** The dummy class to spawn; any Blueprint child of the training dummy can be picked. */
	UPROPERTY(EditAnywhere, Category = "Spawner")
	TSubclassOf<ADojoF1TrainingDummy> DummyClass;

	/** Distance between the spawner and the first dummy, and between dummies. */
	UPROPERTY(EditAnywhere, Category = "Spawner")
	FVector SpawnSpacing = FVector(200.f, 0.f, 0.f);

	/** Spawns one dummy of DummyClass after the last one; returns nullptr when no class is set. */
	UFUNCTION(BlueprintCallable, Category = "Spawner")
	ADojoF1TrainingDummy* SpawnDummy();

	/** How many dummies this spawner has made. */
	UFUNCTION(BlueprintPure, Category = "Spawner")
	int32 GetSpawnedCount() const;

private:
	/** Every dummy spawned so far; UPROPERTY so the garbage collector sees these references. */
	UPROPERTY(VisibleInstanceOnly, Category = "Spawner")
	TArray<TObjectPtr<ADojoF1TrainingDummy>> SpawnedDummies;
};
