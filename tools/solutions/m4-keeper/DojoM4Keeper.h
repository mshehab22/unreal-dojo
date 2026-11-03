#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TimerManager.h"
#include "DojoM4Keeper.generated.h"

class ADojoM4Bomb;

/** Keeps up to MaxLive lit bombs in play in fixed slots, refilling a free slot on a steady beat and freeing a slot when its bomb leaves play. */
UCLASS()
class ADojoM4Keeper : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root; the keeper never ticks. */
	ADojoM4Keeper();

	/** What to keep in play; nothing is spawned while it is empty. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keeper")
	TSubclassOf<ADojoM4Bomb> BombClass;

	/** The number of slots, and so the most bombs in play at once. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keeper", meta = (ClampMin = "1"))
	int32 MaxLive = 3;

	/** Seconds between refills. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keeper", meta = (ClampMin = "0.05"))
	float RefillSeconds = 0.5f;

	/** Each new bomb's fuse, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keeper", meta = (ClampMin = "0.1"))
	float Fuse = 1.2f;

	/** Units between slots along the keeper's right. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keeper", meta = (ClampMin = "0"))
	float Spacing = 100.f;

	/** Ends the refills; bombs already in play burn on. */
	UFUNCTION(BlueprintCallable, Category = "Keeper")
	void Stop();

	/** Bombs from this keeper still in play. */
	UFUNCTION(BlueprintPure, Category = "Keeper")
	int32 GetLive() const;

	/** Bombs this keeper has spawned. */
	UFUNCTION(BlueprintPure, Category = "Keeper")
	int32 GetMade() const;

protected:
	/** Makes the empty slots and starts the refills, the first one at once. */
	virtual void BeginPlay() override;

	/** Stops the refills and stops listening to the bombs still in play. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** One refill: spawns a lit bomb in the lowest free slot, when there is one. */
	void Refill();

	/** Runs when one of the keeper's bombs leaves play: frees its slot. */
	UFUNCTION()
	void HandleBombDestroyed(AActor* DestroyedActor);

	/** The bomb in each slot, or nullptr for a free slot. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoM4Bomb>> SlotBombs;

	FTimerHandle RefillTimer;

	int32 Made = 0;
};
