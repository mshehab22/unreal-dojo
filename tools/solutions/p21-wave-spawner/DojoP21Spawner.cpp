#include "DojoP21Spawner.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"

ADojoP21Spawner::ADojoP21Spawner()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

ADojoP21Critter* ADojoP21Spawner::Create(const FDojoP21SpawnEntry& Entry, const FTransform& Where)
{
	if (Entry.CritterClass.Get() == nullptr) return nullptr;

	ADojoP21Critter* Critter = GetWorld()->SpawnActorDeferred<ADojoP21Critter>(Entry.CritterClass, Where);
	if (Critter == nullptr) return nullptr;

	Critter->Level = FMath::Max(1, Entry.Level);
	Critter->FinishSpawning(Where);

	SpawnedCount++;
	return Critter;
}

TArray<ADojoP21Critter*> ADojoP21Spawner::SpawnWave()
{
	TArray<ADojoP21Critter*> Made;

	for (const FDojoP21SpawnEntry& Entry : Wave)
	{
		const FVector Place = GetActorLocation() + FVector(Spacing * (Made.Num() + 1), 0.f, 0.f);
		ADojoP21Critter* Critter = Create(Entry, FTransform(Place));

		if (Critter != nullptr)
		{
			Made.Add(Critter);
		}
	}

	return Made;
}
