#include "DojoP18Grid.h"

FDojoP18Grid::FDojoP18Grid(float InCellSize)
	: CellSize(FMath::Max(InCellSize, 1.f))
{
}

float FDojoP18Grid::GetCellSize() const
{
	return CellSize;
}

FIntPoint FDojoP18Grid::CellOf(const FVector& Location) const
{
	return FIntPoint(FMath::FloorToInt32(Location.X / CellSize), FMath::FloorToInt32(Location.Y / CellSize));
}

void FDojoP18Grid::Add(AActor* Actor)
{
	if (!IsValid(Actor)) return;

	if (Filed.Contains(Actor))
	{
		Refile(Actor);
		return;
	}

	const FIntPoint Cell = CellOf(Actor->GetActorLocation());
	Cells.FindOrAdd(Cell).Add(Actor);
	Filed.Add(Actor, Cell);
}

void FDojoP18Grid::Remove(AActor* Actor)
{
	FIntPoint Cell;
	if (!Filed.RemoveAndCopyValue(Actor, Cell)) return;

	if (TArray<TWeakObjectPtr<AActor>>* Bucket = Cells.Find(Cell))
	{
		Bucket->RemoveSingleSwap(Actor);
		if (Bucket->IsEmpty()) Cells.Remove(Cell);
	}
}

void FDojoP18Grid::Refile(AActor* Actor)
{
	FIntPoint* Cell = Filed.Find(Actor);
	if (!Cell || !IsValid(Actor)) return;

	const FIntPoint Under = CellOf(Actor->GetActorLocation());
	if (Under == *Cell) return;

	if (TArray<TWeakObjectPtr<AActor>>* Bucket = Cells.Find(*Cell))
	{
		Bucket->RemoveSingleSwap(Actor);
		if (Bucket->IsEmpty()) Cells.Remove(*Cell);
	}

	Cells.FindOrAdd(Under).Add(Actor);
	*Cell = Under;
}

int32 FDojoP18Grid::Num() const
{
	return Filed.Num();
}

int32 FDojoP18Grid::FindNear(const FVector& Center, float Radius, TArray<AActor*>& OutActors) const
{
	OutActors.Reset();

	const float Reach = FMath::Max(Radius, 0.f);
	const FIntPoint Low = CellOf(Center - FVector(Reach, Reach, 0.f));
	const FIntPoint High = CellOf(Center + FVector(Reach, Reach, 0.f));

	int32 Measured = 0;
	for (int32 X = Low.X; X <= High.X; ++X)
	{
		for (int32 Y = Low.Y; Y <= High.Y; ++Y)
		{
			const TArray<TWeakObjectPtr<AActor>>* Bucket = Cells.Find(FIntPoint(X, Y));
			if (!Bucket) continue;

			for (const TWeakObjectPtr<AActor>& Entry : *Bucket)
			{
				AActor* Candidate = Entry.Get();
				if (!IsValid(Candidate)) continue;

				++Measured;
				if (FVector::Dist2D(Candidate->GetActorLocation(), Center) <= Reach) OutActors.Add(Candidate);
			}
		}
	}

	return Measured;
}
