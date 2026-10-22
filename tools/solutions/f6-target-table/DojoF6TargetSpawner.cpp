#include "DojoF6TargetSpawner.h"

#include "Components/SceneComponent.h"
#include "DojoF6Target.h"
#include "DojoF6TargetRow.h"
#include "Engine/DataTable.h"
#include "Engine/World.h"

DEFINE_LOG_CATEGORY_STATIC(LogDojoF6Spawner, Log, All);

ADojoF6TargetSpawner::ADojoF6TargetSpawner()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

ADojoF6Target* ADojoF6TargetSpawner::SpawnTarget(FName RowName, FVector Location)
{
	if (!IsValid(Table))
	{
		UE_LOG(LogDojoF6Spawner, Warning, TEXT("%s has no target table"), *GetName());
		return nullptr;
	}

	const FDojoF6TargetRow* Row = Table->FindRow<FDojoF6TargetRow>(RowName, TEXT("SpawnTarget"), false);
	if (!Row)
	{
		UE_LOG(LogDojoF6Spawner, Warning, TEXT("%s: the target table has no row named %s"), *GetName(), *RowName.ToString());
		return nullptr;
	}

	ADojoF6Target* Target = GetWorld()->SpawnActor<ADojoF6Target>(Location, FRotator::ZeroRotator);
	if (!Target) return nullptr;

	Target->ApplyRow(RowName, *Row);
	SpawnedCount++;
	return Target;
}

bool ADojoF6TargetSpawner::HasRow(FName RowName) const
{
	return IsValid(Table) && Table->FindRow<FDojoF6TargetRow>(RowName, TEXT("HasRow"), false) != nullptr;
}

int32 ADojoF6TargetSpawner::GetSpawnedCount() const
{
	return SpawnedCount;
}
