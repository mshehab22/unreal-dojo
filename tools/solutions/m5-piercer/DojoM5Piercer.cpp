#include "DojoM5Piercer.h"

#include "CollisionQueryParams.h"
#include "Components/ArrowComponent.h"
#include "Components/SceneComponent.h"
#include "DrawDebugHelpers.h"
#include "Engine/EngineTypes.h"
#include "Engine/HitResult.h"
#include "Engine/World.h"

ADojoM5Piercer::ADojoM5Piercer()
{
	PrimaryActorTick.bCanEverTick = false;

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Root);
}

void ADojoM5Piercer::Fire()
{
	Pierced.Reset();
	StoppedBy = nullptr;
	ShotLength = Reach;

	const FVector Start = GetActorLocation();
	const FVector End = Start + GetActorForwardVector() * Reach;

	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this);

	// A multi trace lists the things that only overlap the channel, nearest first, and ends with the first thing that blocks it, if any.
	TArray<FHitResult> Hits;
	GetWorld()->LineTraceMultiByChannel(Hits, Start, End, ECC_Visibility, Params);

	for (const FHitResult& Hit : Hits)
	{
		if (Hit.bBlockingHit)
		{
			StoppedBy = Hit.GetActor();
			ShotLength = Hit.Distance;
			break;
		}

		Pierced.Add(Hit.GetActor());
		DrawDebugSphere(GetWorld(), Hit.ImpactPoint, 12.f, 8, FColor::Yellow, false, 1.f);
	}

	DrawDebugLine(GetWorld(), Start, Start + GetActorForwardVector() * ShotLength, FColor::White, false, 1.f);
}

int32 ADojoM5Piercer::GetPiercedCount() const
{
	return Pierced.Num();
}

AActor* ADojoM5Piercer::GetPiercedAt(int32 Index) const
{
	return Pierced.IsValidIndex(Index) ? Pierced[Index].Get() : nullptr;
}

AActor* ADojoM5Piercer::GetStoppedBy() const
{
	return StoppedBy.Get();
}

float ADojoM5Piercer::GetShotLength() const
{
	return ShotLength;
}
