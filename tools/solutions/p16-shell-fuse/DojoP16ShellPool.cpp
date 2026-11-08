#include "DojoP16ShellPool.h"

#include "Components/SceneComponent.h"
#include "DojoP16Shell.h"
#include "Engine/World.h"

ADojoP16ShellPool::ADojoP16ShellPool()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	ShellClass = ADojoP16Shell::StaticClass();
}

void ADojoP16ShellPool::BeginPlay()
{
	Super::BeginPlay();

	if (!ShellClass) return;

	for (int32 Index = 0; Index < PoolSize; ++Index)
	{
		ADojoP16Shell* Shell = GetWorld()->SpawnActor<ADojoP16Shell>(ShellClass, GetActorLocation(), GetActorRotation());
		if (!Shell) continue;

		Shell->RestInPool();
		Resting.Add(Shell);
	}
}

void ADojoP16ShellPool::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (ADojoP16Shell* Shell : Resting)
	{
		if (IsValid(Shell)) Shell->Destroy();
	}

	for (ADojoP16Shell* Shell : Lent)
	{
		if (IsValid(Shell)) Shell->Destroy();
	}

	Resting.Empty();
	Lent.Empty();

	Super::EndPlay(EndPlayReason);
}

ADojoP16Shell* ADojoP16ShellPool::Acquire(const FVector& Where)
{
	if (Resting.Num() == 0) return nullptr;

	ADojoP16Shell* Shell = Resting.Pop();
	Lent.Add(Shell);
	Shell->WakeFromPool(Where);
	return Shell;
}

bool ADojoP16ShellPool::Release(ADojoP16Shell* Shell)
{
	if (!Lent.Contains(Shell)) return false;

	Lent.Remove(Shell);
	Shell->RestInPool();
	Resting.Add(Shell);
	return true;
}

int32 ADojoP16ShellPool::GetRestingCount() const
{
	return Resting.Num();
}

int32 ADojoP16ShellPool::GetLentCount() const
{
	return Lent.Num();
}
