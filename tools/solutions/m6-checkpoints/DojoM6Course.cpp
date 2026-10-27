#include "DojoM6Course.h"

#include "Components/SceneComponent.h"
#include "DojoM6Checkpoint.h"

ADojoM6Course::ADojoM6Course()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM6Course::BeginPlay()
{
	Super::BeginPlay();

	BindCheckpoints();
}

void ADojoM6Course::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (ADojoM6Checkpoint* Checkpoint : Checkpoints)
	{
		if (IsValid(Checkpoint)) Checkpoint->OnReached.RemoveAll(this);
	}

	Super::EndPlay(EndPlayReason);
}

void ADojoM6Course::BindCheckpoints()
{
	for (ADojoM6Checkpoint* Checkpoint : Checkpoints)
	{
		if (IsValid(Checkpoint)) Checkpoint->OnReached.AddUniqueDynamic(this, &ADojoM6Course::HandleReached);
	}
}

void ADojoM6Course::HandleReached(ADojoM6Checkpoint* Checkpoint, AActor* Racer)
{
	if (!Checkpoints.IsValidIndex(PassedCount) || Checkpoints[PassedCount] != Checkpoint) return;

	PassedCount++;
	OnPassed.Broadcast(PassedCount);
	if (PassedCount == Checkpoints.Num()) OnFinished.Broadcast();
}

void ADojoM6Course::ResetCourse()
{
	PassedCount = 0;
}

int32 ADojoM6Course::GetPassedCount() const
{
	return PassedCount;
}
