#include "DojoM5Laser.h"

#include "CollisionQueryParams.h"
#include "Components/ArrowComponent.h"
#include "Components/SceneComponent.h"
#include "DrawDebugHelpers.h"
#include "Engine/EngineTypes.h"
#include "Engine/HitResult.h"
#include "Engine/World.h"

ADojoM5Laser::ADojoM5Laser()
{
	PrimaryActorTick.bCanEverTick = false;

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Root);
}

void ADojoM5Laser::Fire()
{
	Path.Reset();
	Bounces = 0;

	FVector Start = GetActorLocation();
	FVector Heading = GetActorForwardVector();
	Path.Add(Start);

	for (int32 Segment = 0; Segment <= MaxBounces; ++Segment)
	{
		const FVector End = Start + Heading * SegmentLength;

		FCollisionQueryParams Params;
		Params.AddIgnoredActor(this);

		FHitResult Hit;
		if (!GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params))
		{
			Path.Add(End);
			break;
		}

		Path.Add(Hit.ImpactPoint);

		const AActor* Struck = Hit.GetActor();
		const bool bMirror = IsValid(Struck) && Struck->ActorHasTag(MirrorTag);
		if (!bMirror || Segment == MaxBounces) break;

		// The new heading is the old one mirrored about the surface's normal, and the next piece starts a hair off the surface so it does not hit it again.
		Heading = FMath::GetReflectionVector(Heading, Hit.ImpactNormal).GetSafeNormal();
		Start = Hit.ImpactPoint + Hit.ImpactNormal * 0.5f;
		++Bounces;
	}

	for (int32 Index = 1; Index < Path.Num(); ++Index)
	{
		DrawDebugLine(GetWorld(), Path[Index - 1], Path[Index], FColor::Red, false, 1.f);
	}
}

int32 ADojoM5Laser::GetPointCount() const
{
	return Path.Num();
}

FVector ADojoM5Laser::GetPoint(int32 Index) const
{
	return Path.IsValidIndex(Index) ? Path[Index] : FVector::ZeroVector;
}

int32 ADojoM5Laser::GetBounceCount() const
{
	return Bounces;
}
