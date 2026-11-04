#include "DojoM5Feeler.h"

#include "CollisionQueryParams.h"
#include "CollisionShape.h"
#include "Components/ArrowComponent.h"
#include "Components/SceneComponent.h"
#include "DrawDebugHelpers.h"
#include "Engine/EngineTypes.h"
#include "Engine/HitResult.h"
#include "Engine/World.h"

ADojoM5Feeler::ADojoM5Feeler()
{
	PrimaryActorTick.bCanEverTick = false;

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Root);
}

bool ADojoM5Feeler::Probe()
{
	const FVector Start = GetActorLocation();
	const FVector End = Start + GetActorForwardVector() * TravelDistance;

	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this);

	// A sweep moves a whole shape along the path, so it stops at the first thing the ball itself would touch, not only the thing its centre line meets.
	FHitResult Hit;
	const FCollisionShape Ball = FCollisionShape::MakeSphere(Radius);
	const bool bBlocked = GetWorld()->SweepSingleByChannel(Hit, Start, End, FQuat::Identity, ECC_Visibility, Ball, Params);

	ClearDistance = bBlocked ? Hit.Distance : TravelDistance;
	StopLocation = bBlocked ? FVector(Hit.Location) : End;
	ImpactPoint = bBlocked ? FVector(Hit.ImpactPoint) : End;
	Blocker = bBlocked ? Hit.GetActor() : nullptr;

	DrawDebugSphere(GetWorld(), Start, Radius, 12, FColor::Cyan, false, 1.f);
	DrawDebugSphere(GetWorld(), StopLocation, Radius, 12, bBlocked ? FColor::Red : FColor::Green, false, 1.f);
	DrawDebugLine(GetWorld(), Start, StopLocation, FColor::White, false, 1.f);
	return !bBlocked;
}

float ADojoM5Feeler::GetClearDistance() const
{
	return ClearDistance;
}

FVector ADojoM5Feeler::GetStopLocation() const
{
	return StopLocation;
}

FVector ADojoM5Feeler::GetImpactPoint() const
{
	return ImpactPoint;
}

AActor* ADojoM5Feeler::GetBlocker() const
{
	return Blocker.Get();
}
