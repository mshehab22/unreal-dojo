#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"

/** Files actors by the square cell of ground under them, so a question about one spot looks only in the cells near that spot. */
class FDojoP18Grid
{
public:
	/** Makes an empty grid whose cells are CellSize units on a side. */
	explicit FDojoP18Grid(float InCellSize = 200.f);

	/** The side of one cell. */
	float GetCellSize() const;

	/** The cell under Location on the ground plane; height is ignored. */
	FIntPoint CellOf(const FVector& Location) const;

	/** Files Actor in the cell under it; an actor already filed is refiled instead. */
	void Add(AActor* Actor);

	/** Takes Actor out of the grid. */
	void Remove(AActor* Actor);

	/** Moves Actor to the cell under it now; call it after the actor moved. */
	void Refile(AActor* Actor);

	/** How many actors are filed, destroyed ones included until they are removed. */
	int32 Num() const;

	/** Fills OutActors with every live filed actor within Radius of Center on the ground plane, and returns how many filed actors it measured to decide. */
	int32 FindNear(const FVector& Center, float Radius, TArray<AActor*>& OutActors) const;

private:
	/** The side of one cell. */
	float CellSize;

	/** The actors filed in each cell that holds any; empty cells are not stored. */
	TMap<FIntPoint, TArray<TWeakObjectPtr<AActor>>> Cells;

	/** The cell each filed actor is in. */
	TMap<TWeakObjectPtr<AActor>, FIntPoint> Filed;
};
