#pragma once

#include "CoreMinimal.h"
#include "DojoP17RigNode.h"
#include "GameFramework/Actor.h"
#include "DojoP17TowerRig.generated.h"

/** A tower described as joints in a tree: each joint's position is its parent's position plus its own offset, kept ready for the many readers and worked out again only when a joint has moved. Dirty Flag pattern. */
UCLASS()
class ADojoP17TowerRig : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP17TowerRig();

	/** The joints, parents before children. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rig")
	TArray<FDojoP17RigNode> Nodes;

	/** Moves joint Index to NewOffset; returns false when there is no such joint. Setting the offset it already has changes nothing. */
	UFUNCTION(BlueprintCallable, Category = "Rig")
	bool SetLocalOffset(int32 Index, FVector NewOffset);

	/** The offset joint Index was given, or zero when there is no such joint. */
	UFUNCTION(BlueprintPure, Category = "Rig")
	FVector GetLocalOffset(int32 Index) const;

	/** Where joint Index is in the rig: its parent's position plus its own offset, or just its offset for a root; zero when there is no such joint. */
	UFUNCTION(BlueprintPure, Category = "Rig")
	FVector GetPosition(int32 Index) const;

	/** How many times joint Index's position has been worked out. */
	UFUNCTION(BlueprintPure, Category = "Rig")
	int32 GetRecomputeCount(int32 Index) const;

	/** How many times any joint's position has been worked out. */
	UFUNCTION(BlueprintPure, Category = "Rig")
	int32 GetTotalRecomputeCount() const;

private:
	/** Sizes the three caches to the joint list; every joint starts without a trusted position. */
	void EnsureCaches() const;

	/** The position last worked out for each joint. */
	mutable TArray<FVector> CachedPositions;

	/** Whether each joint's cached position can be trusted. */
	mutable TArray<bool> CacheValid;

	/** Times each joint's position has been worked out. */
	mutable TArray<int32> RecomputeCounts;
};
