#include "DojoP19Meadow.h"

#include "Components/SceneComponent.h"
#include "DrawDebugHelpers.h"

ADojoP19Meadow::ADojoP19Meadow()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

FDojoP19FlyHandle ADojoP19Meadow::AddFirefly(FVector Where, FVector Velocity, float LifeSeconds)
{
	FDojoP19MeadowFly Fly;
	Fly.Position = FVector3f(Where);
	Fly.Velocity = FVector3f(Velocity);
	Fly.Life = LifeSeconds;
	Fly.Id = IndexOfId.Add(Flies.Num());
	Flies.Add(Fly);

	FDojoP19FlyHandle Handle;
	Handle.Id = Fly.Id;
	return Handle;
}

bool ADojoP19Meadow::Catch(FDojoP19FlyHandle Handle)
{
	const int32 Index = FindIndex(Handle);
	if (Index == INDEX_NONE) return false;

	RemoveFirefly(Index);
	return true;
}

bool ADojoP19Meadow::IsAlive(FDojoP19FlyHandle Handle) const
{
	return FindIndex(Handle) != INDEX_NONE;
}

FVector ADojoP19Meadow::GetPosition(FDojoP19FlyHandle Handle) const
{
	const int32 Index = FindIndex(Handle);
	return Index == INDEX_NONE ? FVector::ZeroVector : FVector(Flies[Index].Position);
}

int32 ADojoP19Meadow::GetFireflyCount() const
{
	return Flies.Num();
}

void ADojoP19Meadow::Step(float DeltaSeconds)
{
	for (FDojoP19MeadowFly& Fly : Flies)
	{
		Fly.Position += Fly.Velocity * DeltaSeconds;
		Fly.Life -= DeltaSeconds;
	}

	for (int32 Index = Flies.Num() - 1; Index >= 0; --Index)
	{
		if (Flies[Index].Life <= 0.f) RemoveFirefly(Index);
	}
}

void ADojoP19Meadow::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Step(DeltaSeconds);

	if (!bDrawDebug) return;

	for (const FDojoP19MeadowFly& Fly : Flies)
	{
		DrawDebugPoint(GetWorld(), FVector(Fly.Position), 8.f, FColor::Yellow);
	}
}

int32 ADojoP19Meadow::FindIndex(FDojoP19FlyHandle Handle) const
{
	return IndexOfId.IsValidIndex(Handle.Id) ? IndexOfId[Handle.Id] : INDEX_NONE;
}

void ADojoP19Meadow::RemoveFirefly(int32 Index)
{
	if (!Flies.IsValidIndex(Index)) return;

	IndexOfId[Flies[Index].Id] = INDEX_NONE;
	Flies.RemoveAtSwap(Index);

	// The last record moved into the gap, so the table must say where it is now.
	if (Flies.IsValidIndex(Index)) IndexOfId[Flies[Index].Id] = Index;
}
