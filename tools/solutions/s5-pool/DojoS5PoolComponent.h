#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoS5PoolComponent.generated.h"

class ADojoS5Beetle;

/** Keeps every beetle it ever made and wakes a sleeping one before it spawns another, up to a fixed size; any actor can carry one. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS5PoolComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off and spawns plain beetles until a designer picks a Blueprint child. */
	UDojoS5PoolComponent();

	/** What kind of beetle the pool spawns when it needs a new one. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pool")
	TSubclassOf<ADojoS5Beetle> BeetleClass;

	/** The most beetles the pool will ever make. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pool", meta = (ClampMin = "1"))
	int32 MaxSize = 4;

	/** Spawns sleeping beetles ahead of time, up to Count in all and never past MaxSize. */
	UFUNCTION(BlueprintCallable, Category = "Pool")
	void Prewarm(int32 Count);

	/** Wakes a beetle at Location: the first sleeping one, or a new one while the pool is not full; null when every beetle is busy. */
	UFUNCTION(BlueprintCallable, Category = "Pool")
	ADojoS5Beetle* Acquire(const FVector& Location);

	/** Puts one of this pool's awake beetles back to sleep; false for anything else. */
	UFUNCTION(BlueprintCallable, Category = "Pool")
	bool Release(ADojoS5Beetle* Beetle);

	/** Puts every awake beetle back to sleep. */
	UFUNCTION(BlueprintCallable, Category = "Pool")
	void ReleaseAll();

	/** How many beetles the pool has spawned so far, awake or asleep. */
	UFUNCTION(BlueprintPure, Category = "Pool")
	int32 GetCreatedCount() const;

	/** How many of the pool's beetles are awake. */
	UFUNCTION(BlueprintPure, Category = "Pool")
	int32 GetAwakeCount() const;

	/** The awake beetles, in the order the pool made them. */
	UFUNCTION(BlueprintPure, Category = "Pool")
	TArray<ADojoS5Beetle*> GetAwakeBeetles() const;

protected:
	/** Destroys the pool's beetles when the pool itself is removed; on a level change the level takes them along. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Spawns one beetle, puts it to sleep, and remembers it; null when the pool is full or cannot spawn. */
	ADojoS5Beetle* SpawnSleeping();

	UPROPERTY()
	TArray<TObjectPtr<ADojoS5Beetle>> Beetles;
};
