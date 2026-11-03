#include "DojoM4Scatter.h"

#include "Components/BoxComponent.h"
#include "Engine/World.h"

ADojoM4Scatter::ADojoM4Scatter()
{
	PrimaryActorTick.bCanEverTick = false;

	Area = CreateDefaultSubobject<UBoxComponent>(TEXT("Area"));
	Area->SetBoxExtent(FVector(500.f, 500.f, 50.f));
	Area->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	RootComponent = Area;
}

int32 ADojoM4Scatter::Scatter()
{
	if (!SpawnClass)
	{
		return 0;
	}

	const FRandomStream Stream(Seed);

	const FVector Center = Area->GetComponentLocation();
	const FVector Extent = Area->GetScaledBoxExtent();
	const FBox Floor(Center - FVector(Extent.X, Extent.Y, 0.f), Center + FVector(Extent.X, Extent.Y, 0.f));

	FActorSpawnParameters Parameters;
	Parameters.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::DontSpawnIfColliding;

	int32 Appeared = 0;
	for (int32 Try = 0; Try < Count; ++Try)
	{
		const FVector Point = Stream.RandPointInBox(Floor);

		AActor* Spawn = GetWorld()->SpawnActor<AActor>(SpawnClass, Point, FRotator::ZeroRotator, Parameters);
		if (Spawn)
		{
			Spawned.Add(Spawn);
			Appeared++;
		}
		else
		{
			Skipped++;
		}
	}

	return Appeared;
}

TArray<AActor*> ADojoM4Scatter::GetSpawned() const
{
	TArray<AActor*> Result;
	for (AActor* Actor : Spawned)
	{
		Result.Add(Actor);
	}

	return Result;
}

int32 ADojoM4Scatter::GetSkipped() const
{
	return Skipped;
}
