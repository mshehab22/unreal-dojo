#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoP17GuardBuff.h"
#include "DojoP17GuardStats.generated.h"

/** A fighter's guard rating: base guard plus worn gear plus temporary buffs, worked out only when it is asked for after a change. Dirty Flag pattern. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoP17GuardStats : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	UDojoP17GuardStats();

	/** Sets the base guard; nothing else changes when the value is the same. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	void SetBaseGuard(int32 NewBase);

	/** Wears Item for Bonus guard, replacing the bonus it had; returns false when nothing changed. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	bool Equip(FName Item, int32 Bonus);

	/** Takes Item off; returns false when it was not worn. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	bool Unequip(FName Item);

	/** Adds a temporary bonus and returns the id that removes it again; ids start at 1. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	int32 AddBuff(int32 Amount);

	/** Removes the buff with BuffId; returns false when there is none. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	bool RemoveBuff(int32 BuffId);

	/** Removes every buff. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	void ClearBuffs();

	/** The guard rating now: base plus gear plus buffs, never below 0. */
	UFUNCTION(BlueprintPure, Category = "Guard")
	int32 GetGuard() const;

	/** The base guard. */
	UFUNCTION(BlueprintPure, Category = "Guard")
	int32 GetBaseGuard() const;

	/** How many times the rating has been worked out from its parts. */
	UFUNCTION(BlueprintPure, Category = "Guard")
	int32 GetRecomputeCount() const;

private:
	/** The guard before gear and buffs. */
	UPROPERTY()
	int32 BaseGuard = 30;

	/** The bonus of each worn item. */
	UPROPERTY()
	TMap<FName, int32> Equipment;

	/** The temporary bonuses. */
	UPROPERTY()
	TArray<FDojoP17GuardBuff> Buffs;

	/** The id the next buff gets. */
	int32 NextBuffId = 1;

	/** The last rating worked out; only trusted while the guard is not marked dirty. */
	mutable int32 CachedGuard = 0; // @explain: These three are mutable so the const reading function can refresh the cache and count the work; the stored guard is not part of what a caller can see change.

	/** True when a part has changed since CachedGuard was worked out. */
	mutable bool bGuardDirty = true; // @explain: It starts true because nothing has been worked out yet, so the first read always computes.

	/** Times the rating has been worked out. */
	mutable int32 RecomputeCount = 0;
};
