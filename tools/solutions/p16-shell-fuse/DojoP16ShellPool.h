#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP16ShellPool.generated.h"

class ADojoP16Shell;

/** Spawns a fixed set of shells when play begins, wakes one for every request, and sends it back to rest when it is returned. It decides when shells rest and wake; the shells decide how. */
UCLASS()
class ADojoP16ShellPool : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root, turns ticking off, and picks the C++ shell class. */
	ADojoP16ShellPool();

	/** The shell class the pool spawns. */
	UPROPERTY(EditAnywhere, Category = "Pool")
	TSubclassOf<ADojoP16Shell> ShellClass;

	/** How many shells the pool spawns when play begins, which is the most it can ever lend at once. */
	UPROPERTY(EditAnywhere, Category = "Pool", meta = (ClampMin = "1"))
	int32 PoolSize = 4;

	/** Wakes a resting shell at Where and lends it; nullptr when every shell is out. */
	UFUNCTION(BlueprintCallable, Category = "Pool")
	ADojoP16Shell* Acquire(const FVector& Where);

	/** Sends a shell this pool lent back to rest. False, changing nothing, for any shell the pool has not lent. */
	UFUNCTION(BlueprintCallable, Category = "Pool")
	bool Release(ADojoP16Shell* Shell);

	/** Shells resting in the pool. */
	UFUNCTION(BlueprintPure, Category = "Pool")
	int32 GetRestingCount() const;

	/** Shells lent out now. */
	UFUNCTION(BlueprintPure, Category = "Pool")
	int32 GetLentCount() const;

protected:
	/** Spawns every shell the pool will ever use and sends each one to rest. */
	virtual void BeginPlay() override;

	/** Destroys the shells the pool owns. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Shells waiting to be lent, at rest. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP16Shell>> Resting;

	/** Shells lent out now, in play. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP16Shell>> Lent;
};
