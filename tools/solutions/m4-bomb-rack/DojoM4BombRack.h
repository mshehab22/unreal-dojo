#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM4BombRack.generated.h"

class ADojoM4Bomb;

/** Loads a row of bombs along its own right side, each lit from its first frame with a fuse a little longer than the one before. */
UCLASS()
class ADojoM4BombRack : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and an arrow that shows the rack's forward. */
	ADojoM4BombRack();

	/** What to load; nothing is loaded while it is empty. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rack")
	TSubclassOf<ADojoM4Bomb> BombClass;

	/** How many bombs one Load makes. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rack", meta = (ClampMin = "1"))
	int32 Slots = 4;

	/** Units between slots along the rack's right. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rack", meta = (ClampMin = "0"))
	float Spacing = 150.f;

	/** The first slot's fuse, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rack", meta = (ClampMin = "0.1"))
	float FirstFuse = 2.f;

	/** How much longer each next slot's fuse is, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rack", meta = (ClampMin = "0"))
	float FuseStep = 0.5f;

	/** Spawns a lit bomb in every slot; returns how many appeared. */
	UFUNCTION(BlueprintCallable, Category = "Rack")
	int32 Load();

	/** The bombs this rack has loaded, first slot first. */
	UFUNCTION(BlueprintPure, Category = "Rack")
	TArray<ADojoM4Bomb*> GetBombs() const;

private:
	UPROPERTY()
	TArray<TObjectPtr<ADojoM4Bomb>> Bombs;
};
