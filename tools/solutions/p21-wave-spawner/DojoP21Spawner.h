#pragma once

#include "CoreMinimal.h"
#include "DojoP21Critter.h"
#include "DojoP21SpawnEntry.h"
#include "GameFramework/Actor.h"
#include "DojoP21Spawner.generated.h"

/** The creator: it makes whatever critter a spawn entry names, ready to act, without ever naming a kind itself. */
UCLASS()
class ADojoP21Spawner : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP21Spawner();

	/** The critters one wave makes, in order. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spawner")
	TArray<FDojoP21SpawnEntry> Wave;

	/** The distance along the world X axis between neighbours in a wave, and from the spawner to the first. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spawner")
	float Spacing = 150.f;

	/** How many critters this spawner has made in all. */
	UPROPERTY(BlueprintReadOnly, Category = "Spawner")
	int32 SpawnedCount = 0;

	/** Makes one critter of the entry's class at Where, with the entry's level already set when it begins play; nullptr, and nothing counted, when the entry names no class. */
	UFUNCTION(BlueprintCallable, Category = "Spawner")
	ADojoP21Critter* Create(const FDojoP21SpawnEntry& Entry, const FTransform& Where);

	/** Makes every critter of the wave in order along the X axis and returns the ones it made; an entry that cannot be made is skipped and leaves no gap. */
	UFUNCTION(BlueprintCallable, Category = "Spawner")
	TArray<ADojoP21Critter*> SpawnWave();
};
