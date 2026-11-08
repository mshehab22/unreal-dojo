#include "DojoP18MothSwarm.h"

#include "Components/SceneComponent.h"

ADojoP18MothSwarm::ADojoP18MothSwarm()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP18MothSwarm::BeginPlay()
{
	Super::BeginPlay();

	Scatter();
}

void ADojoP18MothSwarm::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Step(DeltaSeconds);
}

void ADojoP18MothSwarm::Scatter()
{
	const FRandomStream Stream(Seed);
	const FVector Where = GetActorLocation();
	FieldCenter = FVector2D(Where.X, Where.Y);

	Moths.Reset(Count);
	for (int32 Index = 0; Index < Count; ++Index)
	{
		FDojoP18Moth Moth;
		Moth.Position = FieldCenter + FVector2D(Stream.FRandRange(-HalfSize, HalfSize), Stream.FRandRange(-HalfSize, HalfSize));

		const float Heading = Stream.FRandRange(0.f, 2.f * UE_PI);
		Moth.Velocity = FVector2D(FMath::Cos(Heading), FMath::Sin(Heading)) * Speed;

		Moths.Add(Moth);
	}

	FileAll();
}

void ADojoP18MothSwarm::Step(float DeltaSeconds)
{
	const FVector2D Low = FieldCenter - FVector2D(HalfSize, HalfSize);
	const FVector2D High = FieldCenter + FVector2D(HalfSize, HalfSize);

	for (int32 Index = 0; Index < Moths.Num(); ++Index)
	{
		FDojoP18Moth& Moth = Moths[Index];
		Moth.Position += Moth.Velocity * DeltaSeconds;

		if (Moth.Position.X < Low.X || Moth.Position.X > High.X)
		{
			Moth.Velocity.X = -Moth.Velocity.X;
			Moth.Position.X = FMath::Clamp(Moth.Position.X, Low.X, High.X);
		}

		if (Moth.Position.Y < Low.Y || Moth.Position.Y > High.Y)
		{
			Moth.Velocity.Y = -Moth.Velocity.Y;
			Moth.Position.Y = FMath::Clamp(Moth.Position.Y, Low.Y, High.Y);
		}

		Refile(Index);
	}
}

void ADojoP18MothSwarm::FileAll()
{
	Cells.Reset();
	MothCells.SetNum(Moths.Num());

	for (int32 Index = 0; Index < Moths.Num(); ++Index)
	{
		const FIntPoint Cell = CellOf(Moths[Index].Position);
		Cells.FindOrAdd(Cell).Add(Index);
		MothCells[Index] = Cell;
	}
}

void ADojoP18MothSwarm::Refile(int32 Index)
{
	const FIntPoint Under = CellOf(Moths[Index].Position);
	FIntPoint& Was = MothCells[Index];
	if (Under == Was) return;

	if (TArray<int32>* Bucket = Cells.Find(Was))
	{
		Bucket->RemoveSingleSwap(Index);
		if (Bucket->IsEmpty()) Cells.Remove(Was);
	}

	Cells.FindOrAdd(Under).Add(Index);
	Was = Under;
}

FIntPoint ADojoP18MothSwarm::CellOf(const FVector2D& Position) const
{
	return FIntPoint(FMath::FloorToInt32(Position.X / CellSize), FMath::FloorToInt32(Position.Y / CellSize));
}

int32 ADojoP18MothSwarm::FindNear(const FVector2D& Center, float Radius, TArray<int32>& OutMoths) const
{
	OutMoths.Reset();

	const float Reach = FMath::Max(Radius, 0.f);
	const FIntPoint Low = CellOf(Center - FVector2D(Reach, Reach));
	const FIntPoint High = CellOf(Center + FVector2D(Reach, Reach));

	int32 Measured = 0;
	for (int32 X = Low.X; X <= High.X; ++X)
	{
		for (int32 Y = Low.Y; Y <= High.Y; ++Y)
		{
			const TArray<int32>* Bucket = Cells.Find(FIntPoint(X, Y));
			if (!Bucket) continue;

			for (const int32 Index : *Bucket)
			{
				++Measured;
				if (FVector2D::Distance(Moths[Index].Position, Center) <= Reach) OutMoths.Add(Index);
			}
		}
	}

	return Measured;
}

int32 ADojoP18MothSwarm::CountNear(FVector2D Center, float Radius) const
{
	TArray<int32> Near;
	FindNear(Center, Radius, Near);
	return Near.Num();
}

const TArray<FDojoP18Moth>& ADojoP18MothSwarm::GetMoths() const
{
	return Moths;
}
