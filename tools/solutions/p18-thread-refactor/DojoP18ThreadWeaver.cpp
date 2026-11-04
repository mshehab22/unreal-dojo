#include "DojoP18ThreadWeaver.h"

#include "Components/SceneComponent.h"

namespace DojoP18ThreadWeaverCells
{
	/** The four neighbor cells each cell measures against, so every pair of neighbor cells is measured from one side only. */
	const FIntPoint Ahead[] = { FIntPoint(1, 0), FIntPoint(-1, 1), FIntPoint(0, 1), FIntPoint(1, 1) };
}

ADojoP18ThreadWeaver::ADojoP18ThreadWeaver()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP18ThreadWeaver::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Weave();
}

void ADojoP18ThreadWeaver::Weave()
{
	Threads.Reset();
	LastMeasured = 0;

	TMap<FIntPoint, TArray<int32>> Cells;
	for (int32 Index = 0; Index < Floats.Num(); ++Index)
	{
		Cells.FindOrAdd(CellOf(Floats[Index])).Add(Index);
	}

	for (const TPair<FIntPoint, TArray<int32>>& Pair : Cells)
	{
		const TArray<int32>& Here = Pair.Value;
		for (int32 Earlier = 0; Earlier < Here.Num(); ++Earlier)
		{
			for (int32 Later = Earlier + 1; Later < Here.Num(); ++Later)
			{
				Measure(Here[Earlier], Here[Later]);
			}
		}

		for (const FIntPoint& Offset : DojoP18ThreadWeaverCells::Ahead)
		{
			const TArray<int32>* There = Cells.Find(Pair.Key + Offset);
			if (!There) continue;

			for (const int32 Mine : Here)
			{
				for (const int32 Theirs : *There)
				{
					Measure(Mine, Theirs);
				}
			}
		}
	}
}

FIntPoint ADojoP18ThreadWeaver::CellOf(const FVector2D& Position) const
{
	return FIntPoint(FMath::FloorToInt32(Position.X / LinkRange), FMath::FloorToInt32(Position.Y / LinkRange));
}

void ADojoP18ThreadWeaver::Measure(int32 One, int32 Other)
{
	++LastMeasured;
	if (FVector2D::Distance(Floats[One], Floats[Other]) > LinkRange) return;

	FDojoP18Thread Thread;
	Thread.First = FMath::Min(One, Other);
	Thread.Second = FMath::Max(One, Other);
	Threads.Add(Thread);
}

TArray<FDojoP18Thread> ADojoP18ThreadWeaver::GetThreads() const
{
	return Threads;
}

int32 ADojoP18ThreadWeaver::GetLastMeasured() const
{
	return LastMeasured;
}
