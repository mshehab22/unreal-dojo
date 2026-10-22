#include "DojoF5Follower.h"

#include "Components/SceneComponent.h"

ADojoF5Follower::ADojoF5Follower()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.bStartWithTickEnabled = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoF5Follower::Follow(AActor* NewTarget)
{
	Target = NewTarget;
	SetActorTickEnabled(Target.IsValid());
}

AActor* ADojoF5Follower::GetTarget() const
{
	return Target.Get();
}

bool ADojoF5Follower::HasArrived() const
{
	return Target.IsValid() && FVector::Dist(GetActorLocation(), Target->GetActorLocation()) <= StopDistance + KINDA_SMALL_NUMBER;
}

void ADojoF5Follower::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!Target.IsValid())
	{
		SetActorTickEnabled(false);
		return;
	}

	const FVector Offset = Target->GetActorLocation() - GetActorLocation();
	const double Gap = Offset.Size() - StopDistance;
	if (Gap <= 0.0) return;

	const double Step = FMath::Min(static_cast<double>(Speed) * DeltaSeconds, Gap);
	SetActorLocation(GetActorLocation() + Offset.GetSafeNormal() * Step);
}
