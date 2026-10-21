#include "DojoF2DummySpawner.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"

ADojoF2DummySpawner::ADojoF2DummySpawner()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	DummyClass = ADojoF1TrainingDummy::StaticClass();
}

ADojoF1TrainingDummy* ADojoF2DummySpawner::SpawnDummy()
{
	if (!DummyClass) return nullptr;

	const FVector Location = GetActorLocation() + SpawnSpacing * (SpawnedDummies.Num() + 1);
	ADojoF1TrainingDummy* Dummy = GetWorld()->SpawnActor<ADojoF1TrainingDummy>(DummyClass, Location, GetActorRotation());
	if (!Dummy) return nullptr;

	SpawnedDummies.Add(Dummy);
	return Dummy;
}

int32 ADojoF2DummySpawner::GetSpawnedCount() const
{
	return SpawnedDummies.Num();
}
