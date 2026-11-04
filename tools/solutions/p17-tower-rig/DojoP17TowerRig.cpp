#include "DojoP17TowerRig.h"

#include "Components/SceneComponent.h"

ADojoP17TowerRig::ADojoP17TowerRig()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

bool ADojoP17TowerRig::SetLocalOffset(int32 Index, FVector NewOffset)
{
	if (!Nodes.IsValidIndex(Index)) return false;
	if (Nodes[Index].LocalOffset.Equals(NewOffset)) return true;

	Nodes[Index].LocalOffset = NewOffset;
	EnsureCaches();

	// Parents come before children, so one forward pass reaches every joint that hangs from this one.
	CacheValid[Index] = false;
	for (int32 Later = Index + 1; Later < Nodes.Num(); Later++)
	{
		const int32 ParentOfLater = Nodes[Later].ParentIndex;
		if (Nodes.IsValidIndex(ParentOfLater) && ParentOfLater < Later && !CacheValid[ParentOfLater]) CacheValid[Later] = false;
	}

	return true;
}

FVector ADojoP17TowerRig::GetLocalOffset(int32 Index) const
{
	return Nodes.IsValidIndex(Index) ? Nodes[Index].LocalOffset : FVector::ZeroVector;
}

FVector ADojoP17TowerRig::GetPosition(int32 Index) const
{
	if (!Nodes.IsValidIndex(Index)) return FVector::ZeroVector;

	EnsureCaches();
	if (!CacheValid[Index])
	{
		const int32 ParentOfIndex = Nodes[Index].ParentIndex;
		const bool bHasParent = Nodes.IsValidIndex(ParentOfIndex) && ParentOfIndex < Index;
		const FVector ParentPosition = bHasParent ? GetPosition(ParentOfIndex) : FVector::ZeroVector;

		CachedPositions[Index] = ParentPosition + Nodes[Index].LocalOffset;
		RecomputeCounts[Index]++;
		CacheValid[Index] = true;
	}

	return CachedPositions[Index];
}

int32 ADojoP17TowerRig::GetRecomputeCount(int32 Index) const
{
	EnsureCaches();
	return RecomputeCounts.IsValidIndex(Index) ? RecomputeCounts[Index] : 0;
}

int32 ADojoP17TowerRig::GetTotalRecomputeCount() const
{
	EnsureCaches();

	int32 Total = 0;
	for (const int32 Count : RecomputeCounts) Total += Count;
	return Total;
}

void ADojoP17TowerRig::EnsureCaches() const
{
	const int32 Count = Nodes.Num();
	if (CacheValid.Num() == Count) return;

	CachedPositions.Init(FVector::ZeroVector, Count);
	CacheValid.Init(false, Count);
	RecomputeCounts.Init(0, Count);
}
